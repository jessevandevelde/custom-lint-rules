import type { TSESLint, TSESTree } from '@typescript-eslint/utils';

type TemplateNode = {
  type?: string;
  name?: string;
  sourceSpan?: {
    start: { offset: number };
    end: { offset: number };
  };
  children?: TemplateNode[];
  branches?: TemplateNode[];
  cases?: TemplateNode[];
  empty?: TemplateNode;
};

type TemplateProgram = TSESTree.Program & {
  templateNodes?: TemplateNode[];
};

type RuleOptions = {
  ignoredElements?: string[];
};

type Options = [RuleOptions?];

const MESSAGE_ID = 'MISSING_PADDING_LINE_BETWEEN_TEMPLATE_NODES';
const NEWLINE = /\r\n|\n|\r/;
const COMMENT = /<!--[\s\S]*?-->/;

function hasPaddingLine(value: string): boolean {
  return /\n[\t ]*\n/.test(value.replace(/\r\n?/g, '\n'));
}

function isWhitespaceText(node: TemplateNode): boolean {
  return node.type === 'Text';
}

function isIgnoredElement(
  node: TemplateNode,
  ignoredElements: ReadonlySet<string>,
): boolean {
  return node.type === 'Element' && !!node.name && ignoredElements.has(node.name);
}

function isLetFollowedByLet(
  current: TemplateNode,
  next: TemplateNode,
): boolean {
  return current.type === 'LetDeclaration' && next.type === 'LetDeclaration';
}

function nodeStart(node: TemplateNode): number | undefined {
  return node.sourceSpan?.start.offset;
}

function nodeEnd(node: TemplateNode): number | undefined {
  return node.sourceSpan?.end.offset;
}

/**
 * Finds the start of the trailing whitespace before the next node.
 *
 * Some Angular parser versions place an @let node's end offset immediately
 * before its semicolon. Replacing the complete gap would then remove that
 * semicolon. Limiting the replacement to trailing whitespace preserves every
 * non-whitespace character regardless of parser span behaviour.
 */
export function trailingWhitespaceStart(
  source: string,
  start: number,
  end: number,
): number {
  const trailingWhitespace = source.slice(start, end).match(/[\t \r\n]*$/)?.[0];
  return end - (trailingWhitespace?.length ?? 0);
}

function newlineFor(source: string): string {
  const firstNewline = source.match(NEWLINE)?.[0];
  return firstNewline === '\r\n' ? '\r\n' : firstNewline ?? '\n';
}

function indentationBefore(source: string, offset: number): string {
  const lineStart = Math.max(
    source.lastIndexOf('\n', offset - 1),
    source.lastIndexOf('\r', offset - 1),
  ) + 1;
  const indentation = source.slice(lineStart, offset);

  return /^[\t ]*$/.test(indentation) ? indentation : '';
}

const rule: TSESLint.RuleModule<typeof MESSAGE_ID, Options> = {
  meta: {
    type: 'layout',
    docs: {
      description:
        'Require at least one empty line between sibling Angular template nodes.',
    },
    fixable: 'whitespace',
    schema: [
      {
        type: 'object',
        properties: {
          ignoredElements: {
            type: 'array',
            items: { type: 'string' },
            uniqueItems: true,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      [MESSAGE_ID]: 'Expected a padding line between template nodes.',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode;
    const options = (context.options[0] ?? {}) as RuleOptions;
    const ignoredElements = new Set(options.ignoredElements ?? []);

    function checkSiblings(nodes: TemplateNode[]): void {
      const significantNodes = nodes.filter((node) => !isWhitespaceText(node));

      for (let index = 0; index < significantNodes.length - 1; index += 1) {
        const current = significantNodes[index];
        const next = significantNodes[index + 1];
        const start = nodeEnd(current);
        const end = nodeStart(next);

        if (start === undefined || end === undefined || end < start) {
          continue;
        }

        const between = sourceCode.text.slice(start, end);

        if (
          hasPaddingLine(between) ||
          COMMENT.test(between) ||
          isLetFollowedByLet(current, next) ||
          isIgnoredElement(current, ignoredElements) ||
          isIgnoredElement(next, ignoredElements)
        ) {
          continue;
        }

        const fixStart = trailingWhitespaceStart(sourceCode.text, start, end);

        context.report({
          loc: {
            start: sourceCode.getLocFromIndex(fixStart),
            end: sourceCode.getLocFromIndex(end),
          },
          messageId: MESSAGE_ID,
          fix(fixer) {
            const newline = newlineFor(sourceCode.text);
            const indentation = indentationBefore(sourceCode.text, end);
            return fixer.replaceTextRange(
              [fixStart, end],
              `${newline}${newline}${indentation}`,
            );
          },
        });
      }
    }

    function visitNode(node: TemplateNode): void {
      if (node.children) {
        checkSiblings(node.children);
        node.children.forEach(visitNode);
      }

      // Branches and switch cases are alternatives rather than siblings.
      // Their own child arrays still need to be checked independently.
      node.branches?.forEach(visitNode);
      node.cases?.forEach(visitNode);

      if (node.empty) {
        visitNode(node.empty);
      }
    }

    return {
      'Program:exit'(program) {
        const templateProgram = program as TemplateProgram;
        const rootNodes = templateProgram.templateNodes ?? [];

        checkSiblings(rootNodes);
        rootNodes.forEach(visitNode);
      },
    };
  },
};

export default rule;

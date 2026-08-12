import type { TSESLint, TSESTree } from '@typescript-eslint/utils';

type SourceSpan = {
  start: { offset: number };
  end: { offset: number };
};

type TemplateNode = {
  type?: string;
  name?: string;
  sourceSpan?: SourceSpan;
  startSourceSpan?: SourceSpan;
  endSourceSpan?: SourceSpan;
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

const MESSAGE_ID = 'UNNECESSARY_NEWLINE';
const NEWLINE = /\r\n|\n|\r/;

function isWhitespaceText(node: TemplateNode): boolean {
  return node.type === 'Text';
}

function isIgnoredElement(
  node: TemplateNode,
  ignoredElements: ReadonlySet<string>,
): boolean {
  return node.type === 'Element' && !!node.name && ignoredElements.has(node.name);
}

function newlineFor(source: string): string {
  const firstNewline = source.match(NEWLINE)?.[0];
  return firstNewline === '\r\n' ? '\r\n' : firstNewline ?? '\n';
}

function hasTooManyNewlines(value: string, maximum: number): boolean {
  if (!/^[\t \r\n]*$/.test(value)) {
    return false;
  }

  const normalized = value.replace(/\r\n?|\n/g, '\n');
  return normalized.split('\n').length - 1 > maximum;
}

function indentationAtEnd(value: string): string {
  return value.match(/[\t ]*$/)?.[0] ?? '';
}

const rule: TSESLint.RuleModule<typeof MESSAGE_ID, Options> = {
  meta: {
    type: 'layout',
    docs: {
      description: 'Remove unnecessary whitespace between template nodes.',
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
      [MESSAGE_ID]: 'Unnecessary newline.',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode;
    const options = (context.options[0] ?? {}) as RuleOptions;
    const ignoredElements = new Set(options.ignoredElements ?? []);

    function reportWhitespace(start: number, end: number, maximum: number): void {
      if (end < start) {
        return;
      }

      const whitespace = sourceCode.text.slice(start, end);
      if (!hasTooManyNewlines(whitespace, maximum)) {
        return;
      }

      context.report({
        loc: {
          start: sourceCode.getLocFromIndex(start),
          end: sourceCode.getLocFromIndex(end),
        },
        messageId: MESSAGE_ID,
        fix(fixer) {
          const newline = newlineFor(whitespace || sourceCode.text);
          const indentation = indentationAtEnd(whitespace);
          return fixer.replaceTextRange(
            [start, end],
            `${newline.repeat(maximum)}${indentation}`,
          );
        },
      });
    }

    function significantNodes(nodes: TemplateNode[]): TemplateNode[] {
      return nodes.filter((node) => !isWhitespaceText(node));
    }

    function checkSiblings(nodes: TemplateNode[]): void {
      const siblings = significantNodes(nodes);

      for (let index = 0; index < siblings.length - 1; index += 1) {
        const current = siblings[index];
        const next = siblings[index + 1];

        if (
          !current.sourceSpan ||
          !next.sourceSpan ||
          isIgnoredElement(current, ignoredElements) ||
          isIgnoredElement(next, ignoredElements)
        ) {
          continue;
        }

        reportWhitespace(
          current.sourceSpan.end.offset,
          next.sourceSpan.start.offset,
          2,
        );
      }
    }

    function checkElementEdges(node: TemplateNode): void {
      if (
        node.type !== 'Element' ||
        !node.startSourceSpan ||
        !node.endSourceSpan ||
        isIgnoredElement(node, ignoredElements)
      ) {
        return;
      }

      const children = significantNodes(node.children ?? []);
      if (children.length === 0) {
        return;
      }

      const first = children[0];
      const last = children.at(-1);

      if (first.sourceSpan && !isIgnoredElement(first, ignoredElements)) {
        reportWhitespace(
          node.startSourceSpan.end.offset,
          first.sourceSpan.start.offset,
          1,
        );
      }

      if (last?.sourceSpan && !isIgnoredElement(last, ignoredElements)) {
        reportWhitespace(
          last.sourceSpan.end.offset,
          node.endSourceSpan.start.offset,
          1,
        );
      }
    }

    function visitNode(node: TemplateNode): void {
      checkElementEdges(node);

      if (node.children) {
        checkSiblings(node.children);
        node.children.forEach(visitNode);
      }

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

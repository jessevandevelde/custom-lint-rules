import { TSESLint, TSESTree } from "@typescript-eslint/utils";

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
  templatenodes?: TemplateNode[];
}
type RuleOptions = { 
  ignoredElements?: string[];
}

type Options = [RuleOptions];

const MESSAGE_ID = 'TO_MANY_PADDING_LINES_BETWEEN_NODES'
const NEWLINE = /\r|\n\r/;

function isIngoredElement(
  node: TemplateNode,
  ignoredElements: ReadonlySet<string>,
): boolean {
  return node.type === 'Element' && !!node.name && ignoredElements.has(node.name);
}

const rule : TSESLint.RuleModule<typeof MESSAGE_ID, Options> = {
  meta: {
    type: 'layout',
    docs: {
      description:
      'Remove unnecessary whitespace between template nodes.'
    },
    fixable: 'whitespace',
    schema: [
      {
        type: 'object',
        properties: {
          ignoredElements: {
            type: 'array',
            items: { type: 'string'},
            uniqueItems: true,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      [MESSAGE_ID]: 'Too much whitespace!'
    },
  },

  create(context) {
    const sourceCode = context.sourceCode;
    const options = (context.options[0] ?? {}) as RuleOptions;
    const ignoredElements = new Set(options.ignoredElements ?? []);

    return { 
      'Program:exit'(program) {
        const templateProgram = program as TemplateProgram;
      }
    }
  },
};

export default rule;

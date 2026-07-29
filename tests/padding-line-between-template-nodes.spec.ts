import { RuleTester } from '@angular-eslint/test-utils';
import * as templateParser from '@angular-eslint/template-parser';

import rule from '../src/rules/padding-line-between-template-nodes.js';

const MESSAGE_ID = 'MISSING_PADDING_LINE_BETWEEN_TEMPLATE_NODES' as const;
const error = { messageId: MESSAGE_ID };
const errors = (count = 1) => Array.from({ length: count }, () => error);

const ruleTester = new RuleTester({
  languageOptions: {
    parser: templateParser,
  },
});

/**
 * A "padding line" is one completely empty line between sibling template
 * nodes. Therefore `\n\n` is valid, while a space, `\n`, or `\n  ` is not.
 * Existing indentation belongs to the following node and must survive a fix.
 */
ruleTester.run('padding-line-between-template-nodes', rule, {
  valid: [
    { name: 'empty template', code: '' },
    { name: 'single root node', code: '<div></div>' },
    { name: 'single child', code: '<div>\n  <span></span>\n</div>' },

    {
      name: 'one blank line between root elements',
      code: '<app-header></app-header>\n\n<main></main>',
    },
    {
      name: 'one blank line between indented children',
      code: '<div>\n  <span>one</span>\n\n  <span>two</span>\n</div>',
    },
    {
      name: 'CRLF blank line',
      code: '<div>\r\n  <span>one</span>\r\n\r\n  <span>two</span>\r\n</div>',
    },
    {
      name: 'more than one blank line is allowed',
      code: '<span>one</span>\n\n\n\n<span>two</span>',
    },
    {
      name: 'blank line may contain indentation whitespace',
      code: '<div>\n  <span>one</span>\n  \n  <span>two</span>\n</div>',
    },
    {
      name: 'nested sibling groups are padded',
      code: [
        '<main>',
        '  <section>',
        '    <span>one</span>',
        '',
        '    <span>two</span>',
        '  </section>',
        '',
        '  <footer>end</footer>',
        '</main>',
      ].join('\n'),
    },
    {
      name: 'if block children',
      code: '@if (foo) {\n  <div>one</div>\n\n  <div>two</div>\n}',
    },
    {
      name: 'if and else block children',
      code: [
        '@if (foo) {',
        '  <div>one</div>',
        '',
        '  <div>two</div>',
        '} @else {',
        '  <div>three</div>',
        '',
        '  <div>four</div>',
        '}',
      ].join('\n'),
    },
    {
      name: 'for block children',
      code: '@for (item of items; track item.id) {\n  <span>{{ item.name }}</span>\n\n  <button>Open</button>\n}',
    },
    {
      name: 'switch case children',
      code: '@switch (state) {\n  @case ("ready") {\n    <span>Ready</span>\n\n    <button>Go</button>\n  }\n}',
    },
    {
      name: 'successive let declarations are deliberately ignored',
      code: '@let foo = 1;\n@let fooButIm2 = 2;',
    },
    {
      name: 'successive indented let declarations are ignored',
      code: '<div>\n  @let foo = 1;\n  @let bar = 2;\n</div>',
    },
    {
      name: 'a comment separates nodes without a report',
      code: '<span>one</span>\n<!-- why this exists -->\n<span>two</span>',
    },
    {
      name: 'no padding is required after the last child',
      code: '<div>\n  <span>last</span>\n</div>',
    },
    {
      name: 'configured ignored element is skipped',
      code: '<div>\n  <span>one</span>\n  <app-divider></app-divider>\n  <span>two</span>\n</div>',
      options: [{ ignoredElements: ['app-divider'] }],
    },
  ],

  invalid: [
    {
      name: 'adjacent root elements on one line',
      code: '<span>one</span><span>two</span>',
      output: '<span>one</span>\n\n<span>two</span>',
      errors: errors(),
    },
    {
      name: 'a regular space is not a padding line',
      code: '<span>one</span> <span>two</span>',
      output: '<span>one</span>\n\n<span>two</span>',
      errors: errors(),
    },
    {
      name: 'a tab is not a padding line',
      code: '<span>one</span>\t<span>two</span>',
      output: '<span>one</span>\n\n<span>two</span>',
      errors: errors(),
    },
    {
      name: 'one newline is not a blank line',
      code: '<span>one</span>\n<span>two</span>',
      output: '<span>one</span>\n\n<span>two</span>',
      errors: errors(),
    },
    {
      name: 'one CRLF is not a blank line and keeps CRLF style',
      code: '<span>one</span>\r\n<span>two</span>',
      output: '<span>one</span>\r\n\r\n<span>two</span>',
      errors: errors(),
    },
    {
      name: 'fix preserves two-space indentation',
      code: '<div>\n  <span>one</span>\n  <span>two</span>\n</div>',
      output: '<div>\n  <span>one</span>\n\n  <span>two</span>\n</div>',
      errors: errors(),
    },
    {
      name: 'fix preserves tab indentation',
      code: '<div>\n\t<span>one</span>\n\t<span>two</span>\n</div>',
      output: '<div>\n\t<span>one</span>\n\n\t<span>two</span>\n</div>',
      errors: errors(),
    },
    {
      name: 'fix removes trailing spaces before inserting padding line',
      code: '<div>\n  <span>one</span>   \n  <span>two</span>\n</div>',
      output: '<div>\n  <span>one</span>\n\n  <span>two</span>\n</div>',
      errors: errors(),
    },
    {
      name: 'three siblings produce two reports and two fixes',
      code: '<a>one</a>\n<b>two</b>\n<i>three</i>',
      output: '<a>one</a>\n\n<b>two</b>\n\n<i>three</i>',
      errors: errors(2),
    },
    {
      name: 'only the missing boundary is fixed',
      code: '<a>one</a>\n\n<b>two</b>\n<i>three</i>',
      output: '<a>one</a>\n\n<b>two</b>\n\n<i>three</i>',
      errors: errors(),
    },
    {
      name: 'violations at two nesting levels',
      code: '<main>\n  <section>\n    <b>one</b>\n    <i>two</i>\n  </section>\n  <footer>end</footer>\n</main>',
      output: '<main>\n  <section>\n    <b>one</b>\n\n    <i>two</i>\n  </section>\n\n  <footer>end</footer>\n</main>',
      errors: errors(2),
    },
    {
      name: 'missing padding inside if block',
      code: '@if (foo) {\n  <div>one</div>\n  <div>two</div>\n}',
      output: '@if (foo) {\n  <div>one</div>\n\n  <div>two</div>\n}',
      errors: errors(),
    },
    {
      name: 'missing padding inside else block',
      code: '@if (foo) {\n  <div>one</div>\n} @else {\n  <div>two</div>\n  <div>three</div>\n}',
      output: '@if (foo) {\n  <div>one</div>\n} @else {\n  <div>two</div>\n\n  <div>three</div>\n}',
      errors: errors(),
    },
    {
      name: 'missing padding inside for block',
      code: '@for (item of items; track item.id) {\n  <span>{{ item.name }}</span>\n  <button>Open</button>\n}',
      output: '@for (item of items; track item.id) {\n  <span>{{ item.name }}</span>\n\n  <button>Open</button>\n}',
      errors: errors(),
    },
    {
      name: 'let followed by an element is still checked',
      code: '<div>\n  @let foo = 1;\n  <span>{{ foo }}</span>\n</div>',
      output: '<div>\n  @let foo = 1;\n\n  <span>{{ foo }}</span>\n</div>',
      errors: errors(),
    },
    {
      name: 'autofix preserves semicolon between track let and element',
      code: '@let _track = track();\n<div class="search-result">\n\n</div>',
      output:
        '@let _track = track();\n\n<div class="search-result">\n\n</div>',
      errors: errors(),
    },
    {
      name: 'element followed by let is still checked',
      code: '<div>\n  <span>one</span>\n  @let foo = 1;\n</div>',
      output: '<div>\n  <span>one</span>\n\n  @let foo = 1;\n</div>',
      errors: errors(),
    },
    {
      name: 'self-closing Angular components',
      code: '<div>\n  <app-card />\n  <app-actions />\n</div>',
      output: '<div>\n  <app-card />\n\n  <app-actions />\n</div>',
      errors: errors(),
    },
    {
      name: 'ng-container children',
      code: '<ng-container>\n  <span>one</span>\n  <span>two</span>\n</ng-container>',
      output: '<ng-container>\n  <span>one</span>\n\n  <span>two</span>\n</ng-container>',
      errors: errors(),
    },
    {
      name: 'ng-template children',
      code: '<ng-template #content>\n  <span>one</span>\n  <span>two</span>\n</ng-template>',
      output: '<ng-template #content>\n  <span>one</span>\n\n  <span>two</span>\n</ng-template>',
      errors: errors(),
    },
  ],
});

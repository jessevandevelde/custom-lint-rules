import { RuleTester } from '@angular-eslint/test-utils';
import * as templateParser from '@angular-eslint/template-parser';

import rule from '../src/rules/no-unnecessary-newlines.js';

const MESSAGE_ID = 'UNNECESSARY_NEWLINE' as const;
const error = { messageId: MESSAGE_ID };
const errors = (count = 1) => Array.from({ length: count }, () => error);

const ruleTester = new RuleTester({
  languageOptions: { parser: templateParser },
});

/**
 * A line break at an element edge is normal formatting. A blank line at an
 * edge is unnecessary. One blank line between siblings is allowed.
 */
ruleTester.run('no-unnecessary-newlines', rule, {
  valid: [
    { name: 'empty template', code: '' },
    { name: 'empty element', code: '<div></div>' },
    { name: 'inline child', code: '<div><span></span></div>' },
    {
      name: 'one child with no blank edge lines',
      code: '<div>\n  <span></span>\n</div>',
    },
    {
      name: 'one blank line between siblings',
      code: '<div>\n  <span></span>\n\n  <button></button>\n</div>',
    },
    {
      name: 'nested elements have no blank edge lines',
      code: [
        '<main>',
        '  <section>',
        '    <span></span>',
        '',
        '    <button></button>',
        '  </section>',
        '</main>',
      ].join('\n'),
    },
    {
      name: 'CRLF formatting',
      code: '<div>\r\n  <span></span>\r\n\r\n  <button></button>\r\n</div>',
    },
    {
      name: 'text content is unchanged',
      code: '<p>Hello\n\nworld</p>',
    },
  ],

  invalid: [
    {
      name: 'blank line directly after opening tag',
      code: '<div>\n\n  <span></span>\n</div>',
      output: '<div>\n  <span></span>\n</div>',
      errors: errors(),
    },
    {
      name: 'blank line directly before closing tag',
      code: '<div>\n  <span></span>\n\n</div>',
      output: '<div>\n  <span></span>\n</div>',
      errors: errors(),
    },
    {
      name: 'blank lines at both edges',
      code: '<div>\n\n  <span></span>\n\n</div>',
      output: '<div>\n  <span></span>\n</div>',
      errors: errors(2),
    },
    {
      name: 'valid sibling padding with invalid edge padding',
      code: '<div>\n\n  <div></div>\n\n  <div></div>\n\n</div>',
      output: '<div>\n  <div></div>\n\n  <div></div>\n</div>',
      errors: errors(2),
    },
    {
      name: 'more than one blank line between siblings',
      code: '<div>\n  <span></span>\n\n\n  <button></button>\n</div>',
      output: '<div>\n  <span></span>\n\n  <button></button>\n</div>',
      errors: errors(),
    },
    {
      name: 'nested violation',
      code: '<main>\n  <section>\n\n    <span></span>\n  </section>\n</main>',
      output: '<main>\n  <section>\n    <span></span>\n  </section>\n</main>',
      errors: errors(),
    },
    {
      name: 'CRLF blank edge lines preserve line endings',
      code: '<div>\r\n\r\n  <span></span>\r\n\r\n</div>',
      output: '<div>\r\n  <span></span>\r\n</div>',
      errors: errors(2),
    },
  ],
});

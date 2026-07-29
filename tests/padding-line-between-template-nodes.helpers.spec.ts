import { describe, expect, it } from 'vitest';

import { trailingWhitespaceStart } from '../src/rules/padding-line-between-template-nodes.js';

describe('trailingWhitespaceStart', () => {
  it('preserves an @let semicolon that falls outside the parser source span', () => {
    const source = '@let value = getValue();\n<div>{{ value }}</div>';
    const parserEndBeforeSemicolon = source.indexOf(';');
    const nextNodeStart = source.indexOf('<div>');

    expect(
      trailingWhitespaceStart(
        source,
        parserEndBeforeSemicolon,
        nextNodeStart,
      ),
    ).toBe(parserEndBeforeSemicolon + 1);
  });
});

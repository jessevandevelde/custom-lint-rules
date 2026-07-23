# Angular ESLint padding line between template nodes

A custom Angular ESLint template rule that requires at least one empty line
between sibling template nodes.

## Features

- Reports sibling template nodes without a padding line.
- Automatically inserts a padding line while preserving indentation.
- Supports LF and CRLF line endings.
- Supports Angular control-flow blocks such as `@if`, `@else`, `@for`, and
  `@switch`.
- Ignores consecutive `@let` declarations and boundaries containing comments.
- Supports an `ignoredElements` option.

## Install dependencies

```bash
npm install
```

## Run tests

```bash
npm test
```

Run the TypeScript check separately with:

```bash
npm run typecheck
```

The test suite contains 37 cases covering valid templates, invalid templates,
autofixes, indentation, line endings, comments, ignored elements, nested
elements, and Angular control flow.

## Rule option

Elements can be excluded by name:

```json
{
  "ignoredElements": ["app-divider"]
}
```

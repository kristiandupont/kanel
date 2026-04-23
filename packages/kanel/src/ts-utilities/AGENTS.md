# ts-utilities

Low-level TypeScript code generation utilities, independent of PostgreSQL concerns.

**AST:** `ts-declaration-types.ts` defines the declaration node types (interfaces, type aliases, enums, const declarations). `TypeDefinition.ts` and `TypeImport.ts` are the building blocks for type references and imports.

**Rendering:** `renderTsFile.ts` converts a list of `TsDeclaration` nodes to source text. `ImportGenerator.ts` accumulates and deduplicates import statements across a file.

**Escape helpers:** `escapeIdentifier.ts` (reserved keywords), `escapeFieldName.ts` (object keys), `escapeString.ts` (string literals), `escapeComment.ts` (JSDoc content).

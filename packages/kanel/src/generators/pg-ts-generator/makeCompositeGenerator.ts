import type { Kind, Schema, TableColumn } from "extract-pg-schema";
import assert from "node:assert";

import type {
  Declaration,
  InterfaceDeclaration,
} from "../../declaration-types";
import type { Path } from "../../Output";
import type Output from "../../Output";
import type { CompositeDetails } from "./composite-types";
import generateProperties from "./generateProperties";
import resolveType from "./resolveType";

const mapper = (
  details: CompositeDetails,
): { path: Path; declaration: Declaration }[] => {
  const declarations: Declaration[] = [];
  const {
    name: selectorName,
    comment: selectorComment,
    path,
  } = config.getMetadata(details, "selector");

  if (
    (details.kind === "table" || details.kind === "foreignTable") &&
    config.generateIdentifierType
  ) {
    const { columns } = details;
    const { path } = config.getMetadata(details, "selector");
    const identifierColumns = columns.filter((c) => c.isPrimaryKey);

    identifierColumns
      .filter((c) => {
        if (!(c as TableColumn).references?.length) return true;
        const type = resolveType(c, details);
        if (typeof type === "string") {
          return true;
        }
        // Unresolved circular reference, we should still generate the identifier type
        return type.typeImports.some((i) => i.path === path);
      })
      .forEach((c) =>
        declarations.push(config.generateIdentifierType(c, details)),
      );
  }

  const selectorProperties = generateProperties(details, "selector");

  const selectorDeclaration: InterfaceDeclaration = {
    declarationType: "interface",
    name: selectorName,
    comment: selectorComment,
    exportAs: "default",
    properties: selectorProperties,
  };
  declarations.push(selectorDeclaration);

  if (details.kind === "table") {
    const { name: initializerName, comment: initializerComment } =
      config.getMetadata(details, "initializer");
    const initializerProperties = generateProperties(details, "initializer");

    const initializerDeclaration: InterfaceDeclaration = {
      declarationType: "interface",
      name: initializerName,
      comment: initializerComment,
      exportAs: "named",
      properties: initializerProperties,
    };
    declarations.push(initializerDeclaration);

    const { name: mutatorName, comment: mutatorComment } = config.getMetadata(
      details,
      "mutator",
    );
    const mutatorProperties = generateProperties(details, "mutator");

    const mutatorDeclaration: InterfaceDeclaration = {
      declarationType: "interface",
      name: mutatorName,
      comment: mutatorComment,
      exportAs: "named",
      properties: mutatorProperties,
    };
    declarations.push(mutatorDeclaration);
  }

  return declarations.map((declaration) => ({ path, declaration }));
};

// "Composite" in this case means tables, views, materialized views and composite types.
// I.e. anything that has "properties" and will be turned into an interface in Typescript.
const makeCompositeGenerator =
  (kind: Kind) =>
  (schema: Schema, outputAcc: Output): Output => {
    const declarations: { path: string; declaration: Declaration }[] =
      (schema[`${kind}s`] as CompositeDetails[])?.map(mapper).flat() ?? [];
    return declarations.reduce((acc, { path, declaration }) => {
      const existing = acc[path];
      // existing must be a TypescriptFileContents
      assert(existing.filetype === "typescript");

      if (existing) {
        existing.declarations.push(declaration);
      } else {
        acc[path] = {
          filetype: "typescript",
          declarations: [declaration],
        };
      }
      return acc;
    }, outputAcc);
  };

export default makeCompositeGenerator;

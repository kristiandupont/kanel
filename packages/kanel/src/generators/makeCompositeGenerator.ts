import type { Kind, Schema, TableColumn } from "extract-pg-schema";
import { tryParse } from "tagged-comment-parser";

import { useKanelContext } from "../context";
import type { Declaration, InterfaceDeclaration } from "../declaration-types";
import type { Path } from "../Output";
import type Output from "../Output";
import type { CompositeDetails } from "./composite-types";
import generateProperties from "./generateProperties";
import resolveType from "./resolveType";

const makeMapper =
  <D extends CompositeDetails>() =>
  (details: D): { path: Path; declaration: Declaration }[] => {
    const { instantiatedConfig } = useKanelContext();

    if (details.kind === "compositeType") {
      // If a composite type has a @type tag in the comment,
      // we will use that type instead of a generated one.
      const { tags } = tryParse(details.comment);
      if (tags?.type) {
        return [];
      }
    }

    const declarations: Declaration[] = [];
    const {
      name: selectorName,
      comment: selectorComment,
      path,
    } = instantiatedConfig.getMetadata(details, "selector", instantiatedConfig);

    if (
      (details.kind === "table" || details.kind === "foreignTable") &&
      instantiatedConfig.generateIdentifierType
    ) {
      const { columns } = details;
      const { path } = instantiatedConfig.getMetadata(
        details,
        "selector",
        instantiatedConfig,
      );
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
          declarations.push(
            instantiatedConfig.generateIdentifierType(
              c,
              details,
              instantiatedConfig,
            ),
          ),
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
        instantiatedConfig.getMetadata(
          details,
          "initializer",
          instantiatedConfig,
        );
      const initializerProperties = generateProperties(details, "initializer");

      const initializerDeclaration: InterfaceDeclaration = {
        declarationType: "interface",
        name: initializerName,
        comment: initializerComment,
        exportAs: "named",
        properties: initializerProperties,
      };
      declarations.push(initializerDeclaration);

      const { name: mutatorName, comment: mutatorComment } =
        instantiatedConfig.getMetadata(details, "mutator", instantiatedConfig);
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
    const mapper = makeMapper();
    const declarations: { path: string; declaration: Declaration }[] =
      (schema[`${kind}s`] as CompositeDetails[])?.map(mapper).flat() ?? [];
    return declarations.reduce((acc, { path, declaration }) => {
      const existing = acc[path];
      if (existing) {
        existing.declarations.push(declaration);
      } else {
        acc[path] = {
          declarations: [declaration],
        };
      }
      return acc;
    }, outputAcc);
  };

export default makeCompositeGenerator;

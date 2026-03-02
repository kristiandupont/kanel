import type { Kind, Schema, TableColumn } from "extract-pg-schema";

import { usePgTsGeneratorContext } from "./pgTsGeneratorContext";
import {
  type TsDeclaration,
  type InterfaceDeclaration,
  registerTsDeclaration,
} from "../ts-utilities/ts-declaration-types";
import type { Path } from "../Output";
import type Output from "../Output";
import type { CompositeDetails } from "./composite-types";
import generateProperties from "./generateProperties";
import resolveType from "./resolveType";

const makeMapper =
  <D extends CompositeDetails>() =>
  (details: D): { path: Path; declaration: TsDeclaration }[] => {
    const generatorContext = usePgTsGeneratorContext();

    const declarations: TsDeclaration[] = [];
    const {
      name: selectorName,
      comment: selectorComment,
      path,
      exportAs: selectorExportAs,
    } = generatorContext.getMetadata(details, "selector");

    if (
      (details.kind === "table" || details.kind === "foreignTable") &&
      generatorContext.generateIdentifierType
    ) {
      const { columns } = details;
      const { path } = generatorContext.getMetadata(details, "selector");
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
            generatorContext.generateIdentifierType(c, details),
          ),
        );
    }

    const selectorProperties = generateProperties(details, "selector");

    const selectorDeclaration: InterfaceDeclaration = {
      declarationType: "interface",
      name: selectorName,
      comment: selectorComment,
      exportAs: selectorExportAs ?? "default",
      properties: selectorProperties,
    };
    declarations.push(selectorDeclaration);

    if (details.kind === "table") {
      const {
        name: initializerName,
        comment: initializerComment,
        exportAs: initializerExportAs,
      } = generatorContext.getMetadata(details, "initializer");
      const initializerProperties = generateProperties(details, "initializer");

      const initializerDeclaration: InterfaceDeclaration = {
        declarationType: "interface",
        name: initializerName,
        comment: initializerComment,
        exportAs: initializerExportAs ?? "named",
        properties: initializerProperties,
      };
      declarations.push(initializerDeclaration);

      const {
        name: mutatorName,
        comment: mutatorComment,
        exportAs: mutatorExportAs,
      } = generatorContext.getMetadata(details, "mutator");
      const mutatorProperties = generateProperties(details, "mutator");

      const mutatorDeclaration: InterfaceDeclaration = {
        declarationType: "interface",
        name: mutatorName,
        comment: mutatorComment,
        exportAs: mutatorExportAs ?? "named",
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
    const declarations: { path: string; declaration: TsDeclaration }[] =
      (schema[`${kind}s`] as CompositeDetails[])?.map(mapper).flat() ?? [];
    return declarations.reduce(
      (acc, { path, declaration }) =>
        registerTsDeclaration(acc, path, declaration),
      outputAcc,
    );
  };

export default makeCompositeGenerator;

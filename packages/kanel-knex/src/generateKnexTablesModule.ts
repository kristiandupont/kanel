import type {
  Details,
  GenericDeclaration,
  PreRenderHookV4,
  TypeImport,
  TypeMetadataV4,
} from "kanel";
import { useKanelContext, usePgTsGeneratorContext } from "kanel";
import { join } from "path";

function getAsName(typeMetadata: TypeMetadataV4, schemaName: string) {
  return schemaName === "public"
    ? undefined
    : `${schemaName}_${typeMetadata.name}`;
}

const getTypeImports = (details: Details): TypeImport[] => {
  const { getMetadata } = usePgTsGeneratorContext();

  const selector = getMetadata(details, "selector");
  const result: TypeImport[] = [
    {
      name: selector.name,
      asName: getAsName(selector, details.schemaName),
      isDefault: true,
      path: selector.path,
      isAbsolute: false,
      importAsType: true,
    },
  ];

  const isReadonly = details.kind !== "table";
  if (!isReadonly) {
    const initializer = getMetadata(details, "initializer");
    result.push({
      name: initializer.name,
      asName: getAsName(initializer, details.schemaName),
      isDefault: false,
      path: initializer.path,
      isAbsolute: false,
      importAsType: true,
    });

    const mutator = getMetadata(details, "mutator");
    result.push({
      name: mutator.name,
      asName: getAsName(mutator, details.schemaName),
      isDefault: false,
      path: mutator.path,
      isAbsolute: false,
      importAsType: true,
    });
  }

  return result;
};

const getLine = (details: Details): string => {
  const { getMetadata } = usePgTsGeneratorContext();

  const selector = getMetadata(details, "selector");
  const selectorName = getAsName(selector, details.schemaName) ?? selector.name;

  let initializerName = "never";
  let mutatorName = "never";

  const isReadonly = details.kind !== "table";
  if (!isReadonly) {
    const initializer = getMetadata(details, "initializer");
    initializerName =
      getAsName(initializer, details.schemaName) ?? initializer.name;

    const mutator = getMetadata(details, "mutator");
    mutatorName = getAsName(mutator, details.schemaName) ?? mutator.name;
  }

  const name =
    details.schemaName === "public"
      ? details.name
      : `${details.schemaName}.${details.name}`;
  return `    '${name}': Knex.CompositeTableType<${selectorName}, ${initializerName}, ${mutatorName}>;`;
};

const generateKnexTablesModule: PreRenderHookV4 = async (outputAcc) => {
  const { schemas, config } = useKanelContext();

  const typeImports = Object.values(schemas).reduce(
    (acc, schema) => {
      const tableTypeImports = schema.tables
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((table) => getTypeImports(table));
      const viewTypeImports = schema.views
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((view) => getTypeImports(view));
      const materializedViewTypeImports = schema.materializedViews
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((materializedView) => getTypeImports(materializedView));

      return [
        ...acc,
        ...tableTypeImports.flat(),
        ...viewTypeImports.flat(),
        ...materializedViewTypeImports.flat(),
      ];
    },
    [
      {
        name: "Knex",
        isAbsolute: true,
        path: "knex",
        isDefault: false,
        importAsType: false,
      },
    ] as TypeImport[],
  );

  const declarationLines = Object.values(schemas).reduce(
    (acc, schema) => {
      const tableLines = schema.tables.map((table) => getLine(table));
      const viewLines = schema.views.map((view) => getLine(view));
      const materializedViewLines = schema.materializedViews.map(
        (materializedView) => getLine(materializedView),
      );

      return [...acc, ...tableLines, ...viewLines, ...materializedViewLines];
    },
    [] as string[],
  );

  const lines: string[] = [
    "declare module 'knex/types/tables' {",
    "  interface Tables {",
    ...declarationLines,
    "  }",
    "}",
  ];

  const declaration: GenericDeclaration = {
    declarationType: "generic",
    typeImports,
    lines,
  };

  const outputPath = config.outputPath ?? "";
  const path = join(outputPath, "knex-tables");

  return {
    ...outputAcc,
    [path]: { fileType: "typescript", declarations: [declaration] },
  };
};

export default generateKnexTablesModule;

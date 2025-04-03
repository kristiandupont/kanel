import type {
  Details,
  GenericDeclaration,
  InstantiatedConfig,
  PreRenderHook,
} from "kanel";
import { join, relative } from "path";

const relativeWithDotPrefix = (source: string, target: string) => {
  const path = relative(source, target);
  if (path[0] !== "." && path[0] !== "/") {
    return `./${path}`;
  }
  return path;
};

const getLine = (details: Details, instantiatedConfig: InstantiatedConfig) => {
  const selector = instantiatedConfig.getMetadata(
    details,
    "selector",
    instantiatedConfig,
  );

  const createImport = (it: string) =>
    `import('${relativeWithDotPrefix(instantiatedConfig.outputPath, selector.path)}').${it}`;

  let initializerName = "never";
  let mutatorName = "never";

  const isReadonly = details.kind !== "table";
  if (!isReadonly) {
    const initializer = instantiatedConfig.getMetadata(
      details,
      "initializer",
      instantiatedConfig,
    );
    initializerName = createImport(initializer.name);

    const mutator = instantiatedConfig.getMetadata(
      details,
      "mutator",
      instantiatedConfig,
    );
    mutatorName = createImport(mutator.name);
  }

  const name =
    details.schemaName === "public"
      ? details.name
      : `${details.schemaName}.${details.name}`;

  return `    '${name}': Knex.CompositeTableType<${createImport("default")}, ${initializerName}, ${mutatorName}>;`;
};

const generateKnexTablesModule: PreRenderHook = (
  outputAcc,
  instantiatedConfig,
) => {
  const knexImport = {
    name: "Knex",
    isAbsolute: true,
    path: "knex",
    isDefault: false,
    importAsType: false,
  };

  const declarationLines = Object.values(instantiatedConfig.schemas).reduce(
    (acc, schema) => {
      const tableLines = schema.tables.map((table) =>
        getLine(table, instantiatedConfig),
      );
      const viewLines = schema.views.map((view) =>
        getLine(view, instantiatedConfig),
      );
      const materializedViewLines = schema.materializedViews.map(
        (materializedView) => getLine(materializedView, instantiatedConfig),
      );

      return [...acc, ...tableLines, ...viewLines, ...materializedViewLines];
    },
    [],
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
    typeImports: [knexImport],
    lines,
  };

  const path = join(instantiatedConfig.outputPath, "knex-tables");

  return {
    ...outputAcc,
    [path]: { declarations: [declaration] },
  };
};

export default generateKnexTablesModule;

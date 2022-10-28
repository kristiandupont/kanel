import type {
  Details,
  GenericDeclaration,
  InstantiatedConfig,
  PreRenderHook,
  TypeImport,
} from 'kanel';
import { join } from 'path';

const getTypeImports = (
  details: Details,
  instantiatedConfig: InstantiatedConfig
): TypeImport[] => {
  const selector = instantiatedConfig.getMetadata(
    details,
    'selector',
    instantiatedConfig
  );
  const result: TypeImport[] = [
    {
      name: selector.name,
      isDefault: true,
      path: selector.path,
      isAbsolute: false,
      importAsType: true,
    },
  ];

  const isReadonly = details.kind !== 'table';
  if (!isReadonly) {
    const initializer = instantiatedConfig.getMetadata(
      details,
      'initializer',
      instantiatedConfig
    );
    result.push({
      name: initializer.name,
      isDefault: false,
      path: initializer.path,
      isAbsolute: false,
      importAsType: true,
    });

    const mutator = instantiatedConfig.getMetadata(
      details,
      'mutator',
      instantiatedConfig
    );
    result.push({
      name: mutator.name,
      isDefault: false,
      path: mutator.path,
      isAbsolute: false,
      importAsType: true,
    });
  }

  return result;
};

const getLine = (
  details: Details,
  instantiatedConfig: InstantiatedConfig
): string => {
  const selector = instantiatedConfig.getMetadata(
    details,
    'selector',
    instantiatedConfig
  );
  const selectorName = selector.name;

  let initializerName = 'never';
  let mutatorName = 'never';

  const isReadonly = details.kind !== 'table';
  if (!isReadonly) {
    const initializer = instantiatedConfig.getMetadata(
      details,
      'initializer',
      instantiatedConfig
    );
    initializerName = initializer.name;

    const mutator = instantiatedConfig.getMetadata(
      details,
      'mutator',
      instantiatedConfig
    );
    mutatorName = mutator.name;
  }

  return `    '${details.name}': Knex.CompositeTableType<${selectorName}, ${initializerName}, ${mutatorName}>;`;
};

const generateKnexTablesModule: PreRenderHook = (
  outputAcc,
  instantiatedConfig
) => {
  const typeImports = Object.values(instantiatedConfig.schemas).reduce(
    (acc, schema) => {
      const tableTypeImports = schema.tables.map((table) =>
        getTypeImports(table, instantiatedConfig)
      );
      const viewTypeImports = schema.tables.map((view) =>
        getTypeImports(view, instantiatedConfig)
      );
      const materializedViewTypeImports = schema.tables.map(
        (materializedView) =>
          getTypeImports(materializedView, instantiatedConfig)
      );

      return [
        ...acc,
        ...tableTypeImports.flat(),
        ...viewTypeImports.flat(),
        ...materializedViewTypeImports.flat(),
      ];
    },
    [
      {
        name: 'Knex',
        isAbsolute: true,
        path: 'knex',
        isDefault: false,
        importAsType: false,
      },
    ]
  );

  const declarationLines = Object.values(instantiatedConfig.schemas).reduce(
    (acc, schema) => {
      const tableLines = schema.tables.map((table) =>
        getLine(table, instantiatedConfig)
      );
      const viewLines = schema.views.map((view) =>
        getLine(view, instantiatedConfig)
      );
      const materializedViewLines = schema.materializedViews.map(
        (materializedView) => getLine(materializedView, instantiatedConfig)
      );

      return [...acc, ...tableLines, ...viewLines, ...materializedViewLines];
    },
    []
  );

  const lines: string[] = [
    "declare module 'knex/types/tables' {",
    '  interface Tables {',
    ...declarationLines,
    '  }',
    '}',
  ];

  const declaration: GenericDeclaration = {
    declarationType: 'generic',
    typeImports,
    lines,
  };

  const path = join(instantiatedConfig.outputPath, 'knex-tables');

  return {
    ...outputAcc,
    [path]: { declarations: [declaration] },
  };
};

export default generateKnexTablesModule;

import {
  CompositeTypeDetails,
  MaterializedViewDetails,
  TableDetails,
  ViewDetails,
} from 'extract-pg-schema';
import {
  CompositeProperty,
  Declaration,
  InstantiatedConfig,
  InterfacePropertyDeclaration,
  TypeImport,
} from 'kanel';

const processFile = (
  declarations: Declaration[],
  compositeDetails:
    | TableDetails
    | ViewDetails
    | MaterializedViewDetails
    | CompositeTypeDetails,
  instantiatedConfig: InstantiatedConfig,
  path: string,
): {
  modifiedDeclarations: Declaration[];
  tableImport: TypeImport;
  tableProperty: InterfacePropertyDeclaration;
} => {
  const { name: selectorName } = instantiatedConfig.getMetadata(
    compositeDetails,
    'selector',
    instantiatedConfig,
  );
  const { name: initializerName } = instantiatedConfig.getMetadata(
    compositeDetails,
    'initializer',
    instantiatedConfig,
  );
  const { name: mutatorName } = instantiatedConfig.getMetadata(
    compositeDetails,
    'mutator',
    instantiatedConfig,
  );

  let canInitialize = true;
  let canMutate = true;

  if (compositeDetails.kind !== 'table') {
    canInitialize = false;
    canMutate = false;
  }

  const modifiedDeclarations = declarations.map((declaration) => {
    if (declaration.declarationType === 'interface') {
      if (declaration.name === selectorName) {
        const name = declaration.name + 'Table';
        const typeImports = [...(declaration.typeImports || [])];

        typeImports.push({
          name: 'ColumnType',
          isDefault: false,
          path: 'kysely',
          isAbsolute: true,
          importAsType: true,
        });

        const properties = declaration.properties.map((property) => {
          const columns: CompositeProperty[] =
            compositeDetails.kind === 'compositeType'
              ? compositeDetails.attributes
              : compositeDetails.columns;
          const column = columns.find(
            (column) =>
              instantiatedConfig.getPropertyMetadata(
                column,
                compositeDetails,
                'selector',
                instantiatedConfig,
              ).name === property.name,
          );

          let baseType = property.typeName;
          baseType += '[]'.repeat(property.dimensions);

          let selectorType = baseType;
          if (property.isNullable) {
            selectorType = `${selectorType} | null`;
          }

          let initializerType = 'never';
          if (canInitialize) {
            initializerType =
              column.isNullable || column.defaultValue || column.isIdentity
                ? `${baseType} | null`
                : baseType;
          }

          let mutatorType = 'never';
          if (canMutate) {
            mutatorType = `${baseType} | null`;
          }

          const typeName = `ColumnType<${selectorType}, ${initializerType}, ${mutatorType}>`;

          return { ...property, typeName, dimensions: 0, isNullable: false };
        });
        return { ...declaration, name, properties, typeImports };
      } else if (declaration.name === initializerName) {
        // Remove the initializer. We're creating a `New${x}` type below
        return undefined;
        // Remove the mutator. We're creating a `${x}Update` type below
      } else if (declaration.name === mutatorName) {
        return undefined;
      }
    }

    return declaration;
  });

  const result = modifiedDeclarations.filter(Boolean);

  result.push({
    declarationType: 'typeDeclaration',
    name: selectorName,
    typeImports: [
      {
        name: 'Selectable',
        isDefault: false,
        path: 'kysely',
        isAbsolute: true,
        importAsType: true,
      },
    ],
    typeDefinition: [`Selectable<${selectorName}Table>`],
    exportAs: 'named',
  });

  if (canInitialize) {
    result.push({
      declarationType: 'typeDeclaration',
      name: `New${selectorName}`,
      typeImports: [
        {
          name: 'Insertable',
          isDefault: false,
          path: 'kysely',
          isAbsolute: true,
          importAsType: true,
        },
      ],
      typeDefinition: [`Insertable<${selectorName}Table>`],
      exportAs: 'named',
    });
  }
  if (canMutate) {
    result.push({
      declarationType: 'typeDeclaration',
      name: `${selectorName}Update`,
      typeImports: [
        {
          name: 'Updateable',
          isDefault: false,
          path: 'kysely',
          isAbsolute: true,
          importAsType: true,
        },
      ],
      typeDefinition: [`Updateable<${selectorName}Table>`],
      exportAs: 'named',
    });
  }

  const tableImport: TypeImport = {
    name: selectorName,
    isDefault: false,
    path,
    isAbsolute: false,
    importAsType: true,
  };

  const tableProperty: InterfacePropertyDeclaration = {
    name: compositeDetails.name,
    typeName: tableImport.name,
    dimensions: 0,
    isNullable: false,
    isOptional: false,
  };

  return { modifiedDeclarations: result, tableImport, tableProperty };
};

export default processFile;

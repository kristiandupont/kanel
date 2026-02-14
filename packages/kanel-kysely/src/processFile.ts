import type {
  CompositeDetails,
  CompositeProperty,
  InterfacePropertyDeclaration,
  TsFileContents,
  TypeImport,
} from "kanel";
import { usePgTsGeneratorContext } from "kanel/build/generators/pgTsGeneratorContext";

import type MakeKyselyConfig from "./MakeKyselyConfig";

/**
 * This is a quirky way to get Kysely interfaces. Basically, what happens is that this
 * hook will filter out initializer and mutators. It takes the selector and transforms
 * it into the Kysely *Table interface, by going over each property. In the end,
 * it adds the New* and *Update types as per the Kysely documentation.
 *
 * This only works when the output from Kanel is close to the default configuration,
 * if you've changed things around too much it will probably not work.
 */
const processFile = (
  declarations: TsFileContents["declarations"],
  compositeDetails: CompositeDetails,
  path: string,
  makeKyselyConfig: MakeKyselyConfig,
): {
  modifiedDeclarations: TsFileContents["declarations"];
  tableImport: TypeImport;
  tableProperty: InterfacePropertyDeclaration;
} => {
  const pgTsContext = usePgTsGeneratorContext();

  const { name: selectorName } = pgTsContext.getMetadata(
    compositeDetails,
    "selector",
  );
  const { name: initializerName } = pgTsContext.getMetadata(
    compositeDetails,
    "initializer",
  );
  const { name: mutatorName } = pgTsContext.getMetadata(
    compositeDetails,
    "mutator",
  );

  let canInitialize = true;
  let canMutate = true;

  if (
    compositeDetails.kind !== "table" &&
    compositeDetails.kind !== "compositeType"
  ) {
    canInitialize = false;
    canMutate = false;
  }

  const { tableInterfaceName, selectableName, insertableName, updatableName } =
    makeKyselyConfig.getKyselyItemMetadata(
      compositeDetails,
      selectorName,
      canInitialize,
      canMutate,
    );

  const modifiedDeclarations = declarations.map((declaration) => {
    if (declaration.declarationType === "interface") {
      if (declaration.name === selectorName) {
        const name = tableInterfaceName;
        const typeImports = [...(declaration.typeImports || [])];

        typeImports.push({
          name: "ColumnType",
          isDefault: false,
          path: "kysely",
          isAbsolute: true,
          importAsType: true,
        });

        const properties = declaration.properties.map((property) => {
          const columns: CompositeProperty[] =
            compositeDetails.kind === "compositeType"
              ? compositeDetails.attributes
              : compositeDetails.columns;
          const column = columns.find(
            (column) =>
              pgTsContext.getPropertyMetadata(
                column,
                compositeDetails,
                "selector",
              ).name === property.name,
          );

          let baseType = property.typeName;
          baseType += "[]".repeat(property.dimensions);

          let selectorType = baseType;
          if (property.isNullable) {
            selectorType = `${selectorType} | null`;
          }

          let initializerType = "never";
          if (canInitialize && column.generated !== "ALWAYS") {
            if (baseType === "Date") {
              baseType += " | string";
            }

            initializerType = baseType;
            if (column.isNullable) {
              initializerType += " | null";
            } else if (
              column.defaultValue ||
              column.isIdentity ||
              column.generated === "BY DEFAULT"
            ) {
              initializerType += " | undefined";
            }
          }

          let mutatorType = "never";
          if (canMutate && column.generated !== "ALWAYS") {
            mutatorType = column.isNullable ? `${baseType} | null` : baseType;
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
    declarationType: "typeDeclaration",
    name: selectableName,
    typeImports: [
      {
        name: "Selectable",
        isDefault: false,
        path: "kysely",
        isAbsolute: true,
        importAsType: true,
      },
    ],
    typeDefinition: [`Selectable<${tableInterfaceName}>`],
    exportAs: "named",
  });

  if (compositeDetails.kind !== "compositeType") {
    if (insertableName) {
      result.push({
        declarationType: "typeDeclaration",
        name: insertableName,
        typeImports: [
          {
            name: "Insertable",
            isDefault: false,
            path: "kysely",
            isAbsolute: true,
            importAsType: true,
          },
        ],
        typeDefinition: [`Insertable<${tableInterfaceName}>`],
        exportAs: "named",
      });
    }

    if (updatableName) {
      result.push({
        declarationType: "typeDeclaration",
        name: updatableName,
        typeImports: [
          {
            name: "Updateable",
            isDefault: false,
            path: "kysely",
            isAbsolute: true,
            importAsType: true,
          },
        ],
        typeDefinition: [`Updateable<${tableInterfaceName}>`],
        exportAs: "named",
      });
    }
  }

  const tableImport: TypeImport = {
    name: tableInterfaceName,
    isDefault: true,
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

import { TableDetails } from "extract-pg-schema";
import { ConstantDeclaration, InstantiatedConfig, TypeImport } from "kanel";

import {
  GenerateZodSchemasConfig,
  GetZodIdentifierMetadata,
} from "./GenerateZodSchemasConfig";
import zImport from "./zImport";

const getIdentifierDeclaration = (
  details: TableDetails,
  getZodIdentifierMetadata: GetZodIdentifierMetadata,
  config: GenerateZodSchemasConfig,
  instantiatedConfig: InstantiatedConfig,
  nonCompositeTypeImports: Record<string, TypeImport>,
): {
  name: string;
  originalName: string;
  declaration: ConstantDeclaration;
}[] => {
  const result: {
    name: string;
    originalName: string;
    declaration: ConstantDeclaration;
  }[] = [];

  if (details.kind === "table" && instantiatedConfig.generateIdentifierType) {
    const { columns } = details;
    const identifierColumns = columns.filter(
      (c) => c.isPrimaryKey && !c.reference,
    );

    identifierColumns.forEach((c) => {
      const typescriptDeclaration = instantiatedConfig.generateIdentifierType(
        c,
        details,
        instantiatedConfig,
      );

      const { name, comment } = getZodIdentifierMetadata(
        c,
        details,
        instantiatedConfig,
      );

      let zodType: string;
      const typeImports: TypeImport[] = [zImport];

      if (c.type.fullName in config.zodTypeMap) {
        const x = config.zodTypeMap[c.type.fullName];
        if (typeof x === "string") {
          zodType = x;
        } else {
          zodType = x.name;
          typeImports.push(...x.typeImports);
        }
      } else if (c.type.fullName in nonCompositeTypeImports) {
        const x = nonCompositeTypeImports[c.type.fullName];
        zodType = x.name;
        typeImports.push(x);
      }

      const declaration: ConstantDeclaration = {
        declarationType: "constant",
        typeImports,
        comment,
        name,
        type: undefined,
        value: config.castToSchema
          ? `${zodType} as unknown as z.Schema<${typescriptDeclaration.name}>`
          : zodType,
        exportAs: "named",
      };

      result.push({
        originalName: typescriptDeclaration.name,
        name,
        declaration,
      });
    });
  }

  return result;
};

export default getIdentifierDeclaration;

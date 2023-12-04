import { DomainDetails } from "extract-pg-schema";
import { ConstantDeclaration, InstantiatedConfig, TypeImport } from "kanel";

import { GenerateZodSchemasConfig } from "./GenerateZodSchemasConfig";

const processDomain = (
  d: DomainDetails,
  config: GenerateZodSchemasConfig,
  instantiatedConfig: InstantiatedConfig,
): ConstantDeclaration | undefined => {
  const { name } = config.getZodSchemaMetadata(
    d,
    undefined,
    instantiatedConfig,
  );
  let zodType = config.zodTypeMap[d.innerType];
  if (!zodType) {
    zodType = "z.unknown()";
  }

  const typeImport: TypeImport = {
    name: "z",
    isDefault: false,
    path: "zod",
    isAbsolute: true,
    importAsType: false,
  };

  const declaration: ConstantDeclaration = {
    declarationType: "constant",
    comment: [`Zod schema for ${d.name}`],
    typeImports: [
      typeImport,
      ...(typeof zodType === "string" ? [] : zodType.typeImports),
    ],
    name,
    type: undefined,
    value: typeof zodType === "string" ? zodType : zodType.name,
    exportAs: "named",
  };

  return declaration;
};

export default processDomain;

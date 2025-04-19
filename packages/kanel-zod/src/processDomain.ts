import type { DomainDetails } from "extract-pg-schema";
import type { ConstantDeclaration, InstantiatedConfig } from "kanel";

import type { GenerateZodSchemasConfig } from "./GenerateZodSchemasConfig";
import zImport from "./zImport";

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

  const declaration: ConstantDeclaration = {
    declarationType: "constant",
    comment: [`Zod schema for ${d.name}`],
    typeImports: [
      zImport,
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

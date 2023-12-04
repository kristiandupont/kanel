import { RangeDetails } from "extract-pg-schema";
import { ConstantDeclaration, InstantiatedConfig, TypeImport } from "kanel";

import { GenerateZodSchemasConfig } from "./GenerateZodSchemasConfig";

const processRange = (
  r: RangeDetails,
  config: GenerateZodSchemasConfig,
  instantiatedConfig: InstantiatedConfig,
): ConstantDeclaration | undefined => {
  const { name } = config.getZodSchemaMetadata(
    r,
    undefined,
    instantiatedConfig,
  );

  const typeImport: TypeImport = {
    name: "z",
    isDefault: false,
    path: "zod",
    isAbsolute: true,
    importAsType: false,
  };

  const declaration: ConstantDeclaration = {
    declarationType: "constant",
    comment: [`Zod schema for ${r.name}`],
    typeImports: [typeImport],
    name,
    type: undefined,
    value: "z.string()",
    exportAs: "named",
  };

  return declaration;
};

export default processRange;

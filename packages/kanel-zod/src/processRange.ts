import type { RangeDetails } from "extract-pg-schema";
import type { ConstantDeclaration, InstantiatedConfig } from "kanel";

import type { GenerateZodSchemasConfig } from "./GenerateZodSchemasConfig";
import zImport from "./zImport";

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

  const declaration: ConstantDeclaration = {
    declarationType: "constant",
    comment: [`Zod schema for ${r.name}`],
    typeImports: [zImport],
    name,
    type: undefined,
    value: "z.string()",
    exportAs: "named",
  };

  return declaration;
};

export default processRange;

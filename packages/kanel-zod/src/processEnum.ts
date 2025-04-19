import type { EnumDetails } from "extract-pg-schema";
import type { ConstantDeclaration, InstantiatedConfig } from "kanel";

import type { GenerateZodSchemasConfig } from "./GenerateZodSchemasConfig";
import zImport from "./zImport";

const processEnum = (
  e: EnumDetails,
  config: GenerateZodSchemasConfig,
  instantiatedConfig: InstantiatedConfig,
): ConstantDeclaration => {
  const { name } = config.getZodSchemaMetadata(
    e,
    undefined,
    instantiatedConfig,
  );
  const lines: string[] = [
    `z.enum([`,
    ...e.values.map((v) => `  '${v}',`),
    "])",
  ];

  const declaration: ConstantDeclaration = {
    declarationType: "constant",
    comment: [`Zod schema for ${e.name}`],
    typeImports: [zImport],
    name,
    type: undefined,
    value: lines,
    exportAs: "named",
  };

  return declaration;
};

export default processEnum;

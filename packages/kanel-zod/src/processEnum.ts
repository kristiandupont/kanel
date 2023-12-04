import { EnumDetails } from "extract-pg-schema";
import { ConstantDeclaration, InstantiatedConfig, TypeImport } from "kanel";

import { GenerateZodSchemasConfig } from "./GenerateZodSchemasConfig";

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
    "]);",
  ];

  const typeImport: TypeImport = {
    name: "z",
    isDefault: false,
    path: "zod",
    isAbsolute: true,
    importAsType: false,
  };

  const declaration: ConstantDeclaration = {
    declarationType: "constant",
    comment: [`Zod schema for ${e.name}`],
    typeImports: [typeImport],
    name,
    type: undefined,
    value: lines,
    exportAs: "named",
  };

  return declaration;
};

export default processEnum;

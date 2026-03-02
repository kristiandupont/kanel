import type { EnumDetails } from "extract-pg-schema";
import type { ConstantDeclaration, PgTsGeneratorContext } from "kanel";

import type { GetZodSchemaMetadata } from "./GenerateZodSchemasConfig";
import zImport from "./zImport";

const processEnum = (
  e: EnumDetails,
  getZodSchemaMetadata: GetZodSchemaMetadata,
  context: PgTsGeneratorContext,
): ConstantDeclaration => {
  const { name } = getZodSchemaMetadata(e, undefined, context);
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

import type { RangeDetails } from "extract-pg-schema";
import type { ConstantDeclaration, PgTsGeneratorContext } from "kanel";

import type { GetZodSchemaMetadata } from "./GenerateZodSchemasConfig";
import zImport from "./zImport";

const processRange = (
  r: RangeDetails,
  getZodSchemaMetadata: GetZodSchemaMetadata,
  context: PgTsGeneratorContext,
): ConstantDeclaration | undefined => {
  const { name } = getZodSchemaMetadata(r, undefined, context);

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

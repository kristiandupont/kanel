import type { DomainDetails } from "extract-pg-schema";
import type { ConstantDeclaration, TypeMap } from "kanel";

import type { GetZodSchemaMetadata } from "./GenerateZodSchemasConfig";
import zImport from "./zImport";

const processDomain = (
  d: DomainDetails,
  getZodSchemaMetadata: GetZodSchemaMetadata,
  zodTypeMap: TypeMap,
): ConstantDeclaration | undefined => {
  const { name } = getZodSchemaMetadata(d, undefined);
  let zodType = zodTypeMap[d.innerType];
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

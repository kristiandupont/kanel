import type { TableDetails } from "extract-pg-schema";
import {
  usePgTsGeneratorContext,
  type ConstantDeclaration,
  type TypeImport,
  type TypeMap,
} from "kanel";

import type { GetZodIdentifierMetadata } from "./GenerateZodSchemasConfig";
import zImport from "./zImport";

const getIdentifierDeclaration = (
  details: TableDetails,
  getZodIdentifierMetadata: GetZodIdentifierMetadata,
  zodTypeMap: TypeMap,
  castToSchema: boolean,
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

  const pgTsContext = usePgTsGeneratorContext();

  if (details.kind === "table" && pgTsContext.generateIdentifierType) {
    const { columns } = details;
    const identifierColumns = columns.filter(
      (c) => c.isPrimaryKey && !c.reference,
    );

    identifierColumns.forEach((c) => {
      const typescriptDeclaration = pgTsContext.generateIdentifierType!(c, details);

      const { name, comment } = getZodIdentifierMetadata(c, details);

      let zodType: string;
      const typeImports: TypeImport[] = [zImport];

      if (c.type.fullName in zodTypeMap) {
        const x = zodTypeMap[c.type.fullName];
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
        value: castToSchema
          ? `${zodType} as unknown as z.Schema<${typescriptDeclaration.name}>`
          : `${zodType}.transform(value => value as ${typescriptDeclaration.name})`,
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

import { TableDetails } from 'extract-pg-schema';
import { GenericDeclaration, InstantiatedConfig, TypeImport } from 'kanel';

import {
  GenerateZodSchemasConfig,
  GetZodIdentifierMetadata,
} from './GenerateZodSchemasConfig';
import zImport from './zImport';

const getIdentifierDeclaration = (
  details: TableDetails,
  getZodIdentifierMetadata: GetZodIdentifierMetadata,
  config: GenerateZodSchemasConfig,
  instantiatedConfig: InstantiatedConfig,
): {
  name: string;
  originalName: string;
  declaration: GenericDeclaration;
}[] => {
  const result: {
    name: string;
    originalName: string;
    declaration: GenericDeclaration;
  }[] = [];

  if (details.kind === 'table' && instantiatedConfig.generateIdentifierType) {
    const { columns } = details;
    const identifierColumns = columns.filter(
      (c) => c.isPrimaryKey && !c.reference,
    );

    identifierColumns.forEach((c) => {
      const typescriptDeclaration = instantiatedConfig.generateIdentifierType(
        c,
        details,
        instantiatedConfig,
      );

      const { name, comment } = getZodIdentifierMetadata(
        c,
        details,
        instantiatedConfig,
      );

      let zodType: string;
      const typeImports: TypeImport[] = [zImport];

      if (c.type.fullName in config.zodTypeMap) {
        const x = config.zodTypeMap[c.type.fullName];
        if (typeof x === 'string') {
          zodType = x;
        } else {
          zodType = x.name;
          typeImports.push(...x.typeImports);
        }
      }

      const declaration: GenericDeclaration = {
        declarationType: 'generic',
        typeImports,
        comment,
        lines: [
          `export const ${name}: z.Schema<${typescriptDeclaration.name}> = ${zodType} as any;`,
        ],
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

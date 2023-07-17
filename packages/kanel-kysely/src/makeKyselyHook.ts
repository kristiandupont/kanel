import { recase } from '@kristiandupont/recase';
import {
  InterfaceDeclaration,
  InterfacePropertyDeclaration,
  PreRenderHook,
  TypeDeclaration,
  TypeImport,
} from 'kanel';
import { dirname, join } from 'path';

import processFile from './processFile';

const toPascalCase = recase(null, 'pascal');

interface MakeKyselyConfig {
  databaseFilename: string;
}

const defaultConfig: MakeKyselyConfig = {
  databaseFilename: 'Database',
};

const makeKyselyHook: (config: MakeKyselyConfig) => PreRenderHook =
  (config = defaultConfig) =>
  async (outputAcc, instantiatedConfig) => {
    const output = { ...outputAcc };

    const schemaImports: TypeImport[] = [];

    for (const schemaName of Object.keys(instantiatedConfig.schemas)) {
      const schema = instantiatedConfig.schemas[schemaName];
      const composites = [
        ...schema.tables,
        ...schema.views,
        ...schema.materializedViews,
        ...schema.compositeTypes,
      ];
      // Get the schema folder from the first known composite.
      let schemaFolder: string | undefined;

      const tableImports: TypeImport[] = [];
      const tableProps: InterfacePropertyDeclaration[] = [];

      composites.forEach((compositeDetails) => {
        const { path } = instantiatedConfig.getMetadata(
          compositeDetails,
          'selector',
          instantiatedConfig,
        ); 
        const { modifiedDeclarations, tableImport, tableProperty } =
          processFile(
            output[path].declarations,
            compositeDetails,
            instantiatedConfig,
            path,
          );
        output[path].declarations = modifiedDeclarations;
        tableImports.push(tableImport);
        tableProps.push(tableProperty);

        if (!schemaFolder) {
          schemaFolder = dirname(path);
        }
      });

      const schemaInterfaceName = `${toPascalCase(schemaName)}Schema`;
      const schemaDeclaration: InterfaceDeclaration = {
        declarationType: 'interface',
        name: schemaInterfaceName,
        exportAs: 'default',
        typeImports: tableImports,
        properties: tableProps,
      };

      const schemaPath = join(schemaFolder, schemaInterfaceName);

      output[schemaPath] = {
        declarations: [schemaDeclaration],
      };

      const schemaImport: TypeImport = {
        name: schemaInterfaceName,
        isDefault: true,
        path: schemaPath,
        isAbsolute: false,
        importAsType: true,
      };

      schemaImports.push(schemaImport);
    }

    const dbPath = join(instantiatedConfig.outputPath, config.databaseFilename);

    const dbDeclaration: TypeDeclaration = {
      declarationType: 'typeDeclaration',
      name: 'Database',
      typeImports: schemaImports,
      typeDefinition: [
        schemaImports.map((dbImport) => dbImport.name).join(' | '),
      ],
      exportAs: 'default',
    };

    output[dbPath] = {
      declarations: [dbDeclaration],
    };

    return output;
  };

export default makeKyselyHook;

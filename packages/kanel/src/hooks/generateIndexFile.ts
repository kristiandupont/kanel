import { join, relative } from 'path';

import { PreRenderHook } from '../config-types';
import Details from '../Details';
import { FileContents } from '../Output';

const generateIndexFile: PreRenderHook = (outputAcc, instantiatedConfig) => {
  const allEntities: Details[] = Object.values(
    instantiatedConfig.schemas
  ).reduce((acc, elem) => {
    const entitiesInSchema = Object.values(elem)
      .filter(Array.isArray)
      .reduce((acc2: Details[], elem2: Details[]) => [...acc2, ...elem2], []);
    return [...acc, ...entitiesInSchema];
  }, []);

  const lines = allEntities.map((d) => {
    let result: string;

    const { path, name: selectorName } = instantiatedConfig.getMetadata(
      d,
      'selector',
      instantiatedConfig
    );
    const importPath = relative(instantiatedConfig.outputPath, path);

    if (d.kind === 'table') {
      const additionalImports = [];

      const { name: initializerName } = instantiatedConfig.getMetadata(
        d,
        'initializer',
        instantiatedConfig
      );
      additionalImports.push(initializerName);

      const { name: mutatorName } = instantiatedConfig.getMetadata(
        d,
        'mutator',
        instantiatedConfig
      );
      additionalImports.push(mutatorName);

      if (instantiatedConfig.generateIdentifierType) {
        const identifierColumns = d.columns.filter(
          (c) => c.isPrimaryKey && !c.reference
        );

        identifierColumns.forEach((c) => {
          const { name } = instantiatedConfig.generateIdentifierType(
            c,
            d,
            instantiatedConfig
          );
          additionalImports.push(name);
        });
      }

      result = `export type { default as ${selectorName}, ${additionalImports.join(
        ', '
      )} } from './${importPath}';`;
    } else if (d.kind === 'enum') {
      result = `export { default as ${selectorName} } from './${importPath}';`;
    } else {
      result = `export type { default as ${selectorName} } from './${importPath}';`;
    }

    return result;
  });

  const indexFile: FileContents = {
    declarations: [
      {
        declarationType: 'generic',
        lines,
      },
    ],
  };

  const path = join(instantiatedConfig.outputPath, 'index');

  return {
    ...outputAcc,
    [path]: indexFile,
  };
};

export default generateIndexFile;

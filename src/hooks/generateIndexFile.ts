import { join, relative } from 'path';

import { PreRenderHook } from '../Config';
import Details from '../Details';
import { FileContents } from '../generators/Output';

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
      'selector'
    );
    const importPath = relative(instantiatedConfig.outputPath, path);

    if (d.kind === 'table') {
      const { name: initializerName } = instantiatedConfig.getMetadata(
        d,
        'initializer'
      );
      const { name: mutatorName } = instantiatedConfig.getMetadata(
        d,
        'mutator'
      );
      result = `export { default as ${selectorName}, ${initializerName}, ${mutatorName} } from './${importPath}';`;
    } else {
      result = `export { default as ${selectorName} } from './${importPath}';`;
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

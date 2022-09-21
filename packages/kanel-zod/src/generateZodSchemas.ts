import { recase } from '@kristiandupont/recase';
import { Declaration, Output, Path, PreRenderHook } from 'kanel';

import { GenerateZodSchemasConfig } from './GenerateZodSchemasConfig';
import processComposite from './processComposite';
import processDomain from './processDomain';
import processEnum from './processEnum';
import processRange from './processRange';
import zodTypeMap from './zodTypeMap';

const createOrAppendFileContents = (
  outputAcc: Output,
  path: Path,
  declaration: Declaration
): Output => ({
  ...outputAcc,
  [path]: {
    ...outputAcc[path],
    declarations: [...(outputAcc[path]?.declarations ?? []), declaration],
  },
});

export const makeGenerateZodSchemas =
  (config: GenerateZodSchemasConfig): PreRenderHook =>
  async (outputAcc, instantiatedConfig) => {
    let output = { ...outputAcc };

    for (const schemaName of Object.keys(instantiatedConfig.schemas)) {
      const schema = instantiatedConfig.schemas[schemaName];

      schema.enums.forEach((enumDetails) => {
        const { path } = config.getZodSchemaMetadata(
          enumDetails,
          config,
          instantiatedConfig
        );
        const declaration = processEnum(
          enumDetails,
          config,
          instantiatedConfig
        );
        output[path] = {
          declarations: [...output[path].declarations, declaration],
        };
      });

      schema.ranges.forEach((rangeDetails) => {
        const { path } = config.getZodSchemaMetadata(
          rangeDetails,
          config,
          instantiatedConfig
        );
        const declaration = processRange(
          rangeDetails,
          config,
          instantiatedConfig
        );
        output[path] = {
          declarations: [...output[path].declarations, declaration],
        };
      });

      schema.domains.forEach((domainDetails) => {
        const { path } = config.getZodSchemaMetadata(
          domainDetails,
          config,
          instantiatedConfig
        );
        const declaration = processDomain(
          domainDetails,
          config,
          instantiatedConfig
        );
        output[path] = {
          declarations: [...output[path].declarations, declaration],
        };
      });

      [
        ...schema.tables,
        ...schema.views,
        ...schema.materializedViews,
        ...schema.compositeTypes,
      ].forEach((compositeDetails) => {
        const { path } = config.getZodSchemaMetadata(
          compositeDetails,
          config,
          instantiatedConfig
        );
        const declaration = processComposite(
          compositeDetails,
          config,
          instantiatedConfig
        );
        output = createOrAppendFileContents(output, path, declaration);
      });
    }

    return output;
  };

const toCamelCase = recase(null, 'camel');

const generateZodSchemas = makeGenerateZodSchemas({
  zodTypeMap,
  getZodSchemaMetadata: (d, _config, instantiatedConfig) => {
    const generateFor = [
      'table',
      'view',
      'materializedView',
      'compositeType',
    ].includes(d.kind)
      ? 'selector'
      : undefined;

    const { path } = instantiatedConfig.getMetadata(
      d,
      generateFor,
      instantiatedConfig
    );
    const name = toCamelCase(d.name);
    return { path, name };
  },
});

export default generateZodSchemas;

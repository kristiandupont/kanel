import { recase } from '@kristiandupont/recase';
import { Declaration, Output, Path, PreRenderHook, TypeImport } from 'kanel';

import { GenerateZodSchemasConfig } from './GenerateZodSchemasConfig';
import processComposite from './processComposite';
import processDomain from './processDomain';
import processEnum from './processEnum';
import processRange from './processRange';

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

    const nonCompositeTypeImports: Record<string, TypeImport> = {};

    // First, process the non-composite types. These may be imported by
    // the composited ones so we will generate them first and store them
    // in the nonCompositeTypeImports map.
    for (const schemaName of Object.keys(instantiatedConfig.schemas)) {
      const schema = instantiatedConfig.schemas[schemaName];

      schema.enums.forEach((enumDetails) => {
        const { name, path } = config.getZodSchemaMetadata(
          enumDetails,
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
        nonCompositeTypeImports[
          `${enumDetails.schemaName}.${enumDetails.name}`
        ] = {
          name,
          path,
          isDefault: false,
          isAbsolute: false,
          importAsType: false,
        };
      });

      schema.ranges.forEach((rangeDetails) => {
        const { name, path } = config.getZodSchemaMetadata(
          rangeDetails,
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
        nonCompositeTypeImports[
          `${rangeDetails.schemaName}.${rangeDetails.name}`
        ] = {
          name,
          path,
          isDefault: false,
          isAbsolute: false,
          importAsType: false,
        };
      });

      schema.domains.forEach((domainDetails) => {
        const { name, path } = config.getZodSchemaMetadata(
          domainDetails,
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
        nonCompositeTypeImports[
          `${domainDetails.schemaName}.${domainDetails.name}`
        ] = {
          name,
          path,
          isDefault: false,
          isAbsolute: false,
          importAsType: false,
        };
      });
    }

    // Now, process the composites
    for (const schemaName of Object.keys(instantiatedConfig.schemas)) {
      const schema = instantiatedConfig.schemas[schemaName];
      [
        ...schema.tables,
        ...schema.views,
        ...schema.materializedViews,
        ...schema.compositeTypes,
      ].forEach((compositeDetails) => {
        const { path } = config.getZodSchemaMetadata(
          compositeDetails,
          instantiatedConfig
        );
        const declaration = processComposite(
          compositeDetails,
          config,
          instantiatedConfig,
          nonCompositeTypeImports
        );
        output = createOrAppendFileContents(output, path, declaration);
      });
    }

    return output;
  };

const toCamelCase = recase(null, 'camel');

const generateZodSchemas = makeGenerateZodSchemas({
  getZodSchemaMetadata: (d, instantiatedConfig) => {
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

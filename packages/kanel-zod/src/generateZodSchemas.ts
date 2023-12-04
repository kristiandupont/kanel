import { Declaration, Output, Path, PreRenderHook, TypeImport } from "kanel";

import defaultZodTypeMap from "./defaultZodTypeMap";
import {
  defaultGetZodIdentifierMetadata,
  defaultGetZodSchemaMetadata,
  GenerateZodSchemasConfig,
} from "./GenerateZodSchemasConfig";
import getIdentifierDeclaration from "./getIdentifierDeclaration";
import processComposite from "./processComposite";
import processDomain from "./processDomain";
import processEnum from "./processEnum";
import processRange from "./processRange";

const createOrAppendFileContents = (
  outputAcc: Output,
  path: Path,
  declaration: Declaration,
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
    const identifierTypeImports: Record<string, TypeImport> = {};

    // First, process the non-composite types. These may be imported by
    // the composed ones so we will generate them first and store them
    // in the nonCompositeTypeImports map.
    for (const schemaName of Object.keys(instantiatedConfig.schemas)) {
      const schema = instantiatedConfig.schemas[schemaName];

      // #region enums
      schema.enums.forEach((enumDetails) => {
        const { name, path } = config.getZodSchemaMetadata(
          enumDetails,
          undefined,
          instantiatedConfig,
        );
        const declaration = processEnum(
          enumDetails,
          config,
          instantiatedConfig,
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
      // #endregion enums

      // #region ranges
      schema.ranges.forEach((rangeDetails) => {
        const { name, path } = config.getZodSchemaMetadata(
          rangeDetails,
          undefined,
          instantiatedConfig,
        );
        const declaration = processRange(
          rangeDetails,
          config,
          instantiatedConfig,
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
      // #endregion ranges

      // #region domains
      schema.domains.forEach((domainDetails) => {
        const { name, path } = config.getZodSchemaMetadata(
          domainDetails,
          undefined,
          instantiatedConfig,
        );
        const declaration = processDomain(
          domainDetails,
          config,
          instantiatedConfig,
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
      // #endregion domains

      // #region identifiers
      // Run through all of the composites and make schemas for their
      // identifiers. This must be done first as they will be imported
      // by other composites.
      schema.tables.forEach((tableDetails) => {
        const { path } = config.getZodSchemaMetadata(
          tableDetails,
          undefined,
          instantiatedConfig,
        );
        const results = getIdentifierDeclaration(
          tableDetails,
          config.getZodIdentifierMetadata,
          config,
          instantiatedConfig,
          nonCompositeTypeImports,
        );

        for (const result of results) {
          const { name, originalName, declaration } = result;

          output = createOrAppendFileContents(output, path, declaration);
          identifierTypeImports[originalName] = {
            name,
            path,
            isDefault: false,
            isAbsolute: false,
            importAsType: false,
          };
        }
      });
      // #endregion identifiers
    }

    // #region composites
    for (const schemaName of Object.keys(instantiatedConfig.schemas)) {
      const schema = instantiatedConfig.schemas[schemaName];
      const composites = [
        ...schema.tables,
        ...schema.views,
        ...schema.materializedViews,
        ...schema.compositeTypes,
      ];
      composites.forEach((compositeDetails) => {
        const { path } = config.getZodSchemaMetadata(
          compositeDetails,
          undefined,
          instantiatedConfig,
        );
        const declarations = processComposite(
          compositeDetails,
          config,
          instantiatedConfig,
          nonCompositeTypeImports,
          identifierTypeImports,
        );
        for (const declaration of declarations) {
          output = createOrAppendFileContents(output, path, declaration);
        }
      });
    }
    // #endregion composites

    return output;
  };

const generateZodSchemas = makeGenerateZodSchemas({
  getZodSchemaMetadata: defaultGetZodSchemaMetadata,
  getZodIdentifierMetadata: defaultGetZodIdentifierMetadata,
  zodTypeMap: defaultZodTypeMap,
  applySatisfies: true,
});

export default generateZodSchemas;

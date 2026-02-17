/**
 * V4 Zod Schema Generator
 *
 * This is a PreRenderHook designed to run within a PgTsGenerator context.
 * It generates Zod schemas for all database types and appends them to the
 * TypeScript files created by the PgTsGenerator.
 */

import { useKanelContext, type PreRenderHookV4, type TypeImport } from "kanel";

import defaultZodTypeMap from "./defaultZodTypeMap";
import type { GenerateZodSchemasConfig } from "./GenerateZodSchemasConfig";
import {
  defaultGetZodIdentifierMetadata,
  defaultGetZodSchemaMetadata,
} from "./GenerateZodSchemasConfig";
import getIdentifierDeclaration from "./getIdentifierDeclaration";
import processComposite from "./processComposite";
import processDomain from "./processDomain";
import processEnum from "./processEnum";
import processRange from "./processRange";

/**
 * Creates a V4 PreRenderHook for generating Zod schemas.
 *
 * This hook runs within a PgTsGenerator context and accesses:
 * - useKanelContext() for schemas
 * - usePgTsGeneratorContext() for TypeScript type metadata (called internally by process functions)
 *
 * @param config - Configuration for Zod schema generation
 * @returns A V4 PreRenderHook
 */
export const makeGenerateZodSchemas =
  (config: GenerateZodSchemasConfig = {}): PreRenderHookV4 =>
  async (outputAcc) => {
    const kanelContext = useKanelContext();
    const output = { ...outputAcc };

    // Resolve configuration with defaults
    const getZodSchemaMetadata =
      config.getZodSchemaMetadata ?? defaultGetZodSchemaMetadata;
    const getZodIdentifierMetadata =
      config.getZodIdentifierMetadata ?? defaultGetZodIdentifierMetadata;
    const zodTypeMap = { ...defaultZodTypeMap, ...(config.zodTypeMap ?? {}) };
    const castToSchema = config.castToSchema ?? true;

    const nonCompositeTypeImports: Record<string, TypeImport> = {};
    const identifierTypeImports: Record<string, TypeImport> = {};
    const compositeTypeImports: Record<string, TypeImport> = {};

    // First, process the non-composite types. These may be imported by
    // the composed ones so we will generate them first and store them
    // in the nonCompositeTypeImports map.
    for (const schemaName of Object.keys(kanelContext.schemas)) {
      const schema = kanelContext.schemas[schemaName];

      // #region enums
      schema.enums?.forEach((enumDetails) => {
        const { name, path } = getZodSchemaMetadata(enumDetails, undefined);
        if (!output[path] || output[path].fileType !== "typescript") {
          throw new Error(`Path ${path} is not a typescript file`);
        }
        const declaration = processEnum(enumDetails, getZodSchemaMetadata);
        output[path] = {
          fileType: "typescript",
          declarations: [...output[path].declarations, declaration],
        };
        nonCompositeTypeImports[
          `${enumDetails.schemaName}.${enumDetails.name}`
        ] = {
          name,
          asName: undefined,
          path,
          isDefault: false,
          isAbsolute: false,
          importAsType: false,
        };
      });
      // #endregion enums

      // #region ranges
      schema.ranges?.forEach((rangeDetails) => {
        const { name, path } = getZodSchemaMetadata(rangeDetails, undefined);
        if (!output[path] || output[path].fileType !== "typescript") {
          throw new Error(`Path ${path} is not a typescript file`);
        }
        const declaration = processRange(rangeDetails, getZodSchemaMetadata);
        output[path] = {
          fileType: "typescript",
          declarations: [...output[path].declarations, declaration],
        };
        nonCompositeTypeImports[
          `${rangeDetails.schemaName}.${rangeDetails.name}`
        ] = {
          name,
          asName: undefined,
          path,
          isDefault: false,
          isAbsolute: false,
          importAsType: false,
        };
      });
      // #endregion ranges

      // #region domains
      schema.domains?.forEach((domainDetails) => {
        const { name, path } = getZodSchemaMetadata(domainDetails, undefined);
        if (!output[path] || output[path].fileType !== "typescript") {
          throw new Error(`Path ${path} is not a typescript file`);
        }
        const declaration = processDomain(
          domainDetails,
          getZodSchemaMetadata,
          zodTypeMap,
        );
        output[path] = {
          fileType: "typescript",
          declarations: [...output[path].declarations, declaration],
        };
        nonCompositeTypeImports[
          `${domainDetails.schemaName}.${domainDetails.name}`
        ] = {
          name,
          asName: undefined,
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
      schema.tables?.forEach((tableDetails) => {
        const { path } = getZodSchemaMetadata(tableDetails, undefined);
        const results = getIdentifierDeclaration(
          tableDetails,
          getZodIdentifierMetadata,
          zodTypeMap,
          castToSchema,
          nonCompositeTypeImports,
        );

        for (const result of results) {
          const { name, originalName, declaration } = result;

          if (!output[path] || output[path].fileType !== "typescript") {
            throw new Error(`Path ${path} is not a typescript file`);
          }
          output[path] = {
            fileType: "typescript",
            declarations: [...output[path].declarations, declaration],
          };
          identifierTypeImports[`${schemaName}.${originalName}`] = {
            name,
            asName: undefined,
            path,
            isDefault: false,
            isAbsolute: false,
            importAsType: false,
          };
        }
      });
      // #endregion identifiers

      // #region composites
      schema.compositeTypes?.forEach((compositeDetails) => {
        const { name, path } = getZodSchemaMetadata(
          compositeDetails,
          undefined,
        );
        compositeTypeImports[
          `${compositeDetails.schemaName}.${compositeDetails.name}`
        ] = {
          name,
          asName: undefined,
          path,
          isDefault: false,
          isAbsolute: false,
          importAsType: false,
        };
      });
      // #endregion composites
    }

    // #region composites
    for (const schemaName of Object.keys(kanelContext.schemas)) {
      const schema = kanelContext.schemas[schemaName];
      const composites = [
        ...(schema.tables ?? []),
        ...(schema.views ?? []),
        ...(schema.materializedViews ?? []),
        ...(schema.compositeTypes ?? []),
      ];
      composites.forEach((compositeDetails) => {
        const { path } = getZodSchemaMetadata(compositeDetails, undefined);
        const declarations = processComposite(
          compositeDetails,
          getZodSchemaMetadata,
          zodTypeMap,
          castToSchema,
          nonCompositeTypeImports,
          compositeTypeImports,
          identifierTypeImports,
        );
        for (const declaration of declarations) {
          if (!output[path] || output[path].fileType !== "typescript") {
            throw new Error(`Path ${path} is not a typescript file`);
          }
          output[path] = {
            fileType: "typescript",
            declarations: [...output[path].declarations, declaration],
          };
        }
      });
    }
    // #endregion composites

    return output;
  };

/**
 * Default Zod schema generator with standard configuration.
 * Use as a preRenderHook in PgTsGeneratorConfig.
 */
const generateZodSchemas = makeGenerateZodSchemas({
  getZodSchemaMetadata: defaultGetZodSchemaMetadata,
  getZodIdentifierMetadata: defaultGetZodIdentifierMetadata,
  zodTypeMap: defaultZodTypeMap,
  castToSchema: true,
});

export default generateZodSchemas;

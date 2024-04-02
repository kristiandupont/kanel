import { extractSchemas } from "extract-pg-schema";
import { rimraf } from "rimraf";

import type { Config, InstantiatedConfig, PreRenderHook } from "./config-types";
import {
  defaultGenerateIdentifierType,
  defaultGetMetadata,
  defaultGetPropertyMetadata,
  defaultPropertySortFunction,
} from "./default-metadata-generators";
import defaultTypeMap from "./defaultTypeMap";
import makeCompositeGenerator from "./generators/makeCompositeGenerator";
import makeDomainsGenerator from "./generators/makeDomainsGenerator";
import makeEnumsGenerator from "./generators/makeEnumsGenerator";
import makeRangesGenerator from "./generators/makeRangesGenerator";
import markAsGenerated from "./hooks/markAsGenerated";
import type Output from "./Output";
import render from "./render";
import type TypeMap from "./TypeMap";
import writeFile from "./writeFile";

type Progress = {
  onProgressStart?: (total: number) => void;
  onProgress?: () => void;
  onProgressEnd?: () => void;
};

const defaultConfig: Partial<Config> = {
  getMetadata: defaultGetMetadata,
  getPropertyMetadata: defaultGetPropertyMetadata,
  generateIdentifierType: defaultGenerateIdentifierType,
  propertySortFunction: defaultPropertySortFunction,
  outputPath: ".",
  enumStyle: "enum",
  resolveViews: true,
  preDeleteOutputFolder: false,
};

const processDatabase = async (
  cfg: Config,
  progress?: Progress,
): Promise<void> => {
  const config = { ...defaultConfig, ...cfg };
  const schemas = await extractSchemas(config.connection, {
    schemas: config.schemas,
    typeFilter: config.typeFilter,
    ...progress,
  });

  const typeMap: TypeMap = {
    ...defaultTypeMap,
    ...config.customTypeMap,
  };

  const instantiatedConfig: InstantiatedConfig = {
    getMetadata: config.getMetadata,
    getPropertyMetadata: config.getPropertyMetadata,
    generateIdentifierType: config.generateIdentifierType,
    propertySortFunction: config.propertySortFunction,
    enumStyle: config.enumStyle,
    typeMap,
    schemas,
    connection: config.connection,
    outputPath: config.outputPath,
    preDeleteOutputFolder: config.preDeleteOutputFolder,
    resolveViews: config.resolveViews,
    importsExtension: config.importsExtension,
  };

  const generators = [
    makeCompositeGenerator("table", instantiatedConfig),
    makeCompositeGenerator("foreignTable", instantiatedConfig),
    makeCompositeGenerator("view", instantiatedConfig),
    makeCompositeGenerator("materializedView", instantiatedConfig),
    makeCompositeGenerator("compositeType", instantiatedConfig),
    makeEnumsGenerator(instantiatedConfig),
    makeRangesGenerator(instantiatedConfig),
    makeDomainsGenerator(instantiatedConfig),
  ];

  let output: Output = {};
  Object.values(schemas).forEach((schema) => {
    generators.forEach((generator) => {
      output = generator(schema, output);
    });
  });

  const preRenderHooks: PreRenderHook[] = config.preRenderHooks ?? [];
  for (const hook of preRenderHooks) {
    output = await hook(output, instantiatedConfig);
  }

  let filesToWrite = Object.keys(output).map((path) => {
    const lines = render(output[path].declarations, path, instantiatedConfig);
    return { fullPath: `${path}.ts`, lines };
  });

  const postRenderHooks = config.postRenderHooks ?? [markAsGenerated];
  for (const hook of postRenderHooks) {
    filesToWrite = await Promise.all(
      filesToWrite.map(async (file) => {
        const lines = await hook(file.fullPath, file.lines, instantiatedConfig);
        return { ...file, lines };
      }),
    );
  }

  if (instantiatedConfig.preDeleteOutputFolder) {
    console.info(`Clearing old files in ${instantiatedConfig.outputPath}`);
    await rimraf(instantiatedConfig.outputPath, { glob: true });
  }

  filesToWrite.forEach((file) => writeFile(file));
};

export default processDatabase;

import { join, relative, sep } from "path";

import type { PreRenderHook } from "../config-types";
import type {
  ConstantDeclaration,
  EnumDeclaration,
  InterfaceDeclaration,
  TypeDeclaration,
} from "../declaration-types";
import type { FileContents } from "../Output";

type GenerateIndexFileConfig = {
  filter?: (
    declaration:
      | TypeDeclaration
      | InterfaceDeclaration
      | EnumDeclaration
      | ConstantDeclaration,
  ) => boolean;
};

type ExportsItem = {
  name: string;
  wasExportedAs: "named" | "default";
  exportAsType: boolean;
};

type SchemaExports = {
  items: Record<string, ExportsItem[]>;
  path: string;
};

function stringifyExportItem(item: ExportsItem): string {
  const prefix = item.exportAsType ? "type " : "";
  return `${prefix}${item.wasExportedAs === "default" ? "default as " : ""}${
    item.name
  }`;
}

function getSchemaFromPath(path: string, outputPath: string): string {
  const relpath = relative(outputPath, path);
  const relparts = relpath.split("/");

  // Make sure path is part of a schema path
  if (relparts.length === 2) {
    return relparts[0];
  }

  return null;
}

export const makeGenerateIndexFile: (
  config: GenerateIndexFileConfig,
) => PreRenderHook = (config) => (outputAcc, instantiatedConfig) => {
  const allExports: Record<string, ExportsItem[]> = {};
  const schemaExports: Record<string, SchemaExports> = {};
  const { outputPath } = instantiatedConfig;

  for (const path of Object.keys(outputAcc)) {
    const schema = getSchemaFromPath(path, outputPath);

    if (schema && !schemaExports[schema]) {
      schemaExports[schema] = {
        path: join(outputPath, schema),
        items: { [path]: [] },
      };
    } else if (schema) {
      schemaExports[schema].items[path] = [];
    }

    const file = outputAcc[path];
    allExports[path] = [];
    for (const declaration of file.declarations) {
      if (declaration.declarationType === "generic") {
        continue;
      }

      if (config.filter && !config.filter(declaration)) {
        continue;
      }

      const { name, exportAs, declarationType } = declaration;
      const declarationItem = {
        name,
        wasExportedAs: exportAs,
        exportAsType: ["typeDeclaration", "interface"].includes(
          declarationType,
        ),
      };

      // Add to the global index
      allExports[path].push(declarationItem);

      // Add to the schema index
      if (schema) {
        schemaExports[schema].items[path].push(declarationItem);
      }
    }
  }

  const schemaIndexFiles: Record<string, FileContents> = {};
  for (const schema of Object.keys(schemaExports)) {
    const schemaPath = schemaExports[schema].path;
    const schemaLines = Object.keys(schemaExports[schema].items).map(
      (itemPath) => {
        const schemaDeclExports = schemaExports[schema].items[itemPath];
        if (schemaDeclExports.length === 0) {
          return "";
        }

        let relativePath = relative(schemaPath, itemPath);
        // Fix Windows-style paths in import line
        if (sep === "\\") {
          relativePath = relativePath.replaceAll("\\", "/");
        }

        const line = `export { ${schemaDeclExports
          .map(stringifyExportItem)
          .join(", ")} } from './${relativePath}';`;

        return line;
      },
    );

    const schemaIndexFile: FileContents = {
      declarations: [
        {
          declarationType: "generic",
          lines: schemaLines,
        },
      ],
    };

    const schemaIndexPath = join(schemaPath, "index");
    schemaIndexFiles[schemaIndexPath] = schemaIndexFile;
  }

  // Return now if using schema-indexes to avoid a conflicting global index
  if (Object.values(schemaIndexFiles).length > 0) {
    return {
      ...outputAcc,
      ...schemaIndexFiles,
    };
  }

  const lines = Object.keys(allExports).map((path) => {
    const exports = allExports[path];
    if (exports.length === 0) {
      return "";
    }

    let relativePath = relative(outputPath, path);
    // Fix Windows-style paths in import line
    if (sep === "\\") {
      relativePath = relativePath.replaceAll("\\", "/");
    }

    const line = `export { ${exports
      .map(stringifyExportItem)
      .join(", ")} } from './${relativePath}';`;

    return line;
  });

  const indexFile: FileContents = {
    declarations: [
      {
        declarationType: "generic",
        lines,
      },
    ],
  };

  const path = join(outputPath, "index");

  return {
    ...outputAcc,
    [path]: indexFile,
  };
};

const generateIndexFile = makeGenerateIndexFile({});

export default generateIndexFile;

import { join, relative } from "path";

import { PreRenderHook } from "../config-types";
import {
  ConstantDeclaration,
  EnumDeclaration,
  InterfaceDeclaration,
  TypeDeclaration,
} from "../declaration-types";
import { FileContents } from "../Output";

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

function stringifyExportItem(item: ExportsItem): string {
  const prefix = item.exportAsType ? "type " : "";
  return `${prefix}${item.wasExportedAs === "default" ? "default as " : ""}${
    item.name
  }`;
}

export const makeGenerateIndexFile: (
  config: GenerateIndexFileConfig,
) => PreRenderHook = (config) => (outputAcc, instantiatedConfig) => {
  const allExports: Record<string, ExportsItem[]> = {};

  for (const path of Object.keys(outputAcc)) {
    const file = outputAcc[path];
    allExports[path] = [];
    for (const declaration of file.declarations) {
      if (declaration.declarationType === "generic") {
        continue;
      }

      // eslint-disable-next-line unicorn/no-array-callback-reference
      if (config.filter && !config.filter(declaration)) {
        continue;
      }

      const { name, exportAs, declarationType } = declaration;
      allExports[path].push({
        name,
        wasExportedAs: exportAs,
        exportAsType: ["typeDeclaration", "interface"].includes(
          declarationType,
        ),
      });
    }
  }

  const lines = Object.keys(allExports).map((path) => {
    const exports = allExports[path];
    if (exports.length === 0) {
      return "";
    }

    const relativePath = relative(instantiatedConfig.outputPath, path);

    const line = `export { ${
      // eslint-disable-next-line unicorn/no-array-callback-reference
      exports.map(stringifyExportItem).join(", ")
    } } from './${relativePath}';`;

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

  const path = join(instantiatedConfig.outputPath, "index");

  return {
    ...outputAcc,
    [path]: indexFile,
  };
};

const generateIndexFile = makeGenerateIndexFile({});

export default generateIndexFile;

import { join, relative, sep } from "path";

import type {
  ConstantDeclaration,
  EnumDeclaration,
  InterfaceDeclaration,
  TypeDeclaration,
} from "../ts-utilities/ts-declaration-types";
import type { TsFileContents } from "../Output";
import type { PreRenderHookV4 } from "../config-types-v4";
import { useKanelContext } from "../context";

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
) => PreRenderHookV4 = (config) => (outputAcc) => {
  const context = useKanelContext();
  const allExports: Record<string, ExportsItem[]> = {};

  for (const path of Object.keys(outputAcc)) {
    const file = outputAcc[path];
    if (file.fileType !== "typescript") {
      // Only process typescript files
      continue;
    }

    allExports[path] = [];
    for (const declaration of file.declarations) {
      if (declaration.declarationType === "generic") {
        continue;
      }

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

    let relativePath = relative(context.config.outputPath, path);
    // Fix Windows-style paths in import line
    if (sep === "\\") {
      relativePath = relativePath.replaceAll("\\", "/");
    }

    const extension = context.typescriptConfig.importsExtension ?? "";
    const line = `export { ${exports
      .map(stringifyExportItem)
      .join(", ")} } from './${relativePath}${extension}';`;

    return line;
  });

  const indexFile: TsFileContents = {
    fileType: "typescript",
    declarations: [
      {
        declarationType: "generic",
        lines,
      },
    ],
  };

  // Use the same base name "index" - the file extension will be added by processDatabase
  const path = join(context.config.outputPath, "index");

  return {
    ...outputAcc,
    [path]: indexFile,
  };
};

const generateIndexFile = makeGenerateIndexFile({});

export default generateIndexFile;

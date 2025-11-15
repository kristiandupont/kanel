import path from "path";

import escapeString from "./escapeString";
import type TypeImport from "./TypeImport";

type ImportSet = {
  defaultImport?: string;
  importDefaultAsType?: boolean;
  namedImports: Set<string>;
  namedAsTypeImports: Set<string>;
};

class ImportGenerator {
  srcFolder: string;
  srcModuleName: string;
  importsExtension: string | undefined;

  /**
   * @param srcPath The path (including filename) of the module we're generating imports for.
   * @param importsExtension The extension to append to relative imports (e.g., ".js", ".mjs", ".cjs", or empty string for no extension)
   */
  constructor(srcPath: string, importsExtension: string | undefined) {
    this.srcFolder = path.dirname(srcPath);
    this.srcModuleName = path.basename(srcPath);
    this.importsExtension = importsExtension;
  }

  importMap: { [index: string]: ImportSet } = {};

  addImport({
    name,
    asName,
    isDefault,
    path: absolutePath,
    isAbsolute,
    importAsType,
  }: TypeImport): void {
    let importPath = absolutePath;

    if (!isAbsolute) {
      let relativePath = path.relative(this.srcFolder, absolutePath);

      // We never want Windows-style paths in our source. Fix it if necessary.
      if (path.sep === "\\") {
        relativePath = relativePath.replaceAll("\\", "/");
      }

      if (relativePath[0] !== ".") {
        relativePath = `./${relativePath}`;
      }
      importPath = relativePath;
    }

    // Ignore imports of "self".
    if (importPath === `./${this.srcModuleName}`) {
      return;
    }

    if (!(importPath in this.importMap)) {
      this.importMap[importPath] = {
        namedImports: new Set(),
        namedAsTypeImports: new Set(),
      };
    }

    const importSet = this.importMap[importPath];

    if (isDefault) {
      if (
        importSet.defaultImport &&
        (importSet.defaultImport !== (asName || name) ||
          importSet.importDefaultAsType !== importAsType)
      ) {
        throw new Error(
          `Multiple default imports attempted: ${importSet.defaultImport} and ${name} from '${importPath}'`,
        );
      }
      importSet.defaultImport = asName || name;
      importSet.importDefaultAsType = importAsType;
    } else {
      const importName = asName ? `${name} as ${asName}` : name;
      if (importAsType) {
        importSet.namedAsTypeImports.add(importName);
      } else {
        importSet.namedImports.add(importName);
      }
    }
  }

  generateLines(): string[] {
    return Object.keys(this.importMap).flatMap((relativePath) => {
      const {
        defaultImport,
        importDefaultAsType,
        namedImports,
        namedAsTypeImports,
      } = this.importMap[relativePath];

      const importParts: string[] = [];

      if (defaultImport) {
        if (importDefaultAsType) {
          namedAsTypeImports.add(`default as ${defaultImport}`);
        } else {
          importParts.push(defaultImport);
        }
      }

      const onlyTypeImports =
        namedImports.size === 0 &&
        (!defaultImport || (defaultImport && importDefaultAsType));

      if (namedImports.size > 0 || namedAsTypeImports.size > 0) {
        const nonTypeImports = [...namedImports].join(", ");
        const typeImports = [...namedAsTypeImports]
          .map((n) => (onlyTypeImports ? n : `type ${n}`))
          .join(", ");

        const bracketedImportString =
          "{ " +
          [nonTypeImports, typeImports].filter(Boolean).join(", ") +
          " }";

        importParts.push(bracketedImportString);
      }

      const extension =
        (relativePath.includes("./") ? this.importsExtension : "") ?? "";
      const line = `import ${onlyTypeImports ? "type " : ""}${importParts.join(", ")} from '${escapeString(
        relativePath,
      )}${extension}';`;
      return [line];
    });
  }
}

export default ImportGenerator;

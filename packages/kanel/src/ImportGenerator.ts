import path from "path";

import escapeString from "./escapeString";
import TypeImport from "./TypeImport";

type ImportSet = {
  defaultImport?: string;
  importDefaultAsType?: boolean;
  namedImports: Set<string>;
  namedAsTypeImports: Set<string>;
};

class ImportGenerator {
  srcFolder: string;
  srcModuleName: string;

  /**
   * @param srcPath The path (including filename) of the module we're generating imports for.
   */
  constructor(srcPath: string) {
    this.srcFolder = path.dirname(srcPath);
    this.srcModuleName = path.basename(srcPath);
  }

  importMap: { [index: string]: ImportSet } = {};

  addImport({
    name,
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
        (importSet.defaultImport !== name ||
          importSet.importDefaultAsType !== importAsType)
      ) {
        throw new Error(
          `Multiple default imports attempted: ${importSet.defaultImport} and ${name} from '${importPath}'`,
        );
      }
      importSet.defaultImport = name;
      importSet.importDefaultAsType = importAsType;
    } else {
      if (importAsType) {
        importSet.namedAsTypeImports.add(name);
      } else {
        importSet.namedImports.add(name);
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

      if (namedImports.size > 0 || namedAsTypeImports.size > 0) {
        const nonTypeImports = [...namedImports].join(", ");
        const typeImports = [...namedAsTypeImports]
          .map((n) => `type ${n}`)
          .join(", ");

        const bracketedImportString =
          "{ " +
          [nonTypeImports, typeImports].filter(Boolean).join(", ") +
          " }";

        importParts.push(bracketedImportString);
      }

      const line = `import ${importParts.join(", ")} from '${escapeString(
        relativePath,
      )}';`;
      return [line];
    });
  }
}

export default ImportGenerator;

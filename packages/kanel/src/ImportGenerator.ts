import path from "path";

import type { InstantiatedConfig } from "./config-types";
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
  config: InstantiatedConfig | undefined;

  /**
   * @param srcPath The path (including filename) of the module we're generating imports for.
   */
  constructor(srcPath: string, config: InstantiatedConfig) {
    this.srcFolder = path.dirname(srcPath);
    this.srcModuleName = path.basename(srcPath);
    this.config = config ?? undefined;
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

      const extension = relativePath.includes("./")
        ? this.config.importsExtension
        : "";
      const line = `import ${onlyTypeImports ? "type " : ""}${importParts.join(", ")} from '${escapeString(
        relativePath,
      )}${extension}';`;
      return [line];
    });
  }
}

export default ImportGenerator;

import path from "path";

import TypeImport from "./TypeImport";

type ImportSet = {
  default?: string;
  defaultAsType?: string;
  named: Set<string>;
  namedAsType: Set<string>;
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
      this.importMap[importPath] = { named: new Set(), namedAsType: new Set() };
    }

    const importSet = this.importMap[importPath];

    if (isDefault) {
      if (importAsType) {
        if (importSet.defaultAsType && importSet.defaultAsType !== name) {
          throw new Error(
            `Multiple default imports attempted: ${importSet.defaultAsType} and ${name} from '${importPath}'`,
          );
        }
        importSet.defaultAsType = name;
      } else {
        if (importSet.default && importSet.default !== name) {
          throw new Error(
            `Multiple default imports attempted: ${importSet.default} and ${name} from '${importPath}'`,
          );
        }
        importSet.default = name;
      }
    } else {
      if (importAsType) {
        importSet.namedAsType.add(name);
      } else {
        importSet.named.add(name);
      }
    }
  }

  generateLines(): string[] {
    return Object.keys(this.importMap).flatMap((relativePath) => {
      const {
        default: defaultImport,
        defaultAsType: defaultAsTypeImport,
        named,
        namedAsType,
      } = this.importMap[relativePath];

      const lines: string[] = [];

      if (defaultImport || named.size > 0) {
        lines.push(
          this.generateLine(relativePath, false, defaultImport, [...named]),
        );
      }
      if (defaultAsTypeImport || namedAsType.size > 0) {
        lines.push(
          this.generateLine(relativePath, true, defaultAsTypeImport, [
            ...namedAsType,
          ]),
        );
      }
      return lines;
    });
  }

  private generateLine(
    relativePath: string,
    importAsType: boolean,
    defaultImport: string | undefined,
    namedImports: Array<string>,
  ): any {
    const importDefaultAsNamed =
      importAsType && defaultImport && namedImports.length > 0;

    const appliedDefaultImport = importDefaultAsNamed
      ? undefined
      : defaultImport;
    const appliedNamedImports = importDefaultAsNamed
      ? [`default as ${defaultImport}`, ...namedImports]
      : namedImports;

    const allImports = [
      ...(appliedDefaultImport ? [appliedDefaultImport] : []),
      ...(appliedNamedImports.length > 0
        ? [`{ ${appliedNamedImports.join(", ")} }`]
        : []),
    ].join(", ");

    return `import ${
      importAsType ? "type " : ""
    }${allImports} from '${relativePath}';`;
  }
}

export default ImportGenerator;

import path from 'path';

type ImportSet = {
  default?: string;
  named: Set<string>;
};

class ImportGenerator {
  srcPath: string;

  constructor(srcPath) {
    this.srcPath = srcPath;
  }

  importMap: { [index: string]: ImportSet } = {};

  addImport(
    name: string,
    isDefault: boolean,
    absolutePath: string,
    isAbsolute: boolean
  ) {
    let importPath = absolutePath;

    if (!isAbsolute) {
      let relativePath = path.relative(this.srcPath, absolutePath);

      // We never want Windows-style paths in our source. Fix it if necessary.
      if (path.sep === '\\') {
        relativePath = relativePath.replace(/\\/g, '/');
      }

      if (relativePath[0] !== '.') {
        relativePath = `./${relativePath}`;
      }
      importPath = relativePath;
    }

    if (!(importPath in this.importMap)) {
      this.importMap[importPath] = { named: new Set() };
    }

    const importSet = this.importMap[importPath];

    if (isDefault) {
      if (importSet.default && importSet.default !== name) {
        throw new Error(
          `Multiple default imports attempted: ${importSet.default} and ${name} from '${importPath}'`
        );
      }
      importSet.default = name;
    } else {
      importSet.named.add(name);
    }
  }

  generateLines(): string[] {
    return Object.keys(this.importMap).map((relativePath) =>
      this.generateLine(relativePath, this.importMap[relativePath])
    );
  }

  private generateLine(relativePath: string, importSet: ImportSet): any {
    const defaultImport = importSet.default;
    const namedImports = Array.from(importSet.named.values());

    const allImports = [
      ...(defaultImport ? [defaultImport] : []),
      ...(namedImports.length > 0 ? [`{ ${namedImports.join(', ')} }`] : []),
    ].join(', ');

    return `import ${allImports} from '${relativePath}';`;
  }
}

export default ImportGenerator;

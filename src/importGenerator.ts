import path from 'path';

type Import = {
  name: string;
  isDefault: boolean;
};

class ImportGenerator {
  srcPath: string;

  constructor(srcPath) {
    this.srcPath = srcPath;
  }

  importMap: { [index: string]: Import[] } = {};

  addImport(name: string, isDefault: boolean, libPath: string) {
    let relativePath = path.relative(this.srcPath, libPath);

    // We never want Windows-style paths in our source. Fix it if necessary.
    if (path.sep === '\\') {
      relativePath = relativePath.replace(/\\/g, '/');
    }

    if (relativePath[0] !== '.') {
      relativePath = `./${relativePath}`;
    }

    if (!(relativePath in this.importMap)) {
      this.importMap[relativePath] = [];
    }

    this.importMap[relativePath].push({ name, isDefault });
  }

  generateLines(): string[] {
    return Object.keys(this.importMap).map((relativePath) =>
      this.generateLine(relativePath, this.importMap[relativePath])
    );
  }

  generateLine(relativePath: string, imports: Import[]): any {
    const defaultImport = imports.find((i) => i.isDefault)?.name;
    const namedImports = imports.filter((i) => !i.isDefault).map((i) => i.name);

    const allImports = [
      ...(defaultImport ? [defaultImport] : []),
      ...(namedImports.length > 0 ? [`{ ${namedImports.join(', ')} }`] : []),
    ].join(', ');

    return `import ${allImports} from '${relativePath}';`;
  }
}

export default ImportGenerator;

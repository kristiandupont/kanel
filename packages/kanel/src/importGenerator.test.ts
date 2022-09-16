import { describe, expect, it } from 'vitest';

import ImportGenerator from './importGenerator';

describe('ImportGenerator', () => {
  it('should generate an import statement', () => {
    const ig = new ImportGenerator('/src/some-module');

    ig.addImport({
      name: 'func',
      isDefault: true,
      path: '/src/lib/func',
      isAbsolute: false,
    });

    const generatedLines = ig.generateLines();
    expect(generatedLines).toEqual(["import func from './lib/func';"]);
  });

  it('should support various cases', () => {
    const ig = new ImportGenerator('/package/src/some-module');

    ig.addImport({
      name: 'defaultFunc',
      isDefault: true,
      path: '/package/src/lib/defaultFunc',
      isAbsolute: false,
    });

    ig.addImport({
      name: 'namedFunc1',
      isDefault: false,
      path: '/package/src/lib/namedFunc',
      isAbsolute: false,
    });
    ig.addImport({
      name: 'namedFunc2',
      isDefault: false,
      path: '/package/src/lib/namedFunc',
      isAbsolute: false,
    });

    ig.addImport({
      name: 'pck',
      isDefault: true,
      path: '/package/package.json',
      isAbsolute: false,
    });

    ig.addImport({
      name: 'sister',
      isDefault: true,
      path: '/package/sister-src/sister',
      isAbsolute: false,
    });

    ig.addImport({
      name: 'defComb',
      isDefault: true,
      path: '/package/src/comb',
      isAbsolute: false,
    });
    ig.addImport({
      name: 'defNamed1',
      isDefault: false,
      path: '/package/src/comb',
      isAbsolute: false,
    });
    ig.addImport({
      name: 'defNamed2',
      isDefault: false,
      path: '/package/src/comb',
      isAbsolute: false,
    });
    ig.addImport({
      name: 'defNamed3',
      isDefault: false,
      path: '/package/src/comb',
      isAbsolute: false,
    });

    const generatedLines = ig.generateLines();
    expect(generatedLines).toEqual([
      "import defaultFunc from './lib/defaultFunc';",
      "import { namedFunc1, namedFunc2 } from './lib/namedFunc';",
      "import pck from '../package.json';",
      "import sister from '../sister-src/sister';",
      "import defComb, { defNamed1, defNamed2, defNamed3 } from './comb';",
    ]);
  });

  it('should ignore duplicates', () => {
    const ig = new ImportGenerator('./some-module');

    ig.addImport({
      name: 'def',
      isDefault: true,
      path: './pkg',
      isAbsolute: false,
    });
    ig.addImport({
      name: 'def',
      isDefault: true,
      path: './pkg',
      isAbsolute: false,
    });

    ig.addImport({
      name: 'named1',
      isDefault: false,
      path: './pkg',
      isAbsolute: false,
    });
    ig.addImport({
      name: 'named2',
      isDefault: false,
      path: './pkg',
      isAbsolute: false,
    });
    ig.addImport({
      name: 'named1',
      isDefault: false,
      path: './pkg',
      isAbsolute: false,
    });

    const generatedLines = ig.generateLines();
    expect(generatedLines).toEqual([
      "import def, { named1, named2 } from './pkg';",
    ]);
  });

  it('should complain about multiple (different) default imports', () => {
    const ig = new ImportGenerator('./some-module');

    ig.addImport({
      name: 'def',
      isDefault: true,
      path: './pkg',
      isAbsolute: false,
    });

    expect(() =>
      ig.addImport({
        name: 'def2',
        isDefault: true,
        path: './pkg',
        isAbsolute: false,
      })
    ).toThrow("Multiple default imports attempted: def and def2 from './pkg'");
  });

  it('should support aboslute imports', () => {
    const ig = new ImportGenerator('./some-module');

    ig.addImport({
      name: 'path',
      isDefault: true,
      path: 'path',
      isAbsolute: true,
    });
    ig.addImport({
      name: 'existsSync',
      isDefault: false,
      path: 'fs',
      isAbsolute: true,
    });
    ig.addImport({
      name: 'mkDirSync',
      isDefault: false,
      path: 'fs',
      isAbsolute: true,
    });

    const generatedLines = ig.generateLines();
    expect(generatedLines).toEqual([
      "import path from 'path';",
      "import { existsSync, mkDirSync } from 'fs';",
    ]);
  });

  it('should not import items from the same file', () => {
    const ig = new ImportGenerator('./src/some-module');

    ig.addImport({
      name: 'path',
      isDefault: true,
      path: 'path',
      isAbsolute: true,
    });
    ig.addImport({
      name: 'someDefaultImport',
      isDefault: true,
      path: './src/some-module',
      isAbsolute: false,
    });
    ig.addImport({
      name: 'someNamedImport',
      isDefault: false,
      path: './src/some-module',
      isAbsolute: false,
    });

    const generatedLines = ig.generateLines();
    expect(generatedLines).toEqual(["import path from 'path';"]);
  });
});

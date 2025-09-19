import { describe, expect, it } from "vitest";

import ImportGenerator from "./ImportGenerator";

describe("ImportGenerator", () => {
  it("should generate an import statement", () => {
    const ig = new ImportGenerator("/src/some-module", undefined);

    ig.addImport({
      name: "func",
      asName: undefined,
      isDefault: true,
      path: "/src/lib/func",
      isAbsolute: false,
      importAsType: false,
    });

    const generatedLines = ig.generateLines();
    expect(generatedLines).toEqual(["import func from './lib/func';"]);
  });

  it("should support various cases", () => {
    const ig = new ImportGenerator("/package/src/some-module", undefined);

    ig.addImport({
      name: "defaultFunc",
      asName: undefined,
      isDefault: true,
      path: "/package/src/lib/defaultFunc",
      isAbsolute: false,
      importAsType: false,
    });

    ig.addImport({
      name: "namedFunc1",
      asName: undefined,
      isDefault: false,
      path: "/package/src/lib/namedFunc",
      isAbsolute: false,
      importAsType: false,
    });
    ig.addImport({
      name: "namedFunc2",
      asName: undefined,
      isDefault: false,
      path: "/package/src/lib/namedFunc",
      isAbsolute: false,
      importAsType: false,
    });

    ig.addImport({
      name: "pck",
      asName: undefined,
      isDefault: true,
      path: "/package/package.json",
      isAbsolute: false,
      importAsType: false,
    });

    ig.addImport({
      name: "sister",
      asName: undefined,
      isDefault: true,
      path: "/package/sister-src/sister",
      isAbsolute: false,
      importAsType: false,
    });

    ig.addImport({
      name: "defComb",
      asName: undefined,
      isDefault: true,
      path: "/package/src/comb",
      isAbsolute: false,
      importAsType: false,
    });
    ig.addImport({
      name: "defNamed1",
      asName: undefined,
      isDefault: false,
      path: "/package/src/comb",
      isAbsolute: false,
      importAsType: false,
    });
    ig.addImport({
      name: "defNamed2",
      asName: undefined,
      isDefault: false,
      path: "/package/src/comb",
      isAbsolute: false,
      importAsType: false,
    });
    ig.addImport({
      name: "defNamed3",
      asName: undefined,
      isDefault: false,
      path: "/package/src/comb",
      isAbsolute: false,
      importAsType: false,
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

  it("should ignore duplicates", () => {
    const ig = new ImportGenerator("./some-module", undefined);

    ig.addImport({
      name: "def",
      asName: undefined,
      isDefault: true,
      path: "./pkg",
      isAbsolute: false,
      importAsType: false,
    });
    ig.addImport({
      name: "def",
      asName: undefined,
      isDefault: true,
      path: "./pkg",
      isAbsolute: false,
      importAsType: false,
    });

    ig.addImport({
      name: "named1",
      asName: undefined,
      isDefault: false,
      path: "./pkg",
      isAbsolute: false,
      importAsType: false,
    });
    ig.addImport({
      name: "named2",
      asName: undefined,
      isDefault: false,
      path: "./pkg",
      isAbsolute: false,
      importAsType: false,
    });
    ig.addImport({
      name: "named1",
      asName: undefined,
      isDefault: false,
      path: "./pkg",
      isAbsolute: false,
      importAsType: false,
    });

    const generatedLines = ig.generateLines();
    expect(generatedLines).toEqual([
      "import def, { named1, named2 } from './pkg';",
    ]);
  });

  it("should complain about multiple (different) default imports", () => {
    const ig = new ImportGenerator("./some-module", undefined);

    ig.addImport({
      name: "def",
      asName: undefined,
      isDefault: true,
      path: "./pkg",
      isAbsolute: false,
      importAsType: false,
    });

    expect(() =>
      ig.addImport({
        name: "def2",
        asName: undefined,
        isDefault: true,
        path: "./pkg",
        isAbsolute: false,
        importAsType: false,
      }),
    ).toThrow("Multiple default imports attempted: def and def2 from './pkg'");
  });

  it("should support absolute imports", () => {
    const ig = new ImportGenerator("./some-module", undefined);

    ig.addImport({
      name: "path",
      asName: undefined,
      isDefault: true,
      path: "path",
      isAbsolute: true,
      importAsType: false,
    });
    ig.addImport({
      name: "existsSync",
      asName: undefined,
      isDefault: false,
      path: "fs",
      isAbsolute: true,
      importAsType: false,
    });
    ig.addImport({
      name: "mkDirSync",
      asName: undefined,
      isDefault: false,
      path: "fs",
      isAbsolute: true,
      importAsType: false,
    });

    const generatedLines = ig.generateLines();
    expect(generatedLines).toEqual([
      "import path from 'path';",
      "import { existsSync, mkDirSync } from 'fs';",
    ]);
  });

  it("should not import items from the same file", () => {
    const ig = new ImportGenerator("./src/some-module", undefined);

    ig.addImport({
      name: "path",
      asName: undefined,
      isDefault: true,
      path: "path",
      isAbsolute: true,
      importAsType: false,
    });
    ig.addImport({
      name: "someDefaultImport",
      asName: undefined,
      isDefault: true,
      path: "./src/some-module",
      isAbsolute: false,
      importAsType: false,
    });
    ig.addImport({
      name: "someNamedImport",
      asName: undefined,
      isDefault: false,
      path: "./src/some-module",
      isAbsolute: false,
      importAsType: false,
    });

    const generatedLines = ig.generateLines();
    expect(generatedLines).toEqual(["import path from 'path';"]);
  });

  it("should support type-only imports", () => {
    const ig = new ImportGenerator("./some-module", undefined);

    ig.addImport({
      name: "Member",
      asName: undefined,
      isDefault: true,
      path: "member",
      isAbsolute: true,
      importAsType: true,
    });
    ig.addImport({
      name: "AccountId",
      asName: undefined,
      isDefault: false,
      path: "account",
      isAbsolute: true,
      importAsType: true,
    });
    ig.addImport({
      name: "AccountInitializer",
      asName: undefined,
      isDefault: false,
      path: "account",
      isAbsolute: true,
      importAsType: true,
    });

    const generatedLines = ig.generateLines();
    expect(generatedLines).toEqual([
      "import type { default as Member } from 'member';",
      "import type { AccountId, AccountInitializer } from 'account';",
    ]);
  });

  it("should support combinations of type-only and non-type-only imports", () => {
    const ig = new ImportGenerator("./some-module", undefined);

    ig.addImport({
      name: "Member",
      asName: undefined,
      isDefault: true,
      path: "member",
      isAbsolute: true,
      importAsType: true,
    });
    ig.addImport({
      name: "AccountId",
      asName: undefined,
      isDefault: false,
      path: "account",
      isAbsolute: true,
      importAsType: true,
    });
    ig.addImport({
      name: "AccountInitializer",
      asName: undefined,
      isDefault: false,
      path: "account",
      isAbsolute: true,
      importAsType: true,
    });
    ig.addImport({
      name: "Account",
      asName: undefined,
      isDefault: true,
      path: "account",
      isAbsolute: true,
      importAsType: false,
    });
    ig.addImport({
      name: "account",
      asName: undefined,
      isDefault: false,
      path: "account",
      isAbsolute: true,
      importAsType: false,
    });

    const generatedLines = ig.generateLines();
    expect(generatedLines).toEqual([
      "import type { default as Member } from 'member';",
      "import Account, { account, type AccountId, type AccountInitializer } from 'account';",
    ]);
  });

  // This is necessary because of https://github.com/tc39/proposal-type-annotations/issues/16
  it("should combine default and named type-only imports correctly", () => {
    const ig = new ImportGenerator("./some-module", undefined);

    ig.addImport({
      name: "Account",
      asName: undefined,
      isDefault: true,
      path: "account",
      isAbsolute: true,
      importAsType: true,
    });
    ig.addImport({
      name: "AccountId",
      asName: undefined,
      isDefault: false,
      path: "account",
      isAbsolute: true,
      importAsType: true,
    });
    ig.addImport({
      name: "account",
      asName: undefined,
      isDefault: false,
      path: "account",
      isAbsolute: true,
      importAsType: false,
    });

    const generatedLines = ig.generateLines();
    expect(generatedLines).toEqual([
      "import { account, type AccountId, type default as Account } from 'account';",
    ]);
  });

  it("should support renaming imports with asName", () => {
    const ig = new ImportGenerator("./some-module", undefined);

    // Test default import renaming
    ig.addImport({
      name: "OriginalName",
      asName: "RenamedDefault",
      isDefault: true,
      path: "module",
      isAbsolute: true,
      importAsType: false,
    });

    // Test named import renaming
    ig.addImport({
      name: "OriginalNamed",
      asName: "RenamedNamed",
      isDefault: false,
      path: "module",
      isAbsolute: true,
      importAsType: false,
    });

    // Test type import renaming
    ig.addImport({
      name: "OriginalType",
      asName: "RenamedType",
      isDefault: false,
      path: "module",
      isAbsolute: true,
      importAsType: true,
    });

    const generatedLines = ig.generateLines();
    expect(generatedLines).toEqual([
      "import RenamedDefault, { OriginalNamed as RenamedNamed, type OriginalType as RenamedType } from 'module';",
    ]);
  });

  it("should handle mixed renamed and non-renamed imports", () => {
    const ig = new ImportGenerator("./some-module", undefined);

    // Mix of renamed and non-renamed imports
    ig.addImport({
      name: "Default1",
      asName: "RenamedDefault",
      isDefault: true,
      path: "module1",
      isAbsolute: true,
      importAsType: false,
    });

    ig.addImport({
      name: "Named1",
      asName: undefined,
      isDefault: false,
      path: "module1",
      isAbsolute: true,
      importAsType: false,
    });

    ig.addImport({
      name: "Named2",
      asName: "RenamedNamed",
      isDefault: false,
      path: "module1",
      isAbsolute: true,
      importAsType: false,
    });

    ig.addImport({
      name: "Type1",
      asName: "RenamedType",
      isDefault: false,
      path: "module1",
      isAbsolute: true,
      importAsType: true,
    });

    const generatedLines = ig.generateLines();
    expect(generatedLines).toEqual([
      "import RenamedDefault, { Named1, Named2 as RenamedNamed, type Type1 as RenamedType } from 'module1';",
    ]);
  });
});

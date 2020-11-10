import ImportGenerator from './importGenerator';

describe('ImportGenerator', () => {
  it('should generate an import statement', () => {
    const ig = new ImportGenerator('/src');

    ig.addImport('func', true, '/src/lib/func');

    const generatedLines = ig.generateLines();
    expect(generatedLines).toEqual(["import func from './lib/func';"]);
  });

  it('should support various cases', () => {
    const ig = new ImportGenerator('/package/src');

    ig.addImport('defaultFunc', true, '/package/src/lib/defaultFunc');

    ig.addImport('namedFunc1', false, '/package/src/lib/namedFunc');
    ig.addImport('namedFunc2', false, '/package/src/lib/namedFunc');

    ig.addImport('pck', true, '/package/package.json');

    ig.addImport('sister', true, '/package/sister-src/sister');

    ig.addImport('defComb', true, '/package/src/comb');
    ig.addImport('defNamed1', false, '/package/src/comb');
    ig.addImport('defNamed2', false, '/package/src/comb');
    ig.addImport('defNamed3', false, '/package/src/comb');

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
    const ig = new ImportGenerator('./');

    ig.addImport('def', true, './pkg');
    ig.addImport('def', true, './pkg');

    ig.addImport('named1', false, './pkg');
    ig.addImport('named2', false, './pkg');
    ig.addImport('named1', false, './pkg');

    const generatedLines = ig.generateLines();
    expect(generatedLines).toEqual([
      "import def, { named1, named2 } from './pkg';",
    ]);
  });

  it('should complain about multiple (different) default imports', () => {
    const ig = new ImportGenerator('./');

    ig.addImport('def', true, './pkg');

    expect(() => ig.addImport('def2', true, './pkg')).toThrow(
      "Multiple default imports attempted: def and def2 from './pkg'"
    );
  });
});

import { GenericDeclaration, PreRenderHook, TypeImport } from 'kanel';
import { join } from 'path';

const generateMigrationCheck: PreRenderHook = async (
  outputAcc,
  instantiatedConfig
) => {
  const sourceMigration = 'source!';

  const typeImports: TypeImport[] = [
    {
      name: 'knex',
      isDefault: false,
      path: 'knex',
      isAbsolute: true,
    },
  ];

  const lines = [
    '/** This is the migration that was set when the types were generated. */',
    `export const sourceMigration = ${sourceMigration};`,
    '',
    '/** Gets the migration in the live database */',
    'export const getCurrentMigration = async (knex: knex): Promise<string> => {',
    '  const [{ name }] = await knex',
    "    .select('name')",
    "    .from('knex_migrations')",
    "    .orderBy('migration_time', 'DESC')",
    '    .limit(1);',
    '  return name;',
    '};',
    '',
    'export const validateMigration = async (knex: knex): Promise<void> => {',
    '  const currentMigration = await getCurrentMigration(knex);',
    '  if (currentMigration !== sourceMigration) {',
    '    throw new Error(`Current migration is ${currentMigration}, but source migration is ${sourceMigration}`);',
    '  }',
    '};',
  ];

  const declaration: GenericDeclaration = {
    declarationType: 'generic',
    typeImports,
    lines,
  };

  const path = join(instantiatedConfig.outputPath, 'migration-check');

  return {
    ...outputAcc,
    [path]: { declarations: [declaration] },
  };
};

export default generateMigrationCheck;

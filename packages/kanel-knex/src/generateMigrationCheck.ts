import type { GenericDeclaration, PreRenderHook, TypeImport } from 'kanel';
import knex from 'knex';
import { join } from 'path';

const generateMigrationCheck: PreRenderHook = async (
  outputAcc,
  instantiatedConfig,
) => {
  const connection = instantiatedConfig.connection;
  const db = knex({ client: 'postgres', connection });

  const [{ name: sourceMigration }] = await db
    .select('name')
    .from('knex_migrations')
    .orderBy('migration_time', 'DESC')
    .limit(1);

  db.destroy();

  const typeImports: TypeImport[] = [
    {
      name: 'Knex',
      isDefault: false,
      path: 'knex',
      isAbsolute: true,
      importAsType: false,
    },
  ];

  const lines = [
    '/** This is the migration that was set when the types were generated. */',
    `export const sourceMigration = '${sourceMigration}';`,
    '',
    '/** Gets the migration in the live database */',
    'export const getCurrentMigration = async (knex: Knex): Promise<string> => {',
    '  const [{ name }] = await knex',
    "    .select('name')",
    "    .from('knex_migrations')",
    "    .orderBy('migration_time', 'DESC')",
    '    .limit(1);',
    '  return name;',
    '};',
    '',
    '/** Check that the migration in the live database matches the code */',
    'export const validateMigration = async (knex: Knex): Promise<void> => {',
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

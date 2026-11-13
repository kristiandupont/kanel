import type { GenericDeclaration, PgTsPreRenderHook, TypeImport } from "kanel";
import { useKanelContext } from "kanel";
import knex from "knex";
import { join } from "path";
import knexImport from "./knexImport";

const generateMigrationCheck: PgTsPreRenderHook = async (
  outputAcc,
  _context,
) => {
  const { config } = useKanelContext();

  const connection = config.connection;
  const db = knex({ client: "postgres", connection });

  // Order by `id`, not `migration_time`: one `migrate.latest()` run records
  // its migrations with timestamps that can be equal to the millisecond, and
  // the latest one is then picked at random. `id` is assigned in the order
  // migrations were applied.
  const [{ name: sourceMigration }] = await db
    .select("name")
    .from("knex_migrations")
    .orderBy("id", "DESC")
    .limit(1);

  await db.destroy();

  const typeImports: TypeImport[] = [knexImport];

  const lines = [
    "/** This is the migration that was set when the types were generated. */",
    `export const sourceMigration = '${sourceMigration}';`,
    "",
    "/** Gets the migration in the live database: the last one applied (highest",
    " * `id`; `migration_time` can tie within one migrate run). */",
    "export const getCurrentMigration = async (knex: Knex): Promise<string> => {",
    "  const [{ name }] = await knex",
    "    .select('name')",
    "    .from('knex_migrations')",
    "    .orderBy('id', 'DESC')",
    "    .limit(1);",
    "  return name;",
    "};",
    "",
    "/** Check that the migration in the live database matches the code */",
    "export const validateMigration = async (knex: Knex): Promise<void> => {",
    "  const currentMigration = await getCurrentMigration(knex);",
    "  if (currentMigration !== sourceMigration) {",
    "    throw new Error(`Current migration is ${currentMigration}, but source migration is ${sourceMigration}`);",
    "  }",
    "};",
  ];

  const declaration: GenericDeclaration = {
    declarationType: "generic",
    typeImports,
    lines,
  };

  const outputPath = config.outputPath ?? "";
  const path = join(outputPath, "migration-check");

  return {
    ...outputAcc,
    [path]: { fileType: "typescript", declarations: [declaration] },
  };
};

export default generateMigrationCheck;

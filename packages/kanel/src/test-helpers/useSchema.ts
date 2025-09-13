import type { Knex } from "knex";
import { afterEach, beforeEach } from "vitest";

const useSchema = (getKnex: () => Knex, schemaName: string): void => {
  beforeEach(async () => {
    const db = getKnex();
    await db.schema.createSchemaIfNotExists(schemaName);
  });

  afterEach(async () => {
    const db = getKnex();
    await db.schema.dropSchemaIfExists(schemaName, true);
  });
};

export default useSchema;

import knex, { type Knex } from "knex";
import { afterAll, beforeAll } from "vitest";

import usePostgresContainer from "./usePostgresContainer";

type Connection = {
  host: string;
  port: number;
  password: string;
  user: string;
  database: string;
};

const useTestKnex = (): readonly [
  () => Knex<any, any[]>,
  string,
  () => Connection,
] => {
  let knexInstance: Knex;
  const databaseName = `test_${Math.ceil(Math.random() * 1000)}`;
  let connection: Connection;

  const getContainer = usePostgresContainer();

  beforeAll(async () => {
    const container = getContainer();
    connection = {
      host: container.getHost(),
      port: container.getMappedPort(5432),
      password: "postgres",
      user: "postgres",
      database: "postgres",
    };

    const setupKnexInstance = knex({
      client: "postgres",
      connection,
    });
    await setupKnexInstance.raw("create database ??", [databaseName]);
    await setupKnexInstance.destroy();

    connection.database = databaseName;
    knexInstance = knex({
      client: "postgres",
      connection,
    });
  });

  afterAll(async () => {
    const container = getContainer();
    const connection = {
      host: container.getHost(),
      port: container.getMappedPort(5432),
      password: "postgres",
      user: "postgres",
    };

    const setupKnexInstance = knex({
      client: "postgres",
      connection: { ...connection, database: "postgres" },
    });

    setupKnexInstance
      .raw(`drop database ${databaseName} with (force)`)
      .then(() => setupKnexInstance.destroy());

    await knexInstance.destroy();
  });

  return [() => knexInstance, databaseName, () => connection] as const;
};

export default useTestKnex;

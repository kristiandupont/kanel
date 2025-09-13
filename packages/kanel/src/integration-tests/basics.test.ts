import { describe, expect, it, vi } from "vitest";

import processDatabase from "../processDatabase";
import useTestKnex from "../test-helpers/useTestKnex";
import useSchema from "../test-helpers/useSchema";

vi.mock("../writeFile", () => ({
  default: vi.fn(),
}));

import writeFile from "../writeFile";
const mockedWriteFile = vi.mocked(writeFile);

function getResults(): { [fullPath: string]: string[] } {
  return mockedWriteFile.mock.calls.reduce(
    (acc, [args]) => {
      acc[args.fullPath] = args.lines;
      return acc;
    },
    {} as Record<string, string[]>,
  );
}

describe("Basic integration tests", () => {
  const [getKnex, _, getConnection] = useTestKnex();
  useSchema(getKnex, "test");

  it("should process a simple table", async () => {
    const db = getKnex();
    await db.raw("create table test.some_table (id integer)");

    await processDatabase({ connection: getConnection() });

    const result = getResults();
    expect(result).toMatchSnapshot();
  });

  // Database with a couple of tables with FK relations, enums, views, etc.
  it("should process the fundamentals", async () => {
    const db = getKnex();
    const sql = `
      create table test.some_table (id integer);
      create table test.some_other_table (id integer primary key);
      alter table test.some_table add column some_other_table_id integer references test.some_other_table (id);
      create type test.some_enum as enum ('value1', 'value2');
      create view test.some_view as select * from test.some_table;
      create materialized view test.some_materialized_view as select * from test.some_table;
      create type test.some_range as range (subtype = test.some_enum);
      create domain test.some_domain as text;
      create function test.some_function() returns void language sql as $$ $$;
      create procedure test.some_procedure() language sql as $$ $$;
    `;
    await db.raw(sql);

    await processDatabase({ connection: getConnection() });

    const result = getResults();
    expect(result).toMatchSnapshot();
  });
});

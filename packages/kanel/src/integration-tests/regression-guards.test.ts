import { describe, expect, test, vi } from "vitest";

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

describe("Regression guards", () => {
  const [getKnex, _, getConnection] = useTestKnex();
  useSchema(getKnex, "test");

  // Issue #716: Circular foreign key references with different column sets
  test("#716: it should handle circular foreign key references between tables", async () => {
    const db = getKnex();
    const sql = `
      create table test.threads(
        id INT PRIMARY KEY,
        last_msg_id varchar,
        b_org_id INT,
        b_id INT,
        metadata JSONB
      );
      create table test.msgs(
        id varchar,
        thread_id INT REFERENCES test.threads(id),
        PRIMARY KEY (thread_id, id)
      );

      alter table test.threads
        add constraint fk_last_msg
          foreign key (id, last_msg_id)
          references test.msgs(thread_id, id)
          deferrable initially deferred;
    `;
    await db.raw(sql);

    await processDatabase({ connection: getConnection() });

    const result = getResults();

    // Specific assertions for the circular FK issue
    const msgsFile = result["test/Msgs.ts"];
    const threadsFile = result["test/Threads.ts"];

    expect(msgsFile).toBeDefined();
    expect(threadsFile).toBeDefined();

    // Check that files were generated without crashing
    expect(msgsFile.length).toBeGreaterThan(0);
    expect(threadsFile.length).toBeGreaterThan(0);

    // Check that ThreadsId is defined in Threads.ts
    const threadsIdDef = threadsFile.find((line) =>
      line.includes("export type ThreadsId"),
    );
    expect(threadsIdDef).toBeDefined();
    expect(threadsIdDef).toMatch(
      /export type ThreadsId = .+ & \{ __brand: 'test\.threads' \}/,
    );

    // Check that ThreadsId doesn't reference itself recursively
    expect(threadsIdDef).not.toMatch(/ThreadsId = ThreadsId &/);

    // Check that MsgsId is defined in Msgs.ts
    const msgsIdDef = msgsFile.find((line) =>
      line.includes("export type MsgsId"),
    );
    expect(msgsIdDef).toBeDefined();
    expect(msgsIdDef).toMatch(
      /export type MsgsId = .+ & \{ __brand: 'test\.msgs' \}/,
    );

    // Check that MsgsId doesn't reference itself recursively
    expect(msgsIdDef).not.toMatch(/MsgsId = MsgsId &/);

    // Check that msgs.thread_id uses MsgsThreadId (branded identifier type)
    // Since thread_id is part of the composite PK, it gets its own identifier type
    const msgsInterface = msgsFile.slice(
      msgsFile.findIndex((line) =>
        line.includes("export default interface Msgs"),
      ),
      msgsFile.findIndex((line) =>
        line.includes("export default interface Msgs"),
      ) + 10,
    );
    expect(
      msgsInterface.some((line) => line.includes("thread_id: MsgsThreadId")),
    ).toBe(true);

    // Check that MsgsThreadId is defined and based on ThreadsId
    const msgsThreadIdDef = msgsFile.find((line) =>
      line.includes("export type MsgsThreadId"),
    );
    expect(msgsThreadIdDef).toBeDefined();
    expect(msgsThreadIdDef).toMatch(
      /export type MsgsThreadId = ThreadsId & \{ __brand: 'test\.msgs' \}/,
    );

    // Check that ThreadsId import exists in Msgs.ts
    expect(
      msgsFile.some((line) =>
        line.includes("import type { ThreadsId } from './Threads'"),
      ),
    ).toBe(true);

    expect(result).toMatchSnapshot();
  });
});

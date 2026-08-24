import { beforeEach, describe, expect, it, vi } from "vitest";

import crossSchemaViews from "../mocks/crossSchemaViews";
import processDatabase from "../processDatabase";

vi.mock("extract-pg-schema", () => ({ extractSchemas: vi.fn() }));
vi.mock("../writeFile", () => ({ default: vi.fn() }));

import { extractSchemas } from "extract-pg-schema";
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

/**
 * Runs the real generator pipeline over a static schema fixture, so the
 * rendered output can be asserted without a database. See
 * `mocks/crossSchemaViews.ts` for the shape being modelled.
 */
describe("Generating from same-named views across schemas", () => {
  beforeEach(async () => {
    mockedWriteFile.mockClear();
    vi.mocked(extractSchemas).mockResolvedValue(crossSchemaViews as any);

    await processDatabase({
      connection: {},
      outputPath: "./models",
      preDeleteOutputFolder: false,
      resolveViews: true,
    });
  });

  it("carries nullability from the originating table through both views", () => {
    const result = getResults();
    expect(result["models/api/Accounts.ts"]).toEqual(
      expect.arrayContaining([
        "  required_name: string;",
        "  optional_name: string | null;",
      ]),
    );
  });

  it("keeps resolving through a further hop inside the same schema", () => {
    const result = getResults();
    expect(result["models/api/AccountsDetails.ts"]).toEqual(
      expect.arrayContaining([
        "  id: public_AccountRecordsId;",
        "  required_name: string;",
        "  optional_name: string | null;",
      ]),
    );
  });

  it("skips a same-named relation that does not carry the column", () => {
    const result = getResults();
    expect(result["models/api/AccountSecrets.ts"]).toEqual(
      expect.arrayContaining(["  secret: string | null;"]),
    );
  });

  it("keeps its own nullability when the origin reports none", () => {
    const result = getResults();
    expect(result["models/api/Ledger.ts"]).toEqual(
      expect.arrayContaining([
        "  memo: string | null;",
        "  note: string | null;",
      ]),
    );
  });

  it("resolves the identifier type through both views", () => {
    const result = getResults();
    expect(result["models/api/Accounts.ts"]).toEqual(
      expect.arrayContaining([
        "  id: public_AccountRecordsId;",
        "import type { AccountRecordsId as public_AccountRecordsId } from '../public/AccountRecords';",
      ]),
    );
  });
});

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

describe("Tagged comments integration tests", () => {
  const [getKnex, _, getConnection] = useTestKnex();
  useSchema(getKnex, "test");

  it("should skip generating domain with @type tag", async () => {
    const db = getKnex();
    await db.raw(`
      create domain test.email_domain as text;
      comment on domain test.email_domain is '@type:EmailString';
    `);

    await processDatabase({ connection: getConnection() });

    const result = getResults();

    // Should not generate a file for the domain
    const domainFile = Object.keys(result).find((path) =>
      path.includes("EmailDomain"),
    );
    expect(domainFile).toBeUndefined();
  });

  it("should skip generating range with @type tag", async () => {
    const db = getKnex();
    await db.raw(`
      create type test.some_range as range (subtype = int4);
      comment on type test.some_range is '@type:string';
    `);

    await processDatabase({ connection: getConnection() });

    const result = getResults();

    // Should not generate a file for the range
    const rangeFile = Object.keys(result).find((path) =>
      path.includes("SomeRange"),
    );
    expect(rangeFile).toBeUndefined();
  });

  it("should skip generating enum with @type tag", async () => {
    const db = getKnex();
    await db.raw(`
      create type test.some_enum as enum ('value1', 'value2');
      comment on type test.some_enum is '@type:CustomEnumType';
    `);

    await processDatabase({ connection: getConnection() });

    const result = getResults();

    // Should not generate a file for the enum
    const enumFile = Object.keys(result).find((path) =>
      path.includes("SomeEnum"),
    );
    expect(enumFile).toBeUndefined();
  });

  it("should skip generating composite type with @type tag", async () => {
    const db = getKnex();
    await db.raw(`
      create type test.some_composite as (field1 text, field2 integer);
      comment on type test.some_composite is '@type:CustomCompositeType';
    `);

    await processDatabase({ connection: getConnection() });

    const result = getResults();

    // Should not generate a file for the composite type
    const compositeFile = Object.keys(result).find((path) =>
      path.includes("SomeComposite"),
    );
    expect(compositeFile).toBeUndefined();
  });

  it("should use tagged type on column with @type tag", async () => {
    const db = getKnex();
    await db.raw(`
      create table test.users (
        id integer primary key,
        email text
      );
      comment on column test.users.email is '@type:EmailString Email address for the user';
    `);

    await processDatabase({ connection: getConnection() });

    const result = getResults();

    // Find the users table file
    const usersFile = Object.keys(result).find((path) =>
      path.includes("Users.ts"),
    );
    expect(usersFile).toBeDefined();

    const fileContent = result[usersFile!].join("\n");

    // Should use EmailString as the type
    expect(fileContent).toContain("email: EmailString");

    // Comment should be preserved without the @type tag
    expect(fileContent).toContain("Email address for the user");
  });

  it("should use tagged type with imports on column", async () => {
    const db = getKnex();
    await db.raw(`
      create table test.users (
        id integer primary key,
        email text
      );
      comment on column test.users.email is '@type(EmailString, "./types/EmailString", false, true) Email address';
    `);

    await processDatabase({ connection: getConnection() });

    const result = getResults();

    const usersFile = Object.keys(result).find((path) =>
      path.includes("Users.ts"),
    );
    expect(usersFile).toBeDefined();

    const fileContent = result[usersFile!].join("\n");

    // Should import and use EmailString
    expect(fileContent).toContain("email: EmailString");
    expect(fileContent).toContain("./types/EmailString");
  });

  it("should use tagged type on domain and reference it correctly", async () => {
    const db = getKnex();
    await db.raw(`
      create domain test.email_domain as text;
      comment on domain test.email_domain is '@type:EmailString';

      create table test.users (
        id integer primary key,
        email test.email_domain
      );
    `);

    await processDatabase({ connection: getConnection() });

    const result = getResults();

    // Domain file should not be generated
    const domainFile = Object.keys(result).find((path) =>
      path.includes("EmailDomain"),
    );
    expect(domainFile).toBeUndefined();

    // Users table should use the tagged type
    const usersFile = Object.keys(result).find((path) =>
      path.includes("Users.ts"),
    );
    expect(usersFile).toBeDefined();

    const fileContent = result[usersFile!].join("\n");
    expect(fileContent).toContain("email: EmailString");
  });

  it("should generate domain without @type tag normally", async () => {
    const db = getKnex();
    await db.raw(`
      create domain test.email_domain as text;
      comment on domain test.email_domain is 'A domain for email addresses';
    `);

    await processDatabase({ connection: getConnection() });

    const result = getResults();

    // Should generate a file for the domain
    const domainFile = Object.keys(result).find((path) =>
      path.includes("EmailDomain"),
    );
    expect(domainFile).toBeDefined();

    const fileContent = result[domainFile!].join("\n");
    expect(fileContent).toContain("type EmailDomain = string");
  });
});

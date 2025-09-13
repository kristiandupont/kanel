import { describe, expect, it, vi } from "vitest";
import { recase } from "@kristiandupont/recase";
import { tryParse } from "tagged-comment-parser";
import { join } from "path";

import type { Config } from "../config-types";
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

const outputPath = "./example/models";
const toPascalCase = recase("snake", "pascal");

const config: Partial<Config> = {
  outputPath,
  resolveViews: true,
  preDeleteOutputFolder: false,

  // Add a comment about the entity that the type represents above each type.
  getMetadata: (details, generateFor) => {
    const { comment: strippedComment } = tryParse(details.comment);
    const isAgentNoun = ["initializer", "mutator"].includes(generateFor);

    const relationComment = isAgentNoun
      ? `Represents the ${generateFor} for the ${details.kind} ${details.schemaName}.${details.name}`
      : `Represents the ${details.kind} ${details.schemaName}.${details.name}`;

    const suffix = isAgentNoun ? `_${generateFor}` : "";

    return {
      name: toPascalCase(details.name + suffix),
      comment: [relationComment, ...(strippedComment ? [strippedComment] : [])],
      path: join(outputPath, toPascalCase(details.name)),
    };
  },

  // Add a comment that says what the type of the column/attribute is in the database.
  getPropertyMetadata: (property, _details, generateFor) => {
    const { comment: strippedComment } = tryParse(property.comment);

    return {
      name: property.name,
      comment: [
        `Database type: ${property.expandedType}`,
        ...(generateFor === "initializer" && property.defaultValue
          ? [`Default value: ${property.defaultValue}`]
          : []),
        ...(strippedComment ? [strippedComment] : []),
      ],
    };
  },

  getRoutineMetadata: (details, _instantiatedConfig) => ({
    parametersName: `${details.name}_params`,
    parameters: details.parameters.map(({ name }) => ({
      name,
      comment: [],
    })),
    returnTypeName: `${details.name}_return_type`,
    returnTypeComment: [`Return type for ${details.name}`],
    path: join(outputPath, details.name),
  }),

  // This implementation will generate flavored instead of branded types.
  // See: https://spin.atomicobject.com/2018/01/15/typescript-flexible-nominal-typing/
  generateIdentifierType: (c, d) => {
    // Id columns are already prefixed with the table name, so we don't need to add it here
    const name = toPascalCase(c.name);

    return {
      declarationType: "typeDeclaration",
      name,
      exportAs: "named",
      typeDefinition: [`number & { __flavor?: '${name}' }`],
      comment: [`Identifier type for ${d.name}`],
    };
  },

  customTypeMap: {
    // A text search vector could be stored as a set of strings. See Film.ts for an example.
    "pg_catalog.tsvector": "Set<string>",

    // The bytea package (https://www.npmjs.com/package/postgres-bytea) could be used for byte arrays.
    // See Staff.ts for an example.
    "pg_catalog.bytea": {
      name: "bytea",
      typeImports: [
        {
          name: "bytea",
          path: "postgres-bytea",
          isAbsolute: true,
          isDefault: true,
          importAsType: false,
        },
      ],
    },

    // If you want to use BigInt for bigserial columns, you can use the following.
    "pg_catalog.int8": "BigInt",

    // Columns with the following types would probably just be strings in TypeScript.
    "pg_catalog.bpchar": "string",
    "public.citext": "string",
  },
};

describe("Integration tests for various configurations", () => {
  const [getKnex, _, getConnection] = useTestKnex();
  useSchema(getKnex, "test");

  it("should respect the configuration", async () => {
    const db = getKnex();
    const sql = `
      -- Enable extensions
      create extension if not exists citext;
      
      -- Basic tables with relationships
      create table test.some_table (id integer);
      create table test.some_other_table (id integer primary key);
      alter table test.some_table add column some_other_table_id integer references test.some_other_table (id);
      
      -- Custom types
      create type test.some_enum as enum ('value1', 'value2');
      create type test.some_range as range (subtype = test.some_enum);
      create domain test.some_domain as text;
      create type test.some_composite as (name text, value integer);
      
      -- Table with custom type columns (testing customTypeMap)
      create table test.custom_types_table (
        id serial primary key,
        search_vector tsvector,
        binary_data bytea,
        big_number bigint,
        fixed_char char(10),
        case_insensitive_text citext,
        enum_column test.some_enum,
        domain_column test.some_domain,
        range_column test.some_range,
        composite_column test.some_composite,
        text_array text[],
        enum_array test.some_enum[],
        int_array integer[],
        created_at timestamp with time zone default now(),
        updated_at timestamp with time zone default current_timestamp,
        is_active boolean default true,
        priority integer default 0
      );
      
      -- Table with complex relationships
      create table test.complex_table (
        id serial primary key,
        custom_types_id integer references test.custom_types_table (id),
        some_other_table_id integer references test.some_other_table (id),
        name varchar(255) not null,
        description text,
        metadata jsonb,
        tags text[] default '{}',
        created_at timestamp with time zone default now()
      );
      
      -- Views
      create view test.some_view as select * from test.some_table;
      create materialized view test.some_materialized_view as select * from test.some_table;
      
      -- Functions and procedures
      create function test.some_function() returns void language sql as $$ $$;
      create procedure test.some_procedure() language sql as $$ $$;
    `;
    await db.raw(sql);

    await processDatabase({
      connection: getConnection(),
      ...config,
    });

    expect(getResults()).toMatchSnapshot();
  });
});

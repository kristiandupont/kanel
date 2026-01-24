import { describe, expect, it, vi } from "vitest";
import { recase } from "@kristiandupont/recase";
import { join } from "path";

import type { Config, InstantiatedConfig } from "../config-types";
import processDatabase from "../processDatabase";
import useTestKnex from "../test-helpers/useTestKnex";
import useSchema from "../test-helpers/useSchema";

vi.mock("../writeFile", () => ({ default: vi.fn() }));

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

const toPascalCase = recase("snake", "pascal");
const outputPath = "./example/v3-compat";

/**
 * V3 Compatibility Test Suite
 *
 * This test suite validates that V3 config behavior continues to work correctly.
 * These tests serve as a safety net during the V4 refactoring to ensure backwards
 * compatibility is maintained.
 *
 * All tests in this file use V3 config format (without a `generators` field).
 */
describe("V3 Config Compatibility", () => {
  const [getKnex, _, getConnection] = useTestKnex();
  useSchema(getKnex, "v3test");

  describe("Metadata Functions", () => {
    it("should call getMetadata with correct parameters", async () => {
      const db = getKnex();
      await db.raw(`
        create table v3test.users (
          id serial primary key,
          name text not null
        );
      `);

      const getMetadataSpy = vi.fn((details, generateFor, instantiatedConfig) => {
        // Verify parameters are passed correctly
        expect(details).toHaveProperty("name");
        expect(details).toHaveProperty("schemaName", "v3test");
        expect(instantiatedConfig).toHaveProperty("schemas");
        expect(instantiatedConfig).toHaveProperty("typeMap");

        return {
          name: toPascalCase(details.name),
          comment: [`Generated for ${generateFor || "type"}`],
          path: join(outputPath, toPascalCase(details.name)),
        };
      });

      const config: Config = {
        connection: getConnection(),
        outputPath,
        getMetadata: getMetadataSpy,
      };

      await processDatabase(config);

      // Verify getMetadata was called
      expect(getMetadataSpy).toHaveBeenCalled();

      // Verify it was called with instantiatedConfig as third parameter
      const calls = getMetadataSpy.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      expect(calls[0][2]).toHaveProperty("schemas");
    });

    it("should call getPropertyMetadata with correct parameters", async () => {
      const db = getKnex();
      await db.raw(`
        create table v3test.products (
          id serial primary key,
          name text not null,
          price numeric(10,2)
        );
      `);

      const getPropertyMetadataSpy = vi.fn(
        (property, details, generateFor, instantiatedConfig) => {
          expect(property).toHaveProperty("name");
          expect(details).toHaveProperty("name", "products");
          expect(generateFor).toBeDefined();
          expect(instantiatedConfig).toHaveProperty("schemas");

          return {
            name: property.name,
            comment: [`Property ${property.name}`],
          };
        },
      );

      const config: Config = {
        connection: getConnection(),
        outputPath,
        getPropertyMetadata: getPropertyMetadataSpy,
      };

      await processDatabase(config);

      expect(getPropertyMetadataSpy).toHaveBeenCalled();
      const calls = getPropertyMetadataSpy.mock.calls;
      expect(calls[0][3]).toHaveProperty("schemas");
    });

    it("should call generateIdentifierType with correct parameters", async () => {
      const db = getKnex();
      await db.raw(`
        create table v3test.orders (
          id serial primary key
        );
      `);

      const generateIdentifierTypeSpy = vi.fn((property, details, instantiatedConfig) => {
        expect(property).toHaveProperty("name", "id");
        expect(details).toHaveProperty("name", "orders");
        expect(instantiatedConfig).toHaveProperty("schemas");

        return {
          declarationType: "typeDeclaration" as const,
          name: `${toPascalCase(details.name)}Id`,
          exportAs: "named" as const,
          typeDefinition: ["number"],
          comment: [],
        };
      });

      const config: Config = {
        connection: getConnection(),
        outputPath,
        generateIdentifierType: generateIdentifierTypeSpy,
      };

      await processDatabase(config);

      expect(generateIdentifierTypeSpy).toHaveBeenCalled();
    });

    it("should call getRoutineMetadata with correct parameters", async () => {
      const db = getKnex();
      await db.raw(`
        create function v3test.calculate_total(amount numeric)
        returns numeric
        language sql
        as $$ select amount * 1.1; $$;
      `);

      const getRoutineMetadataSpy = vi.fn((details, instantiatedConfig) => {
        expect(details).toHaveProperty("name", "calculate_total");
        expect(instantiatedConfig).toHaveProperty("schemas");

        return {
          parametersName: `${details.name}_params`,
          parameters: details.parameters.map((p) => ({
            name: p.name,
            comment: [],
          })),
          returnTypeName: `${details.name}_return`,
          returnTypeComment: [],
          path: join(outputPath, details.name),
        };
      });

      const config: Config = {
        connection: getConnection(),
        outputPath,
        getRoutineMetadata: getRoutineMetadataSpy,
      };

      await processDatabase(config);

      expect(getRoutineMetadataSpy).toHaveBeenCalled();
    });

    it("should respect propertySortFunction", async () => {
      const db = getKnex();
      await db.raw(`
        create table v3test.sorted_table (
          zzz text,
          aaa text,
          mmm text
        );
      `);

      const config: Config = {
        connection: getConnection(),
        outputPath,
        // Sort properties alphabetically
        propertySortFunction: (a, b) => a.name.localeCompare(b.name),
      };

      await processDatabase(config);

      const results = getResults();
      const tableFile = Object.keys(results).find((p) =>
        p.includes("SortedTable"),
      );
      expect(tableFile).toBeDefined();

      const content = results[tableFile!].join("\n");

      // Verify properties appear in sorted order
      const aaaIndex = content.indexOf("aaa:");
      const mmmIndex = content.indexOf("mmm:");
      const zzzIndex = content.indexOf("zzz:");

      expect(aaaIndex).toBeLessThan(mmmIndex);
      expect(mmmIndex).toBeLessThan(zzzIndex);
    });
  });

  describe("Hooks", () => {
    it("should call preRenderHooks with instantiatedConfig", async () => {
      const db = getKnex();
      await db.raw(`
        create table v3test.hook_test (id integer);
      `);

      const preRenderHookSpy = vi.fn((output, instantiatedConfig) => {
        // Output paths are generated based on the schema
        expect(Object.keys(output).length).toBeGreaterThan(0);
        expect(instantiatedConfig).toHaveProperty("schemas");
        expect(instantiatedConfig).toHaveProperty("typeMap");
        return output;
      });

      const config: Config = {
        connection: getConnection(),
        outputPath: ".",
        preRenderHooks: [preRenderHookSpy],
      };

      await processDatabase(config);

      expect(preRenderHookSpy).toHaveBeenCalled();
      expect(preRenderHookSpy.mock.calls[0][1]).toHaveProperty("schemas");
    });

    it("should call postRenderHooks with instantiatedConfig", async () => {
      const db = getKnex();
      await db.raw(`
        create table v3test.post_hook_test (id integer);
      `);

      const postRenderHookSpy = vi.fn((path, lines, instantiatedConfig) => {
        expect(typeof path).toBe("string");
        expect(Array.isArray(lines)).toBe(true);
        expect(instantiatedConfig).toHaveProperty("schemas");
        return lines;
      });

      const config: Config = {
        connection: getConnection(),
        outputPath: ".",
        postRenderHooks: [postRenderHookSpy],
      };

      await processDatabase(config);

      expect(postRenderHookSpy).toHaveBeenCalled();
    });

    it("should apply applyTaggedComments hook by default", async () => {
      const db = getKnex();
      await db.raw(`
        create domain v3test.email as text;
        comment on domain v3test.email is '@type:EmailString An email address';

        create table v3test.users_with_email (
          id integer primary key,
          email v3test.email
        );
      `);

      const config: Config = {
        connection: getConnection(),
        outputPath: ".",
      };

      await processDatabase(config);

      const results = getResults();

      // Domain file should not exist (removed by applyTaggedComments)
      // The domain is named "email", which becomes "Email" in pascal case
      const emailDomain = Object.keys(results).find((p) =>
        p.includes("v3test/Email.ts") && !p.includes("UsersWithEmail")
      );
      expect(emailDomain).toBeUndefined();

      // Users table should use EmailString type
      const usersFile = Object.keys(results).find((p) =>
        p.includes("UsersWithEmail"),
      );
      expect(usersFile).toBeDefined();

      const content = results[usersFile!].join("\n");
      expect(content).toContain("EmailString");
    });

    it("should apply markAsGenerated hook by default", async () => {
      const db = getKnex();
      await db.raw(`
        create table v3test.generated_marker (id integer);
      `);

      const config: Config = {
        connection: getConnection(),
        outputPath: ".",
      };

      await processDatabase(config);

      const results = getResults();
      const file = Object.keys(results).find((p) =>
        p.includes("GeneratedMarker"),
      );
      expect(file).toBeDefined();

      const content = results[file!].join("\n");
      // Should contain the @generated marker
      expect(content).toContain("@generated");
    });

    it("should allow overriding postRenderHooks to exclude markAsGenerated", async () => {
      const db = getKnex();
      await db.raw(`
        create table v3test.no_marker (id integer);
      `);

      const config: Config = {
        connection: getConnection(),
        outputPath: ".",
        postRenderHooks: [], // Explicitly empty
      };

      await processDatabase(config);

      const results = getResults();
      const file = Object.keys(results).find((p) => p.includes("NoMarker"));
      expect(file).toBeDefined();

      const content = results[file!].join("\n");
      // Should NOT contain the @generated marker
      expect(content).not.toContain("@generated");
    });
  });

  describe("Defaults", () => {
    it("should default enumStyle to 'enum'", async () => {
      const db = getKnex();
      await db.raw(`
        create type v3test.status as enum ('active', 'inactive', 'pending');
      `);

      const config: Config = {
        connection: getConnection(),
        outputPath: ".",
        // Don't specify enumStyle - should default to 'enum'
      };

      await processDatabase(config);

      const results = getResults();
      const enumFile = Object.keys(results).find((p) => p.includes("Status"));
      expect(enumFile).toBeDefined();

      const content = results[enumFile!].join("\n");
      // Should generate as enum, not type (default export is also valid)
      expect(content).toMatch(/enum\s+Status/);
    });

    it("should respect explicit enumStyle: 'type'", async () => {
      const db = getKnex();
      await db.raw(`
        create type v3test.priority as enum ('low', 'medium', 'high');
      `);

      const config: Config = {
        connection: getConnection(),
        outputPath: ".",
        enumStyle: "type",
      };

      await processDatabase(config);

      const results = getResults();
      const enumFile = Object.keys(results).find((p) => p.includes("Priority"));
      expect(enumFile).toBeDefined();

      const content = results[enumFile!].join("\n");
      // Should generate as type, not enum
      expect(content).toMatch(/type\s+Priority\s*=/);
      expect(content).not.toMatch(/enum\s+Priority/);
    });

    it("should default outputPath to '.'", async () => {
      const db = getKnex();
      await db.raw(`
        create table v3test.default_output (id integer);
      `);

      const config: Config = {
        connection: getConnection(),
        // Don't specify outputPath
      };

      await processDatabase(config);

      const results = getResults();
      const files = Object.keys(results);

      // Files should be in the default output path "."
      // Table name is "default_output" which becomes "DefaultOutput" in pascal case
      const hasDefaultPath = files.some((f) => f.includes("DefaultOutput"));
      expect(hasDefaultPath).toBe(true);
    });
  });

  describe("Custom Type Map", () => {
    it("should respect customTypeMap for type mapping", async () => {
      const db = getKnex();
      await db.raw(`
        create table v3test.custom_types (
          id serial primary key,
          data bytea,
          big_num bigint
        );
      `);

      const config: Config = {
        connection: getConnection(),
        outputPath: ".",
        customTypeMap: {
          "pg_catalog.bytea": "Buffer",
          "pg_catalog.int8": "bigint",
        },
      };

      await processDatabase(config);

      const results = getResults();
      const file = Object.keys(results).find((p) => p.includes("CustomTypes"));
      expect(file).toBeDefined();

      const content = results[file!].join("\n");
      expect(content).toContain("data: Buffer");
      expect(content).toContain("big_num: bigint");
    });

    it("should handle customTypeMap with imports", async () => {
      const db = getKnex();
      await db.raw(`
        create table v3test.imported_types (
          id serial primary key,
          special_field text
        );
      `);

      const config: Config = {
        connection: getConnection(),
        outputPath: ".",
        customTypeMap: {
          "pg_catalog.text": {
            name: "SpecialString",
            typeImports: [
              {
                name: "SpecialString",
                path: "./special-types",
                isAbsolute: false,
                isDefault: false,
                importAsType: true,
              },
            ],
          },
        },
      };

      await processDatabase(config);

      const results = getResults();
      const file = Object.keys(results).find((p) => p.includes("ImportedTypes"));
      expect(file).toBeDefined();

      const content = results[file!].join("\n");
      expect(content).toContain("SpecialString");
      expect(content).toContain("./special-types");
    });
  });

  describe("Integration: Complex V3 Config", () => {
    it("should handle a realistic V3 config with all features", async () => {
      const db = getKnex();
      await db.raw(`
        create type v3test.user_role as enum ('admin', 'user', 'guest');

        create table v3test.complex_users (
          id serial primary key,
          username text not null,
          role v3test.user_role not null,
          metadata jsonb,
          created_at timestamptz default now()
        );

        create function v3test.get_user(user_id integer)
        returns v3test.complex_users
        language sql
        as $$ select * from v3test.complex_users where id = user_id; $$;
      `);

      const config: Config = {
        connection: getConnection(),
        outputPath,
        enumStyle: "enum",
        resolveViews: true,

        getMetadata: (details, generateFor, instantiatedConfig) => {
          expect(instantiatedConfig).toBeDefined();
          return {
            name: toPascalCase(details.name),
            comment: [`${details.kind} ${details.name}`],
            path: join(outputPath, toPascalCase(details.name)),
          };
        },

        getPropertyMetadata: (property, _details, _generateFor, instantiatedConfig) => {
          expect(instantiatedConfig).toBeDefined();
          return {
            name: property.name,
            comment: [`DB: ${property.expandedType}`],
          };
        },

        getRoutineMetadata: (details, instantiatedConfig) => {
          expect(instantiatedConfig).toBeDefined();
          return {
            parametersName: `${details.name}_params`,
            parameters: details.parameters.map((p) => ({
              name: p.name,
              comment: [],
            })),
            returnTypeName: `${details.name}_result`,
            returnTypeComment: [],
            path: join(outputPath, details.name),
          };
        },

        customTypeMap: {
          "pg_catalog.jsonb": "Record<string, unknown>",
        },

        preRenderHooks: [
          (output, instantiatedConfig) => {
            expect(instantiatedConfig).toBeDefined();
            expect(instantiatedConfig.schemas).toBeDefined();
            return output;
          },
        ],
      };

      await processDatabase(config);

      const results = getResults();

      // Verify enum was generated
      const enumFile = Object.keys(results).find((p) => p.includes("UserRole"));
      expect(enumFile).toBeDefined();

      // Verify table was generated
      const tableFile = Object.keys(results).find((p) =>
        p.includes("ComplexUsers"),
      );
      expect(tableFile).toBeDefined();

      // Verify function was generated
      const functionFile = Object.keys(results).find((p) =>
        p.includes("get_user"),
      );
      expect(functionFile).toBeDefined();

      const tableContent = results[tableFile!].join("\n");
      expect(tableContent).toContain("metadata: Record<string, unknown>");
    });
  });
});

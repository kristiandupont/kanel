/**
 * V4 Config Integration Tests
 *
 * These tests verify that the new V4 configuration format works correctly,
 * including the composable metadata pattern and generator architecture.
 */

import { describe, it, expect, vi } from "vitest";
import type { ConfigV4 } from "../config-types-v4";
import { makePgTsGenerator } from "../generators/makePgTsGenerator";
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

describe("V4 Config", () => {
  const [getKnex, _, getConnection] = useTestKnex();
  useSchema(getKnex, "v4test");
  describe("Basic V4 Config", () => {
    it("should work with minimal V4 config using generator", async () => {
      const db = getKnex();
      await db.raw(`
        create table v4test.users (
          id serial primary key,
          name text not null
        );
      `);

      const generatorCalls: string[] = [];

      const config: ConfigV4 = {
        connection: getConnection(),
        schemaNames: ["v4test"],
        typescriptConfig: {
          enumStyle: "enum",
        },
        generators: [
          async () => {
            generatorCalls.push("gen1");
            // Return a simple output
            return {
              "test.ts": {
                fileType: "typescript" as const,
                declarations: [],
              },
            };
          },
        ],
      };

      await processDatabase(config);

      // Should have called the generator
      expect(generatorCalls).toContain("gen1");
    });

    it("should use literal enum style from typescriptConfig", async () => {
      const db = getKnex();
      await db.raw(`
        create type v4test.status as enum ('active', 'inactive');
      `);

      const config: ConfigV4 = {
        connection: getConnection(),
        schemaNames: ["v4test"],
        typescriptConfig: {
          enumStyle: "literal-union",
        },
        generators: [makePgTsGenerator()],
      };

      await processDatabase(config);

      // Verify it generated files
      const results = getResults();
      expect(Object.keys(results).length).toBeGreaterThan(0);
    });
  });

  describe("Composable Metadata Functions", () => {
    it("should allow composing getMetadata with builtin", async () => {
      const db = getKnex();
      await db.raw(`
        create table v4test.products (
          id serial primary key,
          name text not null
        );
      `);

      const metadataCalls: string[] = [];

      const config: ConfigV4 = {
        connection: getConnection(),
        schemaNames: ["v4test"],
        typescriptConfig: {
          enumStyle: "enum",
        },
        generators: [
          makePgTsGenerator({
            getMetadata: (details, generateFor, builtinMetadata) => {
              metadataCalls.push(`${details.kind}:${generateFor}`);

              // Compose: use builtin but modify the comment
              return {
                ...builtinMetadata,
                comment: [
                  ...(builtinMetadata.comment || []),
                  "Enhanced with V4!",
                ],
              };
            },
          }),
        ],
      };

      await processDatabase(config);

      // Should have called getMetadata
      expect(metadataCalls.length).toBeGreaterThan(0);
    });

    it("should allow composing getPropertyMetadata with builtin", async () => {
      const db = getKnex();
      await db.raw(`
        create table v4test.actors (
          actor_id serial primary key,
          name text not null
        );
      `);

      const propertyCalls: string[] = [];

      const config: ConfigV4 = {
        connection: getConnection(),
        schemaNames: ["v4test"],
        typescriptConfig: {
          enumStyle: "enum",
        },
        generators: [
          makePgTsGenerator({
            getPropertyMetadata: (
              property,
              details,
              generateFor,
              builtinMetadata,
            ) => {
              propertyCalls.push(property.name);

              // Compose: use builtin but add custom logic
              if (property.name === "actor_id") {
                return {
                  ...builtinMetadata,
                  comment: [
                    ...(builtinMetadata.comment || []),
                    "Primary key actor ID",
                  ],
                };
              }

              return builtinMetadata;
            },
          }),
        ],
      };

      await processDatabase(config);

      // Should have called getPropertyMetadata
      expect(propertyCalls.length).toBeGreaterThan(0);
      expect(propertyCalls).toContain("actor_id");
    });
  });

  describe("Custom Type Map", () => {
    it("should respect customTypeMap in generator config", async () => {
      const db = getKnex();
      await db.raw(`
        create table v4test.items (
          id serial primary key,
          description text
        );
      `);

      const config: ConfigV4 = {
        connection: getConnection(),
        schemaNames: ["v4test"],
        typescriptConfig: {
          enumStyle: "enum",
        },
        generators: [
          makePgTsGenerator({
            customTypeMap: {
              "pg_catalog.text": "MyCustomString",
            },
          }),
        ],
      };

      await processDatabase(config);

      // Just verify it runs without error
    });
  });

  describe("Property Sorting", () => {
    it("should use custom propertySortFunction", async () => {
      const config: ConfigV4 = {
        connection: getConnection(),
        schemaNames: ["v4test"],
        typescriptConfig: {
          enumStyle: "enum",
        },
        generators: [
          makePgTsGenerator({
            propertySortFunction: (a, b) =>
              // Sort by name in reverse alphabetical order
              b.name.localeCompare(a.name),
          }),
        ],
      };

      await processDatabase(config);

      // Just verify it runs without error with custom sort function
    });
  });

  describe("Multiple Generators", () => {
    it("should support multiple generators in config", async () => {
      const db = getKnex();
      await db.raw(`
        create table v4test.categories (
          id serial primary key,
          name text not null
        );
      `);

      const generator1Calls: string[] = [];
      const generator2Calls: string[] = [];

      const config: ConfigV4 = {
        connection: getConnection(),
        schemaNames: ["v4test"],
        typescriptConfig: {
          enumStyle: "enum",
        },
        generators: [
          makePgTsGenerator({
            getMetadata: (details, generateFor, builtinMetadata) => {
              generator1Calls.push("gen1");
              return builtinMetadata;
            },
          }),
          // Second generator that could add additional files
          async () => {
            generator2Calls.push("gen2");
            return {
              "custom-file.ts": {
                fileType: "typescript" as const,
                declarations: [
                  {
                    declarationType: "typeDeclaration" as const,
                    name: "CustomType",
                    exportAs: "default" as const,
                    typeDefinition: ["string"],
                  },
                ],
              },
            };
          },
        ],
      };

      await processDatabase(config);

      // Both generators should have run
      expect(generator1Calls.length).toBeGreaterThan(0);
      expect(generator2Calls.length).toBeGreaterThan(0);
    });
  });

  describe("V4 Hooks", () => {
    it("should support V4 preRenderHooks", async () => {
      const hookCalls: string[] = [];

      const config: ConfigV4 = {
        connection: getConnection(),
        schemaNames: ["v4test"],
        typescriptConfig: {
          enumStyle: "enum",
        },
        generators: [makePgTsGenerator()],
        preRenderHooks: [
          async (output) => {
            hookCalls.push("preRender");
            return output;
          },
        ],
      };

      await processDatabase(config);

      expect(hookCalls).toContain("preRender");
    });

    it("should support V4 postRenderHooks", async () => {
      const db = getKnex();
      await db.raw(`
        create table v4test.reviews (
          id serial primary key,
          rating int not null
        );
      `);

      const hookCalls: string[] = [];

      const config: ConfigV4 = {
        connection: getConnection(),
        schemaNames: ["v4test"],
        typescriptConfig: {
          enumStyle: "enum",
        },
        generators: [makePgTsGenerator()],
        postRenderHooks: [
          async (path, lines) => {
            hookCalls.push("postRender");
            return lines;
          },
        ],
      };

      await processDatabase(config);

      expect(hookCalls).toContain("postRender");
    });
  });

  describe("Advanced Composition", () => {
    it("should allow full composition pattern with spreading builtin result", async () => {
      const config: ConfigV4 = {
        connection: getConnection(),
        schemaNames: ["v4test"],
        typescriptConfig: {
          enumStyle: "enum",
        },
        generators: [
          makePgTsGenerator({
            getMetadata: (details, generateFor, builtinMetadata) =>
              // Full composition: spread builtin, override specific fields
              ({
                ...builtinMetadata,
                name:
                  generateFor === "initializer"
                    ? `New${builtinMetadata.name}`
                    : builtinMetadata.name,
                comment: ["Custom header", ...(builtinMetadata.comment || [])],
              }),
            getPropertyMetadata: (
              property,
              details,
              generateFor,
              builtinMetadata,
            ) =>
              // Spread builtin, conditionally override
              ({
                ...builtinMetadata,
                comment:
                  property.name === "last_update"
                    ? ["Timestamp of last modification"]
                    : builtinMetadata.comment,
              }),
          }),
        ],
      };

      await processDatabase(config);

      // Just verify the composition pattern runs without error
    });
  });

  describe("Output Merging", () => {
    it("should merge TypeScript declarations from multiple generators to same file", async () => {
      const db = getKnex();
      await db.raw(`
        create table v4test.users (
          id serial primary key,
          name text not null
        );
      `);

      const config: ConfigV4 = {
        connection: getConnection(),
        schemaNames: ["v4test"],
        typescriptConfig: {
          enumStyle: "enum",
        },
        generators: [
          // Generator 1: Creates the base types
          makePgTsGenerator(),
          // Generator 2: Adds constants to the same file
          async () => ({
            "v4test/Users": {
              fileType: "typescript" as const,
              declarations: [
                {
                  declarationType: "constant" as const,
                  name: "USERS_TABLE_NAME",
                  type: "string",
                  value: '"users"',
                  exportAs: "named" as const,
                },
              ],
            },
          }),
        ],
      };

      await processDatabase(config);

      const results = getResults();
      const usersFile = results["v4test/Users.ts"];

      expect(usersFile).toBeDefined();
      // Should contain both the interface from PgTsGenerator and the constant from second generator
      const content = usersFile.join("\n");
      expect(content).toContain("interface Users");
      expect(content).toContain("USERS_TABLE_NAME");
    });

    it("should concatenate generic file lines from multiple generators", async () => {
      const config: ConfigV4 = {
        connection: getConnection(),
        schemaNames: ["v4test"],
        typescriptConfig: {
          enumStyle: "enum",
        },
        generators: [
          async () => ({
            "output.txt": {
              fileType: "generic" as const,
              lines: ["Line 1 from generator 1", "Line 2 from generator 1"],
            },
          }),
          async () => ({
            "output.txt": {
              fileType: "generic" as const,
              lines: ["Line 1 from generator 2", "Line 2 from generator 2"],
            },
          }),
        ],
      };

      await processDatabase(config);

      const results = getResults();
      const outputFile = results["output.txt"];

      expect(outputFile).toBeDefined();
      expect(outputFile).toEqual([
        "Line 1 from generator 1",
        "Line 2 from generator 1",
        "Line 1 from generator 2",
        "Line 2 from generator 2",
      ]);
    });

    it("should error when multiple generators write to same markdown file", async () => {
      const config: ConfigV4 = {
        connection: getConnection(),
        schemaNames: ["v4test"],
        typescriptConfig: {
          enumStyle: "enum",
        },
        generators: [
          async () => ({
            "docs.md": {
              fileType: "markdown" as const,
              template: "template1.hbs",
              context: {},
            },
          }),
          async () => ({
            "docs.md": {
              fileType: "markdown" as const,
              template: "template2.hbs",
              context: {},
            },
          }),
        ],
      };

      await expect(processDatabase(config)).rejects.toThrow(
        /Cannot merge markdown output.*docs\.md/,
      );
    });

    it("should error when generators output different file types to same path", async () => {
      const config: ConfigV4 = {
        connection: getConnection(),
        schemaNames: ["v4test"],
        typescriptConfig: {
          enumStyle: "enum",
        },
        generators: [
          async () => ({
            "output": {
              fileType: "typescript" as const,
              declarations: [],
            },
          }),
          async () => ({
            "output": {
              fileType: "generic" as const,
              lines: ["test"],
            },
          }),
        ],
      };

      await expect(processDatabase(config)).rejects.toThrow(
        /Cannot merge output.*file type mismatch/,
      );
    });

    it("should allow TypeScript files with multiple default exports to merge (TypeScript will validate)", async () => {
      const db = getKnex();
      await db.raw(`
        create table v4test.products (
          id serial primary key
        );
      `);

      const config: ConfigV4 = {
        connection: getConnection(),
        schemaNames: ["v4test"],
        typescriptConfig: {
          enumStyle: "enum",
        },
        generators: [
          // Generator 1: Creates default export interface
          makePgTsGenerator(),
          // Generator 2: Tries to add another default export (bad practice, but should merge)
          async () => ({
            "v4test/Products": {
              fileType: "typescript" as const,
              declarations: [
                {
                  declarationType: "constant" as const,
                  name: "defaultProduct",
                  type: undefined,
                  value: "{ id: 1 }",
                  exportAs: "default" as const,
                },
              ],
            },
          }),
        ],
      };

      // Should not throw during generation - TypeScript compiler will catch the error
      await processDatabase(config);

      const results = getResults();
      const productsFile = results["v4test/Products.ts"];

      expect(productsFile).toBeDefined();
      // File should contain both default exports (invalid TS, but generated successfully)
      const content = productsFile.join("\n");
      expect(content).toContain("export default interface Products");
      expect(content).toContain("export default const defaultProduct");
    });
  });
});

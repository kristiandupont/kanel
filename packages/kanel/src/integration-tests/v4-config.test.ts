/**
 * V4 Config Integration Tests
 *
 * These tests verify that the new V4 configuration format works correctly,
 * including the composable metadata pattern and generator architecture.
 */

import { describe, it, expect } from "vitest";
import type { ConfigV4 } from "../config-types-v4";
import { makePgTsGenerator } from "../generators/makePgTsGenerator";
import processDatabase from "../processDatabase";

const testConnection = {
  host: "localhost",
  user: "postgres",
  password: "postgres",
  database: "dvdrental",
  port: 54321,
};

describe("V4 Config", () => {
  describe("Basic V4 Config", () => {
    it("should work with minimal V4 config using generator", async () => {
      const generatorCalls: string[] = [];

      const config: ConfigV4 = {
        connection: testConnection,
        typescriptConfig: {
          schemas: ["public"],
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
      const config: ConfigV4 = {
        connection: testConnection,
        typescriptConfig: {
          schemas: ["public"],
          enumStyle: "literal",
        },
        generators: [makePgTsGenerator()],
      };

      // Just verify it runs without error
      await processDatabase(config);
    });
  });

  describe("Composable Metadata Functions", () => {
    it("should allow composing getMetadata with builtin", async () => {
      const metadataCalls: string[] = [];

      const config: ConfigV4 = {
        connection: testConnection,
        typescriptConfig: {
          schemas: ["public"],
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
      const propertyCalls: string[] = [];

      const config: ConfigV4 = {
        connection: testConnection,
        typescriptConfig: {
          schemas: ["public"],
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
      const config: ConfigV4 = {
        connection: testConnection,
        typescriptConfig: {
          schemas: ["public"],
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
        connection: testConnection,
        typescriptConfig: {
          schemas: ["public"],
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
      const generator1Calls: string[] = [];
      const generator2Calls: string[] = [];

      const config: ConfigV4 = {
        connection: testConnection,
        typescriptConfig: {
          schemas: ["public"],
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
        connection: testConnection,
        typescriptConfig: {
          schemas: ["public"],
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
      const hookCalls: string[] = [];

      const config: ConfigV4 = {
        connection: testConnection,
        typescriptConfig: {
          schemas: ["public"],
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
        connection: testConnection,
        typescriptConfig: {
          schemas: ["public"],
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
});

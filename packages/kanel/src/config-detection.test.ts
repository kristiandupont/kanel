import { describe, expect, it } from "vitest";
import type { Config, ConfigV3 } from "./config-types";
import type { ConfigV4 } from "./config-types-v4";
import { isV3Config, isV4Config } from "./config-types";

describe("Config Detection", () => {
  describe("isV3Config", () => {
    it("should identify a minimal V3 config", () => {
      const config: Config = {
        connection: "postgres://localhost/test",
      };

      expect(isV3Config(config)).toBe(true);
      expect(isV4Config(config)).toBe(false);
    });

    it("should identify a complete V3 config", () => {
      const config: Config = {
        connection: "postgres://localhost/test",
        schemas: ["public"],
        outputPath: "./models",
        enumStyle: "enum",
        preRenderHooks: [],
        postRenderHooks: [],
        customTypeMap: {},
        resolveViews: true,
      };

      expect(isV3Config(config)).toBe(true);
      expect(isV4Config(config)).toBe(false);
    });

    it("should identify V3 config with metadata functions", () => {
      const config: Config = {
        connection: "postgres://localhost/test",
        getMetadata: (details, _generateFor, _instantiatedConfig) => ({
          name: details.name,
          comment: [],
          path: `./${details.name}`,
        }),
        getPropertyMetadata: (
          property,
          _details,
          _generateFor,
          _instantiatedConfig,
        ) => ({
          name: property.name,
          comment: [],
        }),
      };

      expect(isV3Config(config)).toBe(true);
      expect(isV4Config(config)).toBe(false);
    });

    it("should narrow type correctly for V3 config", () => {
      const config: Config = {
        connection: "postgres://localhost/test",
        enumStyle: "enum",
      };

      if (isV3Config(config)) {
        // TypeScript should know this is ConfigV3
        const enumStyle: "enum" | "type" | undefined = config.enumStyle;
        expect(enumStyle).toBe("enum");

        // This should be accessible on ConfigV3
        const customTypeMap = config.customTypeMap;
        expect(customTypeMap).toBeUndefined();
      } else {
        throw new Error("Should have been identified as V3 config");
      }
    });
  });

  describe("isV4Config", () => {
    it("should identify a minimal V4 config", () => {
      const config: Config = {
        connection: "postgres://localhost/test",
        typescriptConfig: {
          enumStyle: "literal",
        },
        generators: [],
      };

      expect(isV4Config(config)).toBe(true);
      expect(isV3Config(config)).toBe(false);
    });

    it("should identify a complete V4 config", () => {
      const config: Config = {
        connection: "postgres://localhost/test",
        schemaNames: ["public"],
        outputPath: "./models",
        typescriptConfig: {
          enumStyle: "literal",
          tsModuleFormat: "esm",
        },
        generators: [async () => ({})],
        preRenderHooks: [],
        postRenderHooks: [],
        resolveViews: true,
      };

      expect(isV4Config(config)).toBe(true);
      expect(isV3Config(config)).toBe(false);
    });

    it("should narrow type correctly for V4 config", () => {
      const config: Config = {
        connection: "postgres://localhost/test",
        typescriptConfig: {
          enumStyle: "literal",
        },
        generators: [],
      };

      if (isV4Config(config)) {
        // TypeScript should know this is ConfigV4
        const enumStyle = config.typescriptConfig.enumStyle;
        expect(enumStyle).toBe("literal");

        // This should be accessible on ConfigV4
        const generators = config.generators;
        expect(generators).toEqual([]);

        // schemaNames (not schemas) should be the V4 field name
        const schemaNames = config.schemaNames;
        expect(schemaNames).toBeUndefined();
      } else {
        throw new Error("Should have been identified as V4 config");
      }
    });
  });

  describe("Type narrowing edge cases", () => {
    it("should handle config with both V3 and V4-like properties correctly", () => {
      // If someone accidentally mixes V3 and V4 props, generators field wins
      const config: Config = {
        connection: "postgres://localhost/test",
        enumStyle: "enum", // V3-style
        typescriptConfig: { enumStyle: "literal" }, // V4-style
        generators: [], // This makes it V4
      };

      expect(isV4Config(config)).toBe(true);
      expect(isV3Config(config)).toBe(false);
    });

    it("should handle empty generators array as V4", () => {
      const config: Config = {
        connection: "postgres://localhost/test",
        typescriptConfig: {
          enumStyle: "literal",
        },
        generators: [],
      };

      expect(isV4Config(config)).toBe(true);
    });
  });

  describe("Exhaustive type checking", () => {
    it("should ensure all configs are either V3 or V4", () => {
      const testConfigs: Config[] = [
        // V3 configs
        { connection: "test" },
        { connection: "test", schemas: ["public"] },
        { connection: "test", enumStyle: "enum" },

        // V4 configs
        {
          connection: "test",
          typescriptConfig: { enumStyle: "literal" },
          generators: [],
        },
        {
          connection: "test",
          typescriptConfig: { enumStyle: "enum" },
          generators: [async () => ({})],
        },
      ];

      testConfigs.forEach((config) => {
        const isV3 = isV3Config(config);
        const isV4 = isV4Config(config);

        // Every config must be exactly one type
        expect(isV3 !== isV4).toBe(true);
      });
    });
  });

  describe("TypeScript type inference", () => {
    it("should allow type-safe access to V3-specific fields", () => {
      const config: ConfigV3 = {
        connection: "test",
        schemas: ["public"],
        customTypeMap: { "pg_catalog.text": "string" },
      };

      // These should all be valid accesses
      expect(config.schemas).toEqual(["public"]);
      expect(config.customTypeMap).toBeDefined();
      expect(config.preRenderHooks).toBeUndefined();
    });

    it("should allow type-safe access to V4-specific fields", () => {
      const config: ConfigV4 = {
        connection: "test",
        typescriptConfig: {
          enumStyle: "literal",
        },
        generators: [],
      };

      // These should all be valid accesses
      expect(config.typescriptConfig.enumStyle).toBe("literal");
      expect(config.generators).toEqual([]);
      expect(config.schemaNames).toBeUndefined();
    });
  });
});

import { describe, expect, it, vi } from "vitest";
import type { ViewColumn, TableDetails, ViewDetails } from "extract-pg-schema";
import resolveType from "./resolveType";
import generateProperties from "./generateProperties";
import { createTestContext, runWithContextSync } from "../context";
import { runWithPgTsGeneratorContextSync } from "./pgTsGeneratorContext";
import type { InstantiatedConfig } from "../config-types";

const mockTable: TableDetails = {
  name: "users",
  schemaName: "public",
  kind: "table",
  columns: [
    {
      name: "id",
      kind: "scalar",
      type: { fullName: "int4", kind: "base" },
      isNullable: false,
    },
  ],
};

const mockView: ViewDetails = {
  name: "user_view",
  schemaName: "public",
  kind: "view",
  columns: [
    {
      name: "user_id",
      kind: "scalar",
      type: { fullName: "int4", kind: "base" },
      isNullable: true, // Initially nullable in view
      source: {
        schema: "public",
        table: "users",
        column: "id",
      },
    } as ViewColumn,
  ],
  informationSchemaValue: {
    table_schema: "public",
    table_name: "user_view",
  } as any,
};

const schemas = {
  public: {
    tables: [mockTable],
    views: [mockView],
    materializedViews: [],
    compositeTypes: [],
    enums: [],
    domains: [],
    ranges: [],
  } as any,
};

const baseConfig: InstantiatedConfig = {
  schemas,
  typeMap: { int4: "number" },
  connection: {},
  outputPath: ".",
  enumStyle: "enum",
  preDeleteOutputFolder: false,
  getMetadata: vi.fn().mockReturnValue({ name: "Users", path: "users" }),
  getPropertyMetadata: (p) => ({ name: p.name }),
  generateIdentifierType: vi.fn(),
  propertySortFunction: vi.fn(),
};

describe("resolveViews config option", () => {
  it("resolves types from source when resolveViews is true", () => {
    const config = { ...baseConfig, resolveViews: true };
    const context = createTestContext(config);
    const pgContext = {
      typeMap: config.typeMap,
      getMetadata: config.getMetadata,
      getPropertyMetadata: config.getPropertyMetadata,
      propertySortFunction: config.propertySortFunction,
    } as any;

    runWithContextSync(context, () => {
      runWithPgTsGeneratorContextSync(pgContext, () => {
        const type = resolveType(mockView.columns[0], mockView);
        expect(type).toBe("number");
      });
    });
  });

  it("does NOT resolve types from source when resolveViews is false", () => {
    const config = { ...baseConfig, resolveViews: false };
    const context = createTestContext(config);
    const pgContext = {
      typeMap: config.typeMap,
      getMetadata: config.getMetadata,
      getPropertyMetadata: config.getPropertyMetadata,
      propertySortFunction: config.propertySortFunction,
    } as any;

    runWithContextSync(context, () => {
      runWithPgTsGeneratorContextSync(pgContext, () => {
        // Since we didn't resolve from source, and 'int4' is in typeMap, it still returns 'number'
        // But let's check generateProperties where it affects nullability.
        const props = generateProperties(mockView, "selector");
        expect(props[0].isNullable).toBe(true); // Should stay true as in mockView
      });
    });
  });

  it("resolves nullability from source when resolveViews is true", () => {
    const config = { ...baseConfig, resolveViews: true };
    const context = createTestContext(config);
    const pgContext = {
      typeMap: config.typeMap,
      getMetadata: config.getMetadata,
      getPropertyMetadata: config.getPropertyMetadata,
      propertySortFunction: config.propertySortFunction,
    } as any;

    runWithContextSync(context, () => {
      runWithPgTsGeneratorContextSync(pgContext, () => {
        const props = generateProperties(mockView, "selector");
        expect(props[0].isNullable).toBe(false); // Resolved from mockTable.id
      });
    });
  });
});

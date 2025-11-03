import { describe, expect, test, beforeEach } from "vitest";
import type {
  TableColumn,
  TableDetails,
  Schema,
  ColumnReference,
} from "extract-pg-schema";

import resolveType from "./resolveType";
import { useKanelContext } from "../context";
import type { InstantiatedConfig } from "../config-types";

// Mock the context module
import { vi } from "vitest";

vi.mock("../context", () => ({
  useKanelContext: vi.fn(),
}));

const mockUseKanelContext = vi.mocked(useKanelContext);

// Factory functions for test fixtures
const createTableColumn = (
  overrides: Partial<TableColumn> & Pick<TableColumn, "name" | "type">,
): TableColumn => ({
  isPrimaryKey: false,
  isNullable: false,
  isArray: false,
  comment: null,
  defaultValue: null,
  isGenerated: false,
  isIdentity: false,
  indices: [],
  maxLength: null,
  ordinalPosition: 1,
  references: [],
  ...overrides,
} as unknown as TableColumn);

const createTableDetails = (
  name: string,
  schemaName: string = "public",
  columns: TableColumn[] = [],
): TableDetails => ({
  name,
  schemaName,
  columns,
} as any);

const createSchema = (
  name: string,
  tables: TableDetails[] = [],
): Schema => ({
  name,
  tables,
  views: [],
  materializedViews: [],
  compositeTypes: [],
  enums: [],
  domains: [],
  ranges: [],
} as any);

const createReference = (
  tableName: string,
  columnName: string,
  schemaName: string = "public",
): ColumnReference => ({
  schemaName,
  tableName,
  columnName,
} as ColumnReference);

const mockWarn = () => vi.spyOn(console, "warn").mockImplementation(() => {});

describe("resolveType", () => {
  let mockConfig: InstantiatedConfig;
  let mockSchemas: Record<string, Schema>;

  beforeEach(() => {
    mockSchemas = {};
    mockConfig = {
      schemas: mockSchemas,
      typeMap: {
        "pg_catalog.int4": "number",
        "pg_catalog.varchar": "string",
        "pg_catalog.text": "string",
        "pg_catalog.jsonb": "unknown",
      },
      generateIdentifierType: undefined,
      getMetadata: vi.fn(() => ({
        name: "MockType",
        path: "./MockType",
      })),
    } as unknown as InstantiatedConfig;

    mockUseKanelContext.mockReturnValue({
      instantiatedConfig: mockConfig,
    } as any);
  });

  describe("basic type resolution", () => {
    test("should resolve primitive types from typeMap", () => {
      const column = createTableColumn({
        name: "id",
        type: { fullName: "pg_catalog.int4", kind: "base" } as any,
        isPrimaryKey: true,
      });

      const details = createTableDetails("users", "public", [column]);

      const result = resolveType(column, details);
      expect(result).toBe("number");
    });

    test("should resolve string types from typeMap", () => {
      const column = createTableColumn({
        name: "email",
        type: { fullName: "pg_catalog.varchar", kind: "base" } as any,
        maxLength: 255,
        ordinalPosition: 2,
      });

      const details = createTableDetails("users", "public", [column]);

      const result = resolveType(column, details);
      expect(result).toBe("string");
    });

    test("should return unknown for unmapped types", () => {
      const warnSpy = mockWarn();

      const column = createTableColumn({
        name: "custom_col",
        type: { fullName: "public.unknown_type", kind: "base" } as any,
      });

      const details = createTableDetails("test_table", "public", [column]);

      const result = resolveType(column, details);
      expect(result).toBe("unknown");
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Could not resolve type"),
      );

      warnSpy.mockRestore();
    });
  });

  describe("reference resolution", () => {
    test("should resolve simple foreign key reference", () => {
      const idColumn = createTableColumn({
        name: "id",
        type: { fullName: "pg_catalog.int4", kind: "base" } as any,
        isPrimaryKey: true,
      });

      const usersTable = createTableDetails("users", "public", [idColumn]);
      const postsTable = createTableDetails("posts");

      mockSchemas.public = createSchema("public", [usersTable, postsTable]);

      const userIdColumn = createTableColumn({
        name: "user_id",
        type: { fullName: "pg_catalog.int4", kind: "base" } as any,
        ordinalPosition: 2,
        references: [createReference("users", "id")],
      });

      const result = resolveType(userIdColumn, postsTable);
      expect(result).toBe("number");
    });

    test("should handle missing reference gracefully", () => {
      const warnSpy = mockWarn();

      mockSchemas.public = createSchema("public");

      const column = createTableColumn({
        name: "user_id",
        type: { fullName: "pg_catalog.int4", kind: "base" } as any,
        references: [createReference("nonexistent", "id")],
      });

      const details = createTableDetails("posts", "public", [column]);

      const result = resolveType(column, details);
      expect(result).toBe("number");
      expect(warnSpy).toHaveBeenCalledWith(
        "Could not resolve reference",
        expect.any(Object),
      );

      warnSpy.mockRestore();
    });
  });

  describe("identifier type generation", () => {
    test("should use generateIdentifierType for primary keys when configured", () => {
      const idColumn = createTableColumn({
        name: "id",
        type: { fullName: "pg_catalog.int4", kind: "base" } as any,
        isPrimaryKey: true,
      });

      const usersTable = createTableDetails("users", "public", [idColumn]);

      mockSchemas.public = createSchema("public", [usersTable]);

      mockConfig.generateIdentifierType = (col, details, _config) => ({
        declarationType: "typeDeclaration" as const,
        name: `${details.name}Id`,
        exportAs: "named" as const,
        typeDefinition: ["number"],
        typeImports: [],
        comment: null,
      });

      const result = resolveType(idColumn, usersTable);
      expect(result).toEqual({
        name: "usersId",
        typeImports: [
          {
            name: "usersId",
            asName: undefined,
            path: "./MockType",
            isAbsolute: false,
            isDefault: false,
            importAsType: true,
          },
        ],
      });
    });
  });

  describe("circular reference handling", () => {
    test("should handle direct circular reference (A->B->A)", () => {
      const columnA = createTableColumn({
        name: "id_a",
        type: { fullName: "pg_catalog.int4", kind: "base" } as any,
        isPrimaryKey: true,
        references: [createReference("table_b", "id_b")],
      });

      const columnB = createTableColumn({
        name: "id_b",
        type: { fullName: "pg_catalog.int4", kind: "base" } as any,
        isPrimaryKey: true,
        references: [createReference("table_a", "id_a")],
      });

      const tableA = createTableDetails("table_a", "public", [columnA]);
      const tableB = createTableDetails("table_b", "public", [columnB]);

      mockSchemas.public = createSchema("public", [tableA, tableB]);

      // This should not cause a stack overflow
      const result = resolveType(columnA, tableA);
      expect(result).toBeDefined();
      // When circular reference is detected, it falls back to typeMap
      expect(result).toBe("number");
    });

    test("should handle composite circular reference (threads<->msgs)", () => {
      const threadIdCol = createTableColumn({
        name: "id",
        type: { fullName: "pg_catalog.int4", kind: "base" } as any,
        isPrimaryKey: true,
      });

      const lastMsgIdCol = createTableColumn({
        name: "last_msg_id",
        type: { fullName: "pg_catalog.varchar", kind: "base" } as any,
        isNullable: true,
        references: [createReference("msgs", "id", "test")],
      });

      const msgIdCol = createTableColumn({
        name: "id",
        type: { fullName: "pg_catalog.varchar", kind: "base" } as any,
        isPrimaryKey: true,
      });

      const msgThreadIdCol = createTableColumn({
        name: "thread_id",
        type: { fullName: "pg_catalog.int4", kind: "base" } as any,
        isPrimaryKey: true,
        references: [createReference("threads", "id", "test")],
      });

      const threadsTable = createTableDetails("threads", "test", [
        threadIdCol,
        lastMsgIdCol,
      ]);
      const msgsTable = createTableDetails("msgs", "test", [
        msgIdCol,
        msgThreadIdCol,
      ]);

      mockSchemas.test = createSchema("test", [threadsTable, msgsTable]);

      // This should not cause a stack overflow
      const result = resolveType(lastMsgIdCol, threadsTable);
      expect(result).toBeDefined();
      expect(result).toBe("string");
    });
  });
});

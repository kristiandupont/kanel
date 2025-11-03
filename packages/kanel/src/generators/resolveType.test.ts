import { describe, expect, test, beforeEach } from "vitest";
import type {
  TableColumn,
  TableDetails,
  Schema,
  ColumnReference,
} from "extract-pg-schema";

import resolveType from "./resolveType";
import { useKanelContext } from "../context";
import type { InstantiatedConfig } from "../Config";

// Mock the context module
import { vi } from "vitest";

vi.mock("../context", () => ({
  useKanelContext: vi.fn(),
}));

const mockUseKanelContext = vi.mocked(useKanelContext);

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
      const column: TableColumn = {
        name: "id",
        type: { fullName: "pg_catalog.int4", kind: "base" } as any,
        isPrimaryKey: true,
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
      } as TableColumn;

      const details: TableDetails = {
        name: "users",
        schemaName: "public",
        columns: [column],
      } as any;

      const result = resolveType(column, details);
      expect(result).toBe("number");
    });

    test("should resolve string types from typeMap", () => {
      const column: TableColumn = {
        name: "email",
        type: { fullName: "pg_catalog.varchar", kind: "base" } as any,
        isPrimaryKey: false,
        isNullable: false,
        isArray: false,
        comment: null,
        defaultValue: null,
        isGenerated: false,
        isIdentity: false,
        indices: [],
        maxLength: 255,
        ordinalPosition: 2,
        references: [],
      } as TableColumn;

      const details: TableDetails = {
        name: "users",
        schemaName: "public",
        columns: [column],
      } as any;

      const result = resolveType(column, details);
      expect(result).toBe("string");
    });

    test("should return unknown for unmapped types", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const column: TableColumn = {
        name: "custom_col",
        type: { fullName: "public.unknown_type", kind: "base" } as any,
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
      } as TableColumn;

      const details: TableDetails = {
        name: "test_table",
        schemaName: "public",
        columns: [column],
      } as any;

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
      const usersTable: TableDetails = {
        name: "users",
        schemaName: "public",
        columns: [
          {
            name: "id",
            type: { fullName: "pg_catalog.int4", kind: "base" } as any,
            isPrimaryKey: true,
            isNullable: false,
            isArray: false,
            references: [],
          } as TableColumn,
        ],
      } as any;

      const postsTable: TableDetails = {
        name: "posts",
        schemaName: "public",
        columns: [],
      } as any;

      mockSchemas.public = {
        name: "public",
        tables: [usersTable, postsTable],
        views: [],
        materializedViews: [],
        compositeTypes: [],
        enums: [],
        domains: [],
        ranges: [],
      } as any;

      const userIdColumn: TableColumn = {
        name: "user_id",
        type: { fullName: "pg_catalog.int4", kind: "base" } as any,
        isPrimaryKey: false,
        isNullable: false,
        isArray: false,
        comment: null,
        defaultValue: null,
        isGenerated: false,
        isIdentity: false,
        indices: [],
        maxLength: null,
        ordinalPosition: 2,
        references: [
          {
            schemaName: "public",
            tableName: "users",
            columnName: "id",
          } as ColumnReference,
        ],
      } as TableColumn;

      const result = resolveType(userIdColumn, postsTable);
      expect(result).toBe("number");
    });

    test("should handle missing reference gracefully", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      mockSchemas.public = {
        name: "public",
        tables: [],
        views: [],
        materializedViews: [],
        compositeTypes: [],
        enums: [],
        domains: [],
        ranges: [],
      } as any;

      const column: TableColumn = {
        name: "user_id",
        type: { fullName: "pg_catalog.int4", kind: "base" } as any,
        isPrimaryKey: false,
        isNullable: false,
        isArray: false,
        references: [
          {
            schemaName: "public",
            tableName: "nonexistent",
            columnName: "id",
          } as ColumnReference,
        ],
      } as TableColumn;

      const details: TableDetails = {
        name: "posts",
        schemaName: "public",
        columns: [column],
      } as any;

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
      const usersTable: TableDetails = {
        name: "users",
        schemaName: "public",
        columns: [],
      } as any;

      const idColumn: TableColumn = {
        name: "id",
        type: { fullName: "pg_catalog.int4", kind: "base" } as any,
        isPrimaryKey: true,
        isNullable: false,
        isArray: false,
        references: [],
      } as TableColumn;

      usersTable.columns = [idColumn];

      mockSchemas.public = {
        name: "public",
        tables: [usersTable],
        views: [],
        materializedViews: [],
        compositeTypes: [],
        enums: [],
        domains: [],
        ranges: [],
      } as any;

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
      const tableA: TableDetails = {
        name: "table_a",
        schemaName: "public",
        columns: [],
      } as any;

      const tableB: TableDetails = {
        name: "table_b",
        schemaName: "public",
        columns: [],
      } as any;

      const columnA: TableColumn = {
        name: "id_a",
        type: { fullName: "pg_catalog.int4", kind: "base" } as any,
        isPrimaryKey: true,
        isNullable: false,
        isArray: false,
        references: [
          {
            schemaName: "public",
            tableName: "table_b",
            columnName: "id_b",
          } as ColumnReference,
        ],
      } as TableColumn;

      const columnB: TableColumn = {
        name: "id_b",
        type: { fullName: "pg_catalog.int4", kind: "base" } as any,
        isPrimaryKey: true,
        isNullable: false,
        isArray: false,
        references: [
          {
            schemaName: "public",
            tableName: "table_a",
            columnName: "id_a",
          } as ColumnReference,
        ],
      } as TableColumn;

      tableA.columns = [columnA];
      tableB.columns = [columnB];

      mockSchemas.public = {
        name: "public",
        tables: [tableA, tableB],
        views: [],
        materializedViews: [],
        compositeTypes: [],
        enums: [],
        domains: [],
        ranges: [],
      } as any;

      // This should not cause a stack overflow
      const result = resolveType(columnA, tableA);
      expect(result).toBeDefined();
      // When circular reference is detected, it falls back to typeMap
      expect(result).toBe("number");
    });

    test("should handle composite circular reference (threads<->msgs)", () => {
      const threadsTable: TableDetails = {
        name: "threads",
        schemaName: "test",
        columns: [],
      } as any;

      const msgsTable: TableDetails = {
        name: "msgs",
        schemaName: "test",
        columns: [],
      } as any;

      const threadIdCol: TableColumn = {
        name: "id",
        type: { fullName: "pg_catalog.int4", kind: "base" } as any,
        isPrimaryKey: true,
        isNullable: false,
        isArray: false,
        references: [],
      } as TableColumn;

      const lastMsgIdCol: TableColumn = {
        name: "last_msg_id",
        type: { fullName: "pg_catalog.varchar", kind: "base" } as any,
        isPrimaryKey: false,
        isNullable: true,
        isArray: false,
        references: [
          {
            schemaName: "test",
            tableName: "msgs",
            columnName: "id",
          } as ColumnReference,
        ],
      } as TableColumn;

      const msgIdCol: TableColumn = {
        name: "id",
        type: { fullName: "pg_catalog.varchar", kind: "base" } as any,
        isPrimaryKey: true,
        isNullable: false,
        isArray: false,
        references: [],
      } as TableColumn;

      const msgThreadIdCol: TableColumn = {
        name: "thread_id",
        type: { fullName: "pg_catalog.int4", kind: "base" } as any,
        isPrimaryKey: true,
        isNullable: false,
        isArray: false,
        references: [
          {
            schemaName: "test",
            tableName: "threads",
            columnName: "id",
          } as ColumnReference,
        ],
      } as TableColumn;

      threadsTable.columns = [threadIdCol, lastMsgIdCol];
      msgsTable.columns = [msgIdCol, msgThreadIdCol];

      mockSchemas.test = {
        name: "test",
        tables: [threadsTable, msgsTable],
        views: [],
        materializedViews: [],
        compositeTypes: [],
        enums: [],
        domains: [],
        ranges: [],
      } as any;

      // This should not cause a stack overflow
      const result = resolveType(lastMsgIdCol, threadsTable);
      expect(result).toBeDefined();
      expect(result).toBe("string");
    });
  });
});

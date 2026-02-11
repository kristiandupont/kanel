import type { TableColumn, TableDetails } from "extract-pg-schema";
import { describe, expect, it } from "vitest";

import {
  findDescriptionColumn,
  isKyselyProcessed,
  parseSmartTags,
  resolveTagValue,
  updateColumnType,
} from "./enumTablesPreRenderHook";

// ---------------------------------------------------------------------------
// parseSmartTags
// ---------------------------------------------------------------------------

describe("parseSmartTags", () => {
  it("should return empty object for null comment", () => {
    expect(parseSmartTags(null)).toEqual({});
  });

  it("should return empty object for empty string", () => {
    expect(parseSmartTags("")).toEqual({});
  });

  it("should return empty object for comment without tags", () => {
    expect(parseSmartTags("just a plain comment")).toEqual({});
  });

  it("should parse a single @enum tag", () => {
    const tags = parseSmartTags("@enum");
    expect(tags).toHaveProperty("enum");
  });

  it("should parse colon-format tag value", () => {
    const tags = parseSmartTags("@enumName:TypeOfAnimal");
    expect(tags.enumName).toBe("TypeOfAnimal");
  });

  it("should parse newline-separated tags (Postgraphile format)", () => {
    const tags = parseSmartTags("@enum\n@enumName TypeOfAnimal");
    expect(tags).toHaveProperty("enum");
    expect(tags).toHaveProperty("enumName");
  });

  it("should handle multiple tags on one line", () => {
    const tags = parseSmartTags("@enum @enumName:Foo");
    expect(tags).toHaveProperty("enum");
    expect(tags.enumName).toBe("Foo");
  });

  it("should handle extra whitespace around lines", () => {
    const tags = parseSmartTags("  @enum  \n  @enumName:Bar  ");
    expect(tags).toHaveProperty("enum");
    expect(tags.enumName).toBe("Bar");
  });
});

// ---------------------------------------------------------------------------
// resolveTagValue
// ---------------------------------------------------------------------------

describe("resolveTagValue", () => {
  it("should return string value directly (colon format)", () => {
    const tags = { enumName: "TypeOfAnimal" };
    expect(resolveTagValue(tags, "enumName", "@enumName:TypeOfAnimal")).toBe(
      "TypeOfAnimal",
    );
  });

  it("should extract value from raw comment when tag is boolean (space format)", () => {
    // tagged-comment-parser parses `@enumName TypeOfAnimal` as enumName: true
    const tags = { enumName: true as string | boolean };
    expect(
      resolveTagValue(
        tags as Record<string, string | boolean>,
        "enumName",
        "@enumName TypeOfAnimal",
      ),
    ).toBe("TypeOfAnimal");
  });

  it("should return undefined when tag is not present", () => {
    const tags = { enum: true as string | boolean };
    expect(
      resolveTagValue(
        tags as Record<string, string | boolean>,
        "enumName",
        "@enum",
      ),
    ).toBeUndefined();
  });

  it("should handle multiline raw comment for space format extraction", () => {
    const raw = "@enum\n@enumName TypeOfAnimal";
    const tags = { enum: true, enumName: true } as Record<
      string,
      string | boolean
    >;
    expect(resolveTagValue(tags, "enumName", raw)).toBe("TypeOfAnimal");
  });
});

// ---------------------------------------------------------------------------
// isKyselyProcessed
// ---------------------------------------------------------------------------

describe("isKyselyProcessed", () => {
  it("should return true when ColumnType import from kysely is present", () => {
    const declarations = [
      {
        declarationType: "interface",
        name: "MemberTable",
        typeImports: [{ name: "ColumnType", path: "kysely" }],
      },
    ];
    expect(isKyselyProcessed(declarations)).toBe(true);
  });

  it("should return false without ColumnType import", () => {
    const declarations = [
      {
        declarationType: "interface",
        name: "Member",
        typeImports: [{ name: "SomeType", path: "./types" }],
      },
    ];
    expect(isKyselyProcessed(declarations)).toBe(false);
  });

  it("should return false for empty declarations", () => {
    expect(isKyselyProcessed([])).toBe(false);
  });

  it("should return false when ColumnType is imported from a different path", () => {
    const declarations = [
      {
        declarationType: "interface",
        name: "Member",
        typeImports: [{ name: "ColumnType", path: "other-lib" }],
      },
    ];
    expect(isKyselyProcessed(declarations)).toBe(false);
  });

  it("should return false for non-interface declarations", () => {
    const declarations = [
      {
        declarationType: "typeDeclaration",
        name: "MemberId",
        typeImports: [{ name: "ColumnType", path: "kysely" }],
      },
    ];
    expect(isKyselyProcessed(declarations)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// updateColumnType
// ---------------------------------------------------------------------------

describe("updateColumnType", () => {
  it("should replace type name inside ColumnType<>", () => {
    expect(updateColumnType("ColumnType<MemberId, MemberId, MemberId>", "MemberId", "MemberType")).toBe(
      "ColumnType<MemberType, MemberType, MemberType>",
    );
  });

  it("should handle ColumnType with different inner types", () => {
    expect(
      updateColumnType(
        "ColumnType<MemberId, string | MemberId, MemberId>",
        "MemberId",
        "MemberType",
      ),
    ).toBe("ColumnType<MemberType, string | MemberType, MemberType>");
  });

  it("should return the type unchanged when not a ColumnType", () => {
    expect(updateColumnType("MemberId", "MemberId", "MemberType")).toBe(
      "MemberId",
    );
  });

  it("should return empty ColumnType unchanged when no match", () => {
    expect(updateColumnType("ColumnType<Foo, Bar, Baz>", "Other", "New")).toBe(
      "ColumnType<Foo, Bar, Baz>",
    );
  });
});

// ---------------------------------------------------------------------------
// findDescriptionColumn
// ---------------------------------------------------------------------------

const makeColumn = (
  name: string,
  comment: string | null = null,
): TableColumn =>
  ({
    name,
    comment,
    expandedType: "pg_catalog.text",
    type: { fullName: "pg_catalog.text", kind: "base" as const },
    defaultValue: null,
    isArray: false,
    dimensions: 0,
    references: [],
    reference: null,
    indices: [],
    maxLength: null,
    isNullable: false,
    isPrimaryKey: name === "id",
    generated: "NEVER" as const,
    isUpdatable: true,
    isIdentity: false,
    ordinalPosition: 1,
    parentTable: null,
    informationSchemaValue: {} as any,
  }) satisfies TableColumn;

const makeTable = (
  name: string,
  columns: TableColumn[],
  comment: string | null = null,
): TableDetails =>
  ({
    name,
    schemaName: "public",
    kind: "table" as const,
    comment,
    columns,
    indices: [],
    checks: [],
    isRowLevelSecurityEnabled: false,
    isRowLevelSecurityEnforced: false,
    securityPolicies: [],
    triggers: [],
    informationSchemaValue: {} as any,
  }) satisfies TableDetails;

describe("findDescriptionColumn", () => {
  it("should return column name when @enumDescription tag is present", () => {
    const table = makeTable("member_type", [
      makeColumn("id"),
      makeColumn("description", "@enumDescription"),
    ]);

    expect(findDescriptionColumn(table)).toBe("description");
  });

  it("should return undefined when no column has @enumDescription", () => {
    const table = makeTable("member_type", [
      makeColumn("id"),
      makeColumn("label", "A human-readable label"),
    ]);

    expect(findDescriptionColumn(table)).toBeUndefined();
  });

  it("should handle @enumDescription with colon format", () => {
    const table = makeTable("status", [
      makeColumn("code"),
      makeColumn("display_name", "@enumDescription:true"),
    ]);

    expect(findDescriptionColumn(table)).toBe("display_name");
  });

  it("should return the first column with @enumDescription when multiple match", () => {
    const table = makeTable("status", [
      makeColumn("code"),
      makeColumn("short_desc", "@enumDescription"),
      makeColumn("long_desc", "@enumDescription"),
    ]);

    expect(findDescriptionColumn(table)).toBe("short_desc");
  });

  it("should return undefined when table has no columns", () => {
    const table = makeTable("empty_table", []);
    expect(findDescriptionColumn(table)).toBeUndefined();
  });
});

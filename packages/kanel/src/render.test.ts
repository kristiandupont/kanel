import { describe, expect, it } from "vitest";

import { Declaration } from "./declaration-types";
import render from "./render";

describe("processGenerationSetup", () => {
  it("should process a type declaration", () => {
    const declarations: Declaration[] = [
      {
        declarationType: "typeDeclaration" as const,
        name: "MyString",
        exportAs: "named",
        comment: ["This is just a string"],
        typeDefinition: ["string"],
      },
    ];
    const lines = render(declarations, "./");
    expect(lines).toEqual([
      "/** This is just a string */",
      `export type MyString = string;`,
    ]);
  });

  it("should work with multi-line type definitions", () => {
    const declarations: Declaration[] = [
      {
        declarationType: "typeDeclaration" as const,
        name: "MyUnion",
        exportAs: "named",
        comment: [],
        typeDefinition: ["", "| 'apples'", "| 'oranges'", "| 'bananas'"],
      },
    ];
    const lines = render(declarations, "./");
    expect(lines).toEqual([
      `export type MyUnion = `,
      `  | 'apples'`,
      `  | 'oranges'`,
      `  | 'bananas';`,
    ]);
  });

  it("should process an interface", () => {
    const declarations: Declaration[] = [
      {
        declarationType: "interface" as const,
        name: "Member",
        exportAs: "default",
        properties: [
          {
            name: "id",
            typeName: "MemberId",
            comment: ["This is the identifier", "it's a number"],
            dimensions: 0,
            isOptional: false,
            isNullable: false,
          },
        ],
      },
    ];
    const lines = render(declarations, "./");
    expect(lines).toEqual([
      `export default interface Member {`,
      "  /**",
      "   * This is the identifier",
      "   * it's a number",
      "   */",
      "  id: MemberId;",
      "}",
    ]);
  });
});

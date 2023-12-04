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

  it("should process an enum", () => {
    const declarations: Declaration[] = [
      {
        declarationType: "enum" as const,
        name: "MpaaRating",
        exportAs: "named",
        values: ["G", "PG", "PG-13", "R", "NC-17"],
      },
    ];
    const lines = render(declarations, "./");
    expect(lines).toEqual([
      `export enum MpaaRating {`,
      `  G = 'G',`,
      `  PG = 'PG',`,
      `  'PG-13' = 'PG-13',`,
      `  R = 'R',`,
      `  'NC-17' = 'NC-17',`,
      `};`,
    ]);
  });

  it("should support a default exported enum", () => {
    const declarations: Declaration[] = [
      {
        declarationType: "enum" as const,
        name: "Fruit",
        exportAs: "default",
        values: ["apples", "oranges", "bananas"],
      },
    ];
    const lines = render(declarations, "./");
    expect(lines).toEqual([
      `enum Fruit {`,
      `  apples = 'apples',`,
      `  oranges = 'oranges',`,
      `  bananas = 'bananas',`,
      `};`,
      "",
      "export default Fruit;",
    ]);
  });

  it("should process a constant", () => {
    const declarations: Declaration[] = [
      {
        declarationType: "constant" as const,
        name: "MyConstant",
        type: "boolean",
        exportAs: "named",
        value: "true",
      },
    ];
    const lines = render(declarations, "./");
    expect(lines).toEqual([`export const MyConstant: boolean = true;`]);
  });

  it("should process a multi-line constant", () => {
    const declarations: Declaration[] = [
      {
        declarationType: "constant" as const,
        name: "actor",
        type: "z.Schema<Actor>",
        exportAs: "named",
        value: ["z.object({", "  actor_id: actorId,", "})"],
      },
    ];
    const lines = render(declarations, "./");
    expect(lines).toEqual([
      "export const actor: z.Schema<Actor> =",
      "z.object({",
      `  actor_id: actorId,`,
      `})`,
    ]);
  });
});

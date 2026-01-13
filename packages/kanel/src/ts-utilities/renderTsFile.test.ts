import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createTestContext,
  type KanelContext,
  runWithContext,
} from "../context";
import type { InstantiatedConfig } from "../config-types";
import type { TsDeclaration } from "./ts-declaration-types";
import renderTsFile from "./renderTsFile";

const instantiatedConfig: InstantiatedConfig = {
  getMetadata: vi.fn(),
  getPropertyMetadata: vi.fn(),
  generateIdentifierType: vi.fn(),
  propertySortFunction: vi.fn(),
  enumStyle: "enum",
  typeMap: {},
  schemas: {},
  connection: {},
  outputPath: ".",
  preDeleteOutputFolder: false,
  resolveViews: true,
  fileExtension: ".ts",
};

describe("renderTsFile", () => {
  let testContext: KanelContext;

  const renderInContext = (declarations: TsDeclaration[]) =>
    runWithContext(testContext, async () => renderTsFile(declarations, "./"));

  beforeEach(() => {
    testContext = createTestContext(instantiatedConfig);
  });

  it("should process a type declaration", async () => {
    const declarations: TsDeclaration[] = [
      {
        declarationType: "typeDeclaration" as const,
        name: "MyString",
        exportAs: "named",
        comment: ["This is just a string"],
        typeDefinition: ["string"],
      },
    ];
    const lines = await renderInContext(declarations);
    expect(lines).toEqual([
      "/** This is just a string */",
      `export type MyString = string;`,
    ]);
  });

  it("should work with multi-line type definitions", async () => {
    const declarations: TsDeclaration[] = [
      {
        declarationType: "typeDeclaration" as const,
        name: "MyUnion",
        exportAs: "named",
        comment: [],
        typeDefinition: ["", "| 'apples'", "| 'oranges'", "| 'bananas'"],
      },
    ];
    const lines = await renderInContext(declarations);
    expect(lines).toEqual([
      `export type MyUnion = `,
      `  | 'apples'`,
      `  | 'oranges'`,
      `  | 'bananas';`,
    ]);
  });

  it("should process an interface", async () => {
    const declarations: TsDeclaration[] = [
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
    const lines = await renderInContext(declarations);
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

  it("should process an enum", async () => {
    const declarations: TsDeclaration[] = [
      {
        declarationType: "enum" as const,
        name: "MpaaRating",
        exportAs: "named",
        values: ["G", "PG", "PG-13", "R", "NC-17"],
      },
    ];
    const lines = await renderInContext(declarations);
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

  it("should support a default exported enum", async () => {
    const declarations: TsDeclaration[] = [
      {
        declarationType: "enum" as const,
        name: "Fruit",
        exportAs: "default",
        values: ["apples", "oranges", "bananas"],
      },
    ];
    const lines = await renderInContext(declarations);
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

  it("should process a constant", async () => {
    const declarations: TsDeclaration[] = [
      {
        declarationType: "constant" as const,
        name: "MyConstant",
        type: "boolean",
        exportAs: "named",
        value: "true",
      },
    ];
    const lines = await renderInContext(declarations);
    expect(lines).toEqual([`export const MyConstant: boolean = true;`]);
  });

  it("should process a multi-line constant", async () => {
    const declarations: TsDeclaration[] = [
      {
        declarationType: "constant" as const,
        name: "actor",
        type: "z.Schema<Actor>",
        exportAs: "named",
        value: ["z.object({", "  actor_id: actorId,", "})"],
      },
    ];
    const lines = await renderInContext(declarations);
    expect(lines).toEqual([
      "export const actor: z.Schema<Actor> = z.object({",
      `  actor_id: actorId,`,
      `});`,
    ]);
  });

  it("should process a type declaration with special characters", async () => {
    const declarations: TsDeclaration[] = [
      {
        declarationType: "typeDeclaration" as const,
        name: "[example] this is a table! yes, even with symbols: \"'!.Id",
        exportAs: "named",
        comment: ["This is a // * /* comment */", "hello"],
        typeDefinition: [
          "string & { __brand: '[example] this is a table! yes, even with symbols: \"\\'!.Id' }",
        ],
      },
    ];
    const lines = await renderInContext(declarations);
    expect(lines).toEqual([
      "/**",
      " * This is a // * /* comment *\\/",
      " * hello",
      " */",
      `export type ExampleThisIsATableYesEvenWithSymbolsId = string & { __brand: '[example] this is a table! yes, even with symbols: "\\'!.Id' };`,
    ]);
  });
});

import type { Schema } from "extract-pg-schema";
import { describe, expect, it, vi } from "vitest";

import type { InstantiatedConfig } from "../config-types";
import { createTestContext, runWithContextSync } from "../context";
import renderTsFile from "../ts-utilities/renderTsFile";
import type { TsDeclaration } from "../ts-utilities/ts-declaration-types";
import makeRoutineGenerator from "./makeRoutineGenerator";
import type { PgTsGeneratorContext } from "./pgTsGeneratorContext";
import { runWithPgTsGeneratorContextSync } from "./pgTsGeneratorContext";

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

const schema = {
  name: "public",
  functions: [
    {
      name: "add_numbers",
      schemaName: "public",
      parameters: [
        { name: "a", type: "int4" },
        { name: "b", type: "int4" },
      ],
      returnType: "int4",
    },
  ],
} as unknown as Schema;

const generate = (
  getRoutineMetadata: PgTsGeneratorContext["getRoutineMetadata"],
): TsDeclaration[] => {
  const pgTsContext: PgTsGeneratorContext = {
    typeMap: { int4: "number" },
    getMetadata: vi.fn(),
    getPropertyMetadata: vi.fn(),
    getRoutineMetadata,
    propertySortFunction: vi.fn(),
  };

  return runWithContextSync(createTestContext(instantiatedConfig), () =>
    runWithPgTsGeneratorContextSync(pgTsContext, () => {
      const output = makeRoutineGenerator("function")(schema, {});
      const file = output["public/add_numbers"];
      if (file?.fileType !== "typescript") {
        throw new Error("Expected a typescript file");
      }
      return file.declarations;
    }),
  );
};

describe("makeRoutineGenerator", () => {
  it("renders parameters whose metadata has no comment", () => {
    const declarations = generate((details) => ({
      path: `public/${details.name}`,
      parametersName: "AddNumbersParams",
      parameters: details.parameters.map(({ name }) => ({
        name,
        comment: undefined,
      })),
      returnTypeName: "AddNumbersReturnType",
      returnTypeComment: ["Return type for add_numbers"],
    }));

    const lines = runWithContextSync(
      createTestContext(instantiatedConfig),
      () => renderTsFile(declarations, "./public/add_numbers"),
    );
    expect(lines).toContain("export interface AddNumbersParams {");

    expect(declarations[0]).toMatchObject({
      declarationType: "interface",
      name: "AddNumbersParams",
      comment: [],
    });
  });

  it("keeps the parameter comments that are given", () => {
    const declarations = generate((details) => ({
      path: `public/${details.name}`,
      parametersName: "AddNumbersParams",
      parameters: details.parameters.map(({ name }) => ({
        name,
        comment: name === "a" ? ["First number"] : undefined,
      })),
      returnTypeName: "AddNumbersReturnType",
    }));

    expect(declarations[0]).toMatchObject({ comment: ["First number"] });
  });
});

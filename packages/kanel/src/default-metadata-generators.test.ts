import { beforeEach, describe, expect, it, vi } from "vitest";

import { defaultGenerateIdentifierType } from "./default-metadata-generators";
import type { GenerateIdentifierTypeV3 } from "./metadata-types";
import type { InstantiatedConfig } from "./config-types";
import { createTestContext, runWithContextSync } from "./context";
import { runWithPgTsGeneratorContextSync } from "./generators/pgTsGeneratorContext";
import type { PgTsGeneratorContext } from "./generators/pgTsGeneratorContext";

// Mocked InstantiatedConfig
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

describe("defaultGenerateIdentifierType", () => {
  let testContext: ReturnType<typeof createTestContext>;
  let pgTsContext: PgTsGeneratorContext;

  beforeEach(() => {
    testContext = createTestContext(instantiatedConfig);
    pgTsContext = {
      typeMap: {},
      getMetadata: instantiatedConfig.getMetadata as any,
      getPropertyMetadata: instantiatedConfig.getPropertyMetadata as any,
      generateIdentifierType: instantiatedConfig.generateIdentifierType as any,
      propertySortFunction: instantiatedConfig.propertySortFunction as any,
    };
  });

  it("generates correct identifier type", () => {
    const result = runWithContextSync(testContext, () =>
      runWithPgTsGeneratorContextSync(pgTsContext, () =>
        defaultGenerateIdentifierType(
          ...([
            { name: "thing_id", type: { kind: "base", fullName: "text" } },
            { name: "my_things", schemaName: "public" },
            { typeMap: {} },
          ] as Parameters<GenerateIdentifierTypeV3>),
        ),
      ),
    );

    expect(result).toMatchObject({
      declarationType: "typeDeclaration",
      comment: ["Identifier type for public.my_things"],
      name: "MyThingsThingId",
      typeDefinition: ["unknown & { __brand: 'public.my_things' }"],
    });
  });

  it("generates correct identifier type with special characters", () => {
    const result = runWithContextSync(testContext, () =>
      runWithPgTsGeneratorContextSync(pgTsContext, () =>
        defaultGenerateIdentifierType(
          ...([
            { name: "special_col!'.", type: { kind: "base", fullName: "text" } },
            { name: "special_table!'.", schemaName: "special_schema!'." },
            { typeMap: {} },
          ] as Parameters<GenerateIdentifierTypeV3>),
        ),
      ),
    );

    expect(result).toMatchObject({
      declarationType: "typeDeclaration",
      comment: ["Identifier type for special_schema!'..special_table!'."],
      name: "SpecialTableSpecialCol",
      typeDefinition: [
        "unknown & { __brand: 'special_schema!'..special_table!'.' }",
      ],
    });
  });
});


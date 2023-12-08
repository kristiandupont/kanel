import { describe, expect, it } from "vitest";

import { defaultGenerateIdentifierType } from "./default-metadata-generators";
import { GenerateIdentifierType } from "./metadata-types";

describe("defaultGenerateIdentifierType", () => {
  it("generates correct identifier type", () => {
    const result = defaultGenerateIdentifierType(
      ...([
        { name: "thing_id", type: { kind: "base", fullName: "text" } },
        { name: "my_things", schemaName: "public" },
        { typeMap: {} },
      ] as Parameters<GenerateIdentifierType>),
    );

    expect(result).toMatchObject({
      declarationType: "typeDeclaration",
      comment: ["Identifier type for public.my_things"],
      name: "MyThingsThingId",
      typeDefinition: ["unknown & { __brand: 'MyThingsThingId' }"],
    });
  });

  it("generates correct identifier type with special characters", () => {
    const result = defaultGenerateIdentifierType(
      ...([
        { name: "special_col!'.", type: { kind: "base", fullName: "text" } },
        { name: "special_table!'.", schemaName: "special_schema!'." },
        { typeMap: {} },
      ] as Parameters<GenerateIdentifierType>),
    );

    expect(result).toMatchObject({
      declarationType: "typeDeclaration",
      comment: ["Identifier type for special_schema!'..special_table!'."],
      name: "SpecialTableSpecialCol",
      typeDefinition: ["unknown & { __brand: 'SpecialTableSpecialCol' }"],
    });
  });
});

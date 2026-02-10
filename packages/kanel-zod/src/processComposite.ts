import type { ConstantDeclaration, TypeImport, TypeMap } from "kanel";
import { escapeName } from "kanel";
import { usePgTsGeneratorContext } from "kanel/build/generators/pgTsGeneratorContext";
import type { CompositeDetails } from "kanel/build/generators/composite-types";

import generateProperties from "./generateProperties";
import type { GetZodSchemaMetadata } from "./GenerateZodSchemasConfig";
import zImport from "./zImport";

function makeDeclaration(
  c: CompositeDetails,
  generateFor: "selector" | "initializer" | "mutator",
  nonCompositeTypeImports: Record<string, TypeImport>,
  compositeTypeImports: Record<string, TypeImport>,
  identifierTypeImports: Record<string, TypeImport>,
  getZodSchemaMetadata: GetZodSchemaMetadata,
  zodTypeMap: TypeMap,
  castToSchema: boolean,
) {
  const pgTsContext = usePgTsGeneratorContext();

  const { name, comment } = getZodSchemaMetadata(c, generateFor);

  const { name: typescriptTypeName } = pgTsContext.getMetadata(c, generateFor);

  const properties = generateProperties(
    c,
    generateFor,
    nonCompositeTypeImports,
    compositeTypeImports,
    identifierTypeImports,
    zodTypeMap,
  );

  const typeImports: TypeImport[] = [zImport];

  // "satisfies" still presents problems because of https://github.com/colinhacks/zod/issues/1628
  // Casting works but removes the ability to use .extend, .omit, .omit, etc.
  // A better solution (TODO) is to cast like this:
  // export const messageEmbedding =
  // z.object({
  //   id: messageEmbeddingId,
  //   message_id: messageId,
  //   conversation_id: conversationId,
  //   embedding: z.array(z.number()).nullable(),
  // })  as unknown as z.ZodObject<{
  //   id: z.ZodType<MessageEmbeddingId>,
  //   message_id: z.ZodType<MessageId>,
  //   conversation_id: z.ZodType<ConversationId>,
  //   embedding: z.ZodNullable<z.ZodArray<z.ZodType<number>>>,
  // }>;

  const value = [
    "z.object({",
    ...properties.map((p) => `  ${escapeName(p.name)}: ${p.value},`),
  ];
  if (castToSchema) {
    value.push(`}) as unknown as z.Schema<${typescriptTypeName}>`);
  } else {
    value.push("})");
  }
  properties.forEach((p) => {
    typeImports.push(...p.typeImports);
  });

  const declaration: ConstantDeclaration = {
    declarationType: "constant",
    comment,
    typeImports,
    name,
    type: undefined,
    value,
    exportAs: "named",
  };
  return declaration;
}

const processComposite = (
  c: CompositeDetails,
  getZodSchemaMetadata: GetZodSchemaMetadata,
  zodTypeMap: TypeMap,
  castToSchema: boolean,
  nonCompositeTypeImports: Record<string, TypeImport>,
  compositeTypeImports: Record<string, TypeImport>,
  identifierTypeImports: Record<string, TypeImport>,
): ConstantDeclaration[] => {
  const declarations: ConstantDeclaration[] = [];

  const selectorDeclaration: ConstantDeclaration = makeDeclaration(
    c,
    "selector",
    nonCompositeTypeImports,
    compositeTypeImports,
    identifierTypeImports,
    getZodSchemaMetadata,
    zodTypeMap,
    castToSchema,
  );
  declarations.push(selectorDeclaration);

  if (c.kind === "table") {
    const initializerDeclaration: ConstantDeclaration = makeDeclaration(
      c,
      "initializer",
      nonCompositeTypeImports,
      compositeTypeImports,
      identifierTypeImports,
      getZodSchemaMetadata,
      zodTypeMap,
      castToSchema,
    );
    declarations.push(initializerDeclaration);

    const mutatorDeclaration: ConstantDeclaration = makeDeclaration(
      c,
      "mutator",
      nonCompositeTypeImports,
      compositeTypeImports,
      identifierTypeImports,
      getZodSchemaMetadata,
      zodTypeMap,
      castToSchema,
    );
    declarations.push(mutatorDeclaration);
  }

  return declarations;
};

export default processComposite;

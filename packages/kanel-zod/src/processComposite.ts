import type {
  ConstantDeclaration,
  InstantiatedConfig,
  TypeImport,
} from "kanel";
import { escapeName } from "kanel";
import type { CompositeDetails } from "kanel/build/generators/composite-types";

import generateProperties from "./generateProperties";
import type { GenerateZodSchemasConfig } from "./GenerateZodSchemasConfig";
import zImport from "./zImport";

function makeDeclaration(
  instantiatedConfig: InstantiatedConfig,
  c: CompositeDetails,
  generateFor: "selector" | "initializer" | "mutator",
  nonCompositeTypeImports: Record<string, TypeImport>,
  identifierTypeImports: Record<string, TypeImport>,
  config: GenerateZodSchemasConfig,
) {
  const { name, comment } = config.getZodSchemaMetadata(
    c,
    generateFor,
    instantiatedConfig,
  );

  const { name: typescriptTypeName } = instantiatedConfig.getMetadata(
    c,
    generateFor,
    instantiatedConfig,
  );

  const properties = generateProperties(
    c,
    generateFor,
    nonCompositeTypeImports,
    identifierTypeImports,
    config,
    instantiatedConfig,
  );

  const typeImports: TypeImport[] = [zImport];

  // "satisfies" still presents problems because of https://github.com/colinhacks/zod/issues/1628
  // Casting works but removes the ability to use .extend, .omit, etc.
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
  if (config.castToSchema) {
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
  config: GenerateZodSchemasConfig,
  instantiatedConfig: InstantiatedConfig,
  nonCompositeTypeImports: Record<string, TypeImport>,
  identifierTypeImports: Record<string, TypeImport>,
): ConstantDeclaration[] => {
  const declarations: ConstantDeclaration[] = [];

  const selectorDeclaration: ConstantDeclaration = makeDeclaration(
    instantiatedConfig,
    c,
    "selector",
    nonCompositeTypeImports,
    identifierTypeImports,
    config,
  );
  declarations.push(selectorDeclaration);

  if (c.kind === "table") {
    const initializerDeclaration: ConstantDeclaration = makeDeclaration(
      instantiatedConfig,
      c,
      "initializer",
      nonCompositeTypeImports,
      identifierTypeImports,
      config,
    );
    declarations.push(initializerDeclaration);

    const mutatorDeclaration: ConstantDeclaration = makeDeclaration(
      instantiatedConfig,
      c,
      "mutator",
      nonCompositeTypeImports,
      identifierTypeImports,
      config,
    );
    declarations.push(mutatorDeclaration);
  }

  return declarations;
};

export default processComposite;

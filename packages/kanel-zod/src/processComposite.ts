import {
  ConstantDeclaration,
  escapeName,
  InstantiatedConfig,
  TypeImport,
} from "kanel";
import { CompositeDetails } from "kanel/build/generators/composite-types";

import generateProperties from "./generateProperties";
import { GenerateZodSchemasConfig } from "./GenerateZodSchemasConfig";
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

  // This still presents problems because of https://github.com/colinhacks/zod/issues/1628
  const value = [
    "z.object({",
    ...properties.map((p) => `  ${escapeName(p.name)}: ${p.value},`),
    config.applySatisfies
      ? `}) satisfies z.ZodType<${typescriptTypeName}>;`
      : "});",
  ];

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

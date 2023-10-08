import {
  escapeName,
  GenericDeclaration,
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

  // TODO: Change this to ${name} = z.object(...) satisfies ${typescriptTypeName}
  // But not until there is a solution to https://github.com/colinhacks/zod/issues/1628
  const lines: string[] = [
    `export const ${name}: z.Schema<${typescriptTypeName}> = z.object({`,
    ...properties.map((p) => `  ${escapeName(p.name)}: ${p.value},`),
    "}) as any;",
  ];

  properties.forEach((p) => {
    typeImports.push(...p.typeImports);
  });

  const declaration: GenericDeclaration = {
    declarationType: "generic",
    comment,
    typeImports,
    lines,
  };
  return declaration;
}

const processComposite = (
  c: CompositeDetails,
  config: GenerateZodSchemasConfig,
  instantiatedConfig: InstantiatedConfig,
  nonCompositeTypeImports: Record<string, TypeImport>,
  identifierTypeImports: Record<string, TypeImport>,
): GenericDeclaration[] => {
  const declarations: GenericDeclaration[] = [];

  const selectorDeclaration: GenericDeclaration = makeDeclaration(
    instantiatedConfig,
    c,
    "selector",
    nonCompositeTypeImports,
    identifierTypeImports,
    config,
  );
  declarations.push(selectorDeclaration);

  if (c.kind === "table") {
    const initializerDeclaration: GenericDeclaration = makeDeclaration(
      instantiatedConfig,
      c,
      "initializer",
      nonCompositeTypeImports,
      identifierTypeImports,
      config,
    );
    declarations.push(initializerDeclaration);

    const mutatorDeclaration: GenericDeclaration = makeDeclaration(
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

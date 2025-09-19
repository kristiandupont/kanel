import type { DomainDetails, Schema } from "extract-pg-schema";
import { tryParse } from "tagged-comment-parser";

import { useKanelContext } from "../context";
import type { Declaration, TypeDeclaration } from "../declaration-types";
import type { Path } from "../Output";
import type Output from "../Output";
import type TypeDefinition from "../TypeDefinition";
import type TypeImport from "../TypeImport";

const makeMapper =
  () =>
  (
    domainDetails: DomainDetails,
  ): { path: Path; declaration: Declaration } | undefined => {
    const { instantiatedConfig } = useKanelContext();

    // If a domain has a @type tag in the comment,
    // we will use that type instead of a generated one.
    const { tags } = tryParse(domainDetails.comment);
    if (tags?.type) {
      return undefined;
    }

    const { name, comment, path } = instantiatedConfig.getMetadata(
      domainDetails,
      undefined,
      instantiatedConfig,
    );

    let typeDefinition: string[] = [];
    const typeImports: TypeImport[] = [];

    const mapped: TypeDefinition =
      instantiatedConfig.typeMap[domainDetails.innerType];
    if (!mapped) {
      typeDefinition = ["unknown"];
      console.warn(
        `Domain '${name}' has unknown type '${domainDetails.innerType}'`,
      );
    } else if (typeof mapped === "string") {
      typeDefinition = [mapped];
    } else {
      typeDefinition = [mapped.name];
      typeImports.push(...mapped.typeImports);
    }

    const declaration: TypeDeclaration = {
      declarationType: "typeDeclaration",
      name,
      comment,
      exportAs: "default",
      typeDefinition,
      typeImports,
    };
    return { path, declaration };
  };

const domainsGenerator = (schema: Schema, outputAcc: Output): Output => {
  const declarations = schema.domains?.map(makeMapper()) ?? [];
  return declarations.reduce((acc, elem) => {
    if (elem === undefined) return acc;
    const { path, declaration } = elem;
    const existing = acc[path];
    if (existing) {
      existing.declarations.push(declaration);
    } else {
      acc[path] = {
        declarations: [declaration],
      };
    }
    return acc;
  }, outputAcc);
};

export default domainsGenerator;

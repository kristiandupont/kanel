import type { DomainDetails, Schema } from "extract-pg-schema";

import { usePgTsGeneratorContext } from "./pgTsGeneratorContext";
import {
  registerTsDeclaration,
  type TsDeclaration,
  type TypeDeclaration,
} from "../ts-utilities/ts-declaration-types";
import type { Path } from "../Output";
import type Output from "../Output";
import type TypeDefinition from "../ts-utilities/TypeDefinition";
import type TypeImport from "../ts-utilities/TypeImport";

const makeMapper =
  () =>
  (
    domainDetails: DomainDetails,
  ): { path: Path; declaration: TsDeclaration } => {
    const generatorContext = usePgTsGeneratorContext();

    const { name, comment, path } = generatorContext.getMetadata(
      domainDetails,
      undefined,
    );

    let typeDefinition: string[] = [];
    const typeImports: TypeImport[] = [];

    const mapped: TypeDefinition =
      generatorContext.typeMap[domainDetails.innerType];
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
  return declarations.reduce(
    (acc, elem) => registerTsDeclaration(acc, elem.path, elem.declaration),
    outputAcc,
  );
};

export default domainsGenerator;

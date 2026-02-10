import type { EnumDetails, Schema } from "extract-pg-schema";

import { useKanelContext } from "../context";
import { usePgTsGeneratorContext } from "./pgTsGeneratorContext";
import {
  type TsDeclaration,
  type EnumDeclaration,
  type TypeDeclaration,
  registerTsDeclaration,
} from "../ts-utilities/ts-declaration-types";
import type { Path } from "../Output";
import type Output from "../Output";

type EnumStyle = "enum" | "literal-union";

const makeMapper =
  (style: EnumStyle) =>
  (enumDetails: EnumDetails): { path: Path; declaration: TsDeclaration } => {
    const generatorContext = usePgTsGeneratorContext();

    const { name, comment, path } = generatorContext.getMetadata(
      enumDetails,
      undefined,
    );

    if (style === "literal-union") {
      const declaration: TypeDeclaration = {
        declarationType: "typeDeclaration",
        name,
        comment,
        exportAs: "default",
        typeDefinition: [
          "", // Start definition on new line
          ...enumDetails.values.map((value) => `| '${value}'`),
        ],
      };
      return { path, declaration };
    } else {
      const declaration: EnumDeclaration = {
        declarationType: "enum",
        comment,
        name,
        exportAs: "default",
        values: enumDetails.values,
      };
      return { path, declaration };
    }
  };

const enumsGenerator = (schema: Schema, outputAcc: Output): Output => {
  const { typescriptConfig } = useKanelContext();
  const declarations =
    schema.enums?.map(makeMapper(typescriptConfig.enumStyle)) ?? [];
  return declarations.reduce(
    (acc, elem) => registerTsDeclaration(acc, elem.path, elem.declaration),
    outputAcc,
  );
};

export default enumsGenerator;

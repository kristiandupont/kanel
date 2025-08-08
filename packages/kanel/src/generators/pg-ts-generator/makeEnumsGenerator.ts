import assert from "node:assert";

import type { EnumDetails, Schema } from "extract-pg-schema";

import type {
  Declaration,
  EnumDeclaration,
  TypeDeclaration,
} from "../../declaration-types";
import type { Path } from "../../Output";
import type Output from "../../Output";
import { useKanelContext } from "../../context";

const mapper = (
  enumDetails: EnumDetails,
): { path: Path; declaration: Declaration } | undefined => {
  const context = useKanelContext();
  const config = context.config;
  const style = config.enumStyle;
  const { name, comment, path } = config.getMetadata(enumDetails, undefined);

  if (style === "type") {
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

const makeEnumsGenerator =
  () =>
  (schema: Schema, outputAcc: Output): Output => {
    const declarations = schema.enums?.map(mapper) ?? [];
    return declarations.reduce((acc, elem) => {
      if (elem === undefined) return acc;
      const { path, declaration } = elem;
      const existing = acc[path];
      // existing must be a TypescriptFileContents
      assert(existing.filetype === "typescript");

      if (existing) {
        existing.declarations.push(declaration);
      } else {
        acc[path] = {
          filetype: "typescript",
          declarations: [declaration],
        };
      }
      return acc;
    }, outputAcc);
  };

export default makeEnumsGenerator;

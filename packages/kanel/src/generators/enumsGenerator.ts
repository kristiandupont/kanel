import type { EnumDetails, Schema } from "extract-pg-schema";
import { tryParse } from "tagged-comment-parser";

import { useKanelContext } from "../context";
import type {
  Declaration,
  EnumDeclaration,
  TypeDeclaration,
} from "../declaration-types";
import type { Path } from "../Output";
import type Output from "../Output";

type EnumStyle = "enum" | "type";

const makeMapper =
  (style: EnumStyle) =>
  (
    enumDetails: EnumDetails,
  ): { path: Path; declaration: Declaration } | undefined => {
    const { instantiatedConfig } = useKanelContext();

    // If an enum has a @type tag in the comment,
    // we will use that type instead of a generated one.
    const { tags } = tryParse(enumDetails.comment);
    if (tags?.type) {
      return undefined;
    }

    const { name, comment, path } = instantiatedConfig.getMetadata(
      enumDetails,
      undefined,
      instantiatedConfig,
    );

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

const enumsGenerator = (schema: Schema, outputAcc: Output): Output => {
  const { instantiatedConfig } = useKanelContext();
  const declarations =
    schema.enums?.map(makeMapper(instantiatedConfig.enumStyle)) ?? [];
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

export default enumsGenerator;

import type { EnumDetails, Schema } from "extract-pg-schema";
import { tryParse } from "tagged-comment-parser";

import { useKanelContext } from "../context";
import {
  type TsDeclaration,
  type EnumDeclaration,
  type TypeDeclaration,
  registerTsDeclaration,
} from "../ts-utilities/ts-declaration-types";
import type { Path } from "../Output";
import type Output from "../Output";

type EnumStyle = "enum" | "type";

const makeMapper =
  (style: EnumStyle) =>
  (
    enumDetails: EnumDetails,
  ): { path: Path; declaration: TsDeclaration } | undefined => {
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
  return declarations.reduce(
    (acc, elem) => registerTsDeclaration(acc, elem.path, elem.declaration),
    outputAcc,
  );
};

export default enumsGenerator;

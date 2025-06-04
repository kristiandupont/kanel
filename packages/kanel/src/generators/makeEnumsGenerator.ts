import type { EnumDetails, Schema } from "extract-pg-schema";
import { tryParse } from "tagged-comment-parser";

import type { InstantiatedConfig } from "../config-types";
import type {
  ConstArrayDeclaration,
  Declaration,
  EnumDeclaration,
  TypeDeclaration,
} from "../declaration-types";
import type { Path } from "../Output";
import type Output from "../Output";

type EnumStyle = "enum" | "type" | "constArray";

const makeMapper =
  (style: EnumStyle, config: InstantiatedConfig) =>
  (
    enumDetails: EnumDetails,
  ): { path: Path; declaration: Declaration } | undefined => {
    // If an enum has a @type tag in the comment,
    // we will use that type instead of a generated one.
    const { tags } = tryParse(enumDetails.comment);
    if (tags?.type) {
      return undefined;
    }

    const { name, comment, path } = config.getMetadata(
      enumDetails,
      undefined,
      config,
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
    } else if (style === "constArray") {
      const declaration: ConstArrayDeclaration = {
        declarationType: "constArray",
        comment,
        name,
        exportAs: "default",
        values: enumDetails.values,
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
  (config: InstantiatedConfig) =>
  (schema: Schema, outputAcc: Output): Output => {
    const declarations =
      schema.enums?.map(makeMapper(config.enumStyle, config)) ?? [];
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

export default makeEnumsGenerator;

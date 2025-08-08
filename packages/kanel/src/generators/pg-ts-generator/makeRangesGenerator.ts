import assert from "node:assert";

import type { RangeDetails, Schema } from "extract-pg-schema";
import { tryParse } from "tagged-comment-parser";

import type { Declaration, TypeDeclaration } from "../../declaration-types";
import type { Path } from "../../Output";
import type Output from "../../Output";
import { useKanelContext } from "../../context";

const mapper = (
  rangeDetails: RangeDetails,
): { path: Path; declaration: Declaration } | undefined => {
  const context = useKanelContext();
  const config = context.config;

  // If a range has a @type tag in the comment,
  // we will use that type instead of a generated one.
  const { tags } = tryParse(rangeDetails.comment);
  if (tags?.type) {
    return undefined;
  }

  const { name, comment, path } = config.getMetadata(rangeDetails, undefined);

  const declaration: TypeDeclaration = {
    declarationType: "typeDeclaration",
    name,
    comment,
    exportAs: "default",
    // typeDefinition: [`[lowerBound: ${rType}, upperBound: ${rType}]`],
    typeDefinition: ["string"],
    typeImports: [],
  };
  return { path, declaration };
};

const makeRangesGenerator =
  () =>
  (schema: Schema, outputAcc: Output): Output => {
    const declarations = schema.ranges?.map(mapper) ?? [];
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

export default makeRangesGenerator;

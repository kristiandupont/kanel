import type { RangeDetails, Schema } from "extract-pg-schema";
import { tryParse } from "tagged-comment-parser";

import { useKanelContext } from "../context";
import type {
  TsDeclaration,
  TypeDeclaration,
} from "../ts-utilities/ts-declaration-types";
import type { Path } from "../Output";
import type Output from "../Output";

const makeMapper =
  () =>
  (
    rangeDetails: RangeDetails,
  ): { path: Path; declaration: TsDeclaration } | undefined => {
    const { instantiatedConfig } = useKanelContext();

    // If a range has a @type tag in the comment,
    // we will use that type instead of a generated one.
    const { tags } = tryParse(rangeDetails.comment);
    if (tags?.type) {
      return undefined;
    }

    const { name, comment, path } = instantiatedConfig.getMetadata(
      rangeDetails,
      undefined,
      instantiatedConfig,
    );

    // let rType: string;
    // const typeImports: TypeImport[] = [];

    // const mapped: TypeDefinition = instantiatedConfig.typeMap[rangeDetails.innerType];
    // if (!mapped) {
    //   rType = 'unknown';
    //   console.warn(
    //     `Range '${name}' has unknown type '${rangeDetails.innerType}'`
    //   );
    // } else if (typeof mapped === 'string') {
    //   rType = mapped;
    // } else {
    //   rType = mapped.name;
    //   typeImports.push(...mapped.typeImports);
    // }

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

const rangesGenerator = (schema: Schema, outputAcc: Output): Output => {
  const declarations = schema.ranges?.map(makeMapper()) ?? [];
  return declarations.reduce((acc, elem) => {
    if (elem === undefined) return acc;
    const { path, declaration } = elem;
    const existing = acc[path];
    if (existing) {
      if (existing.fileType !== "typescript") {
        throw new Error(
          `Path ${path} already exists and is not a typescript file`,
        );
      }
      existing.declarations.push(declaration);
    } else {
      acc[path] = {
        fileType: "typescript",
        declarations: [declaration],
      };
    }
    return acc;
  }, outputAcc);
};

export default rangesGenerator;

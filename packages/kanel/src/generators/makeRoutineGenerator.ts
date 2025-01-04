import type { Kind, Schema } from "extract-pg-schema";
import type { FunctionDetails } from "extract-pg-schema/build/kinds/extractFunction";
import type { ProcedureDetails } from "extract-pg-schema/build/kinds/extractProcedure";

import type { InstantiatedConfig } from "../config-types";
import type { Declaration, InterfaceDeclaration } from "../declaration-types";
import type { Path } from "../Output";
import type Output from "../Output";

type RoutineDetails = FunctionDetails | ProcedureDetails;

const makeMapper =
  (config: InstantiatedConfig) =>
  (
    routineDetails: RoutineDetails,
  ): { path: Path; declaration: Declaration }[] => {
    const metadata = config.getRoutineMetadata?.(routineDetails, config);
    if (!metadata) return undefined;
    const {
      parametersName,
      parameters,
      returnTypeName,
      returnTypeComment,
      returnTypeOverride: returnTypeTypeOverride,
      path,
    } = metadata;

    const parameterDeclaration: InterfaceDeclaration = {
      declarationType: "interface",
      name: parametersName,
      comment: parameters.map(({ comment }) => comment).flat(),
      exportAs: "named",
      properties: parameters.map(
        ({ name, typeOverride, nullableOverride, optionalOverride }) => ({
          name,
          dimensions: 0,
          isNullable: nullableOverride ?? false,
          isOptional: optionalOverride ?? false,
          typeName: "unknown",
        }),
      ),
    };

    const returnTypeDeclaration: Declaration = returnTypeTypeOverride
      ? {
          declarationType: "typeDeclaration",
          name: returnTypeName,
          comment: returnTypeComment,
          typeDefinition: [returnTypeTypeOverride.toString()],
          exportAs: "named",
        }
      : {
          declarationType: "interface",
          name: returnTypeName,
          comment: returnTypeComment,
          exportAs: "named",
          properties: [],
        };

    return [
      { path, declaration: parameterDeclaration },
      { path, declaration: returnTypeDeclaration },
    ];
  };

const makeRoutineGenerator =
  (kind: Kind, config: InstantiatedConfig) =>
  (schema: Schema, outputAcc: Output): Output => {
    const mapper = makeMapper(config);
    const declarations: { path: string; declaration: Declaration }[] =
      (schema[`${kind}s`] as RoutineDetails[])?.map(mapper).flat() ?? [];
    return declarations.reduce((acc, { path, declaration }) => {
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

export default makeRoutineGenerator;

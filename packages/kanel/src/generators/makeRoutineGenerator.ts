import type { Kind, Schema } from "extract-pg-schema";
import type { FunctionDetails } from "extract-pg-schema/build/kinds/extractFunction";
import type { ProcedureDetails } from "extract-pg-schema/build/kinds/extractProcedure";

import type { InstantiatedConfig } from "../config-types";
import type {
  TsDeclaration,
  InterfaceDeclaration,
} from "../ts-declaration-types";
import type { Path } from "../Output";
import type Output from "../Output";
import type TypeMap from "../TypeMap";

type RoutineDetails = FunctionDetails | ProcedureDetails;

function resolveSimpleType(pgType: string, typeMap: TypeMap) {
  if (pgType.endsWith("[]")) {
    const elementType = pgType.slice(0, -2);
    const resolved = resolveSimpleType(elementType, typeMap);
    if (typeof resolved === "string") {
      return resolved + "[]";
    } else {
      return {
        ...resolved,
        name: resolved.name + "[]",
      };
    }
  } else {
    if (!typeMap[pgType]) {
      console.warn(`Unknown type '${pgType}'`);
    }
    return typeMap[pgType] ?? "unknown";
  }
}

const makeMapper =
  (config: InstantiatedConfig) =>
  (
    routineDetails: RoutineDetails,
  ): { path: Path; declaration: TsDeclaration }[] => {
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
        ({ name, typeOverride, nullableOverride, optionalOverride }, index) => {
          let t = typeOverride;
          if (!t) {
            const sourceTypeName = routineDetails.parameters[index].type;
            if (sourceTypeName) {
              t = resolveSimpleType(sourceTypeName, config.typeMap);
            }
          }
          const typeName = typeof t === "string" ? t : t.name;
          return {
            name,
            dimensions: 0,
            isNullable: nullableOverride ?? false,
            isOptional: optionalOverride ?? false,
            typeName,
          };
        },
      ),
    };

    let returnTypeDeclaration: TsDeclaration | undefined;
    if (returnTypeTypeOverride) {
      returnTypeDeclaration = {
        declarationType: "typeDeclaration",
        name: returnTypeName,
        comment: returnTypeComment,
        typeDefinition: [returnTypeTypeOverride.toString()],
        exportAs: "named",
      };
    } else {
      if ("returnType" in routineDetails) {
        const returnType = routineDetails.returnType;
        if (typeof returnType === "string") {
          if (returnType in config.typeMap) {
            const typeDef = config.typeMap[returnType];
            let typeDefinitionLine: string;
            if (typeof typeDef === "string") {
              typeDefinitionLine = typeDef;
            } else {
              typeDefinitionLine = typeDef.name;
            }
            returnTypeDeclaration = {
              declarationType: "typeDeclaration",
              name: returnTypeName,
              comment: returnTypeComment,
              typeDefinition: [typeDefinitionLine],
              exportAs: "named",
            };
          }
        } else {
          if (returnType.type === "table") {
            returnTypeDeclaration = {
              declarationType: "interface",
              name: returnTypeName,
              comment: returnTypeComment,
              exportAs: "named",
              properties: returnType.columns.map((column) => ({
                name: column.name,
                typeName: resolveSimpleType(column.type, config.typeMap),
                dimensions: 0,
                isNullable: false,
                isOptional: false,
              })),
            };
          }
        }
      }
    }

    return [
      { path, declaration: parameterDeclaration },
      ...(returnTypeDeclaration
        ? [{ path, declaration: returnTypeDeclaration }]
        : []),
    ];
  };

const makeRoutineGenerator =
  (kind: Kind, config: InstantiatedConfig) =>
  (schema: Schema, outputAcc: Output): Output => {
    const mapper = makeMapper(config);
    const declarations: { path: string; declaration: TsDeclaration }[] =
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

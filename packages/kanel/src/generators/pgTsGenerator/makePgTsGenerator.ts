import type { Awaitable } from "../../Awaitable";
import { useKanelContext } from "../../context";
import type {
  GetMetadata,
  GetPropertyMetadata,
  GenerateIdentifierType,
  GetRoutineMetadata,
} from "./metadata-types";
import type Output from "../../Output";
import type TypeMap from "./TypeMap";
import defaultTypeMap from "./defaultTypeMap";
import type { CompositeProperty } from "./sub-generators/composite-types";
import makeCompositeGenerator from "./sub-generators/makeCompositeGenerator";
import makeDomainsGenerator from "./sub-generators/makeDomainsGenerator";
import makeEnumsGenerator from "./sub-generators/makeEnumsGenerator";
import makeRangesGenerator from "./sub-generators/makeRangesGenerator";
import makeRoutineGenerator from "./sub-generators/makeRoutineGenerator";

type Generator = () => Awaitable<Output>;

export type PgTsConfig = {
  customTypeMap?: TypeMap;
  getMetadata?: GetMetadata;
  getPropertyMetadata?: GetPropertyMetadata;
  generateIdentifierType?: GenerateIdentifierType;
  propertySortFunction?: (a: CompositeProperty, b: CompositeProperty) => number;
  getRoutineMetadata?: GetRoutineMetadata;
  resolveViews?: boolean;
};

export const makePgTsGenerator =
  (config: PgTsConfig): Generator =>
  async () => {
    const { config: kanelConfig } = useKanelContext();

    const typeMap: TypeMap = {
      ...defaultTypeMap,
      ...config.customTypeMap,
    };

    const generators = [
      makeCompositeGenerator("table"),
      makeCompositeGenerator("foreignTable"),
      makeCompositeGenerator("view"),
      makeCompositeGenerator("materializedView"),
      makeCompositeGenerator("compositeType"),
      makeEnumsGenerator(),
      makeRangesGenerator(),
      makeDomainsGenerator(),
      makeRoutineGenerator("function"),
      makeRoutineGenerator("procedure"),
    ];
    let output: Output = {};
    Object.values(schemas).forEach((schema) => {
      generators.forEach((generator) => {
        output = generator(schema, output);
      });
    });
    return {};
  };

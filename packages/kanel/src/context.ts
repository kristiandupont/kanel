import { AsyncLocalStorage } from "node:async_hooks";
import type { Schema } from "extract-pg-schema";
import type { Config, InstantiatedConfig } from "./config-types";
import type { TypescriptConfig } from "./config-types-v4";

/**
 * V4 Kanel Context.
 * Contains clearly separated concerns with an optional backwards-compatibility field.
 *
 * Note: We use an intersection type with optional `instantiatedConfig` rather than
 * a union type, since AsyncLocalStorage doesn't preserve type narrowing across
 * async boundaries.
 */
export type KanelContext = {
  /** General TypeScript configuration affecting all TypeScript generators */
  typescriptConfig: TypescriptConfig;

  /** Original config as passed to processDatabase (V3 or V4) */
  config: Config;

  /** Extracted database schemas */
  schemas: Record<string, Schema>;

  /**
   * @deprecated Only present when running V3 configs for backwards compatibility.
   * V4 code should use the top-level context fields instead.
   */
  instantiatedConfig?: InstantiatedConfig;
};

const asyncLocalStorage = new AsyncLocalStorage<KanelContext>();

export const useKanelContext = (): KanelContext => {
  const context = asyncLocalStorage.getStore();
  if (!context) throw new Error("Kanel context not available");
  return context;
};

export const runWithContext = async <T>(
  context: KanelContext,
  fn: () => Promise<T>,
): Promise<T> => asyncLocalStorage.run(context, fn);

/**
 * Creates a test context for V3-style testing.
 * For new tests, prefer creating a full V4 context instead.
 */
export const createTestContext = (
  instantiatedConfig: InstantiatedConfig,
): KanelContext => ({
  typescriptConfig: {
    // V3's "type" maps to V4's "literal"
    enumStyle: instantiatedConfig.enumStyle === "type" ? "literal" : "enum",
    tsModuleFormat: instantiatedConfig.tsModuleFormat,
  },
  config: {
    connection: instantiatedConfig.connection,
    schemas: Object.keys(instantiatedConfig.schemas),
    outputPath: instantiatedConfig.outputPath,
    preDeleteOutputFolder: instantiatedConfig.preDeleteOutputFolder,
    resolveViews: instantiatedConfig.resolveViews,
    enumStyle: instantiatedConfig.enumStyle,
    customTypeMap: instantiatedConfig.typeMap,
  },
  schemas: instantiatedConfig.schemas,
  instantiatedConfig,
});

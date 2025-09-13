import { AsyncLocalStorage } from "node:async_hooks";
import type { Config, InstantiatedSource } from "./config-types";
import type { TsModuleFormat } from "./ts-utilities/TsModuleFormat";

export type KanelContext = {
  config: Config;

  // This is the format specified in the configuration or, if that was "auto", the format
  // Determined from the package.json and tsconfig.json files.
  tsModuleFormat: TsModuleFormat;

  // Sources with fetched contents (schemas, etc.)
  instantiatedSources: Record<string, InstantiatedSource>;

  // This is reserved for generators and hooks to store their own context
  subContext: any;
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

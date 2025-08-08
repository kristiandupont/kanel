import { AsyncLocalStorage } from "async_hooks";

import type { Config, InstantiatedSourceRegistry } from "./config-types";

export interface KanelContext {
  config: Config;
  instantiatedSources: InstantiatedSourceRegistry;
}

const asyncLocalStorage = new AsyncLocalStorage<KanelContext>();

export const useKanelContext = () => {
  const context = asyncLocalStorage.getStore();
  if (!context) throw new Error("Kanel context not available");
  return context;
};

export const runWithContext = async <T>(
  context: KanelContext,
  fn: () => Promise<T>,
): Promise<T> => {
  return asyncLocalStorage.run(context, fn);
};

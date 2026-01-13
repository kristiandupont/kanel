import { AsyncLocalStorage } from "node:async_hooks";
import type { InstantiatedConfig } from "./config-types";

export type KanelContext = {
  instantiatedConfig: InstantiatedConfig;
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

export const createTestContext = (
  instantiatedConfig: InstantiatedConfig,
): KanelContext => ({
  instantiatedConfig,
});

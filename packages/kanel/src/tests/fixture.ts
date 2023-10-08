import {
  afterAll as viAfterAll,
  afterEach as viAfterEach,
  beforeAll as viBeforeAll,
  beforeEach as viBeforeEach,
  describe as viDescribe,
} from "vitest";

// This reason for this weird wrapper around the vitest functions is to enable
// "test hooks": https://kristiandupont.medium.com/test-hooks-be89b760d2db.
// I am hoping they will look into it (https://github.com/vitest-dev/vitest/discussions/1364),
// but for now, this is a workaround.

export { expect, it, test } from "vitest";

export let describe: (name: string, fn: () => void) => void;

let globalScope = "";
const makeDescribeForScope =
  (scope: string) => (name: string, fn: () => void) => {
    viDescribe(name, () => {
      const previousD = describe;
      globalScope = `${scope}/${name}`;
      describe = makeDescribeForScope(globalScope);
      fn();
      describe = previousD;
    });
  };

describe = makeDescribeForScope("");

type HookMap = Record<string, ((() => Promise<void>) | (() => void))[]>;

const makeHook =
  (
    map: HookMap,
    viFunc: (p: () => Promise<void>, timeout?: number) => void,
    type: "before" | "after",
  ) =>
  (fn: (() => Promise<void>) | (() => void), timeout?: number) => {
    if (!map[globalScope]) {
      map[globalScope] = [];

      // Call the function with the scope that is *currently* set,
      // not what it will be when we reach it.
      const closureScope = globalScope;

      viFunc(async () => {
        for (const fn of map[closureScope]) {
          await fn();
        }
      }, timeout);
    }
    if (type === "after") {
      map[globalScope].unshift(fn);
    } else {
      map[globalScope].push(fn);
    }
  };

const beforeEachMap: HookMap = {};
export const beforeEach = makeHook(beforeEachMap, viBeforeEach, "before");

const afterEachMap: HookMap = {};
export const afterEach = makeHook(afterEachMap, viAfterEach, "after");

const beforeAllMap: HookMap = {};
export const beforeAll = makeHook(beforeAllMap, viBeforeAll, "before");

const afterAllMap: HookMap = {};
export const afterAll = makeHook(afterAllMap, viAfterAll, "after");

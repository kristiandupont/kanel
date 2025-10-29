import { expect, it } from "vitest";

import escapeString from "./escapeString";

it.each([
  ["this should be easy"],
  [""],
  [" "],
  ["adam's test"],
  ['"'],
  ["'''"],
  ["' '"],
  ["\"'`\n\t"],
  ["\"'`\n\t".repeat(10)],
])("should escape string: %s", (s) => {
  const f = new Function(`return '${escapeString(s)}'`);
  expect(f()).toBe(s);
});

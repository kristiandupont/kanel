import { expect, it } from "vitest";

import escapeComment from "./escapeComment";

it.each([
  ["an example"],
  ["       "],
  ["\"'`\t"],
  ["/* something */", "/* something *\\/"],
])("should escape string: %s", (s1, s2) => {
  expect(escapeComment(s1)).toBe(s2 ?? s1);
});

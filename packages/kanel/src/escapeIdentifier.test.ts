import { expect, it } from "vitest";

import escapeIdentifier from "./escapeIdentifier";

it.each([
  ["ShouldNotBeChanged"],
  ["alsoShouldNotBeChanged"],
  [" NeedsTrimming ", "NeedsTrimming"],
  [" needsTrimming ", "needsTrimming"],
  ["an example", "AnExample"],
  [" an example", "AnExample"],
  ["an  example", "AnExample"],
  [
    "[example] this is a table! yes, even with symbols: \"'!.Id",
    "ExampleThisIsATableYesEvenWithSymbolsId",
  ],
  ["if", "If"],
])("should escape string: %s -> %s", (s1, s2) => {
  expect(escapeIdentifier(s1)).toBe(s2 ?? s1);
});

it.each([
  ["empty string", ""],
  ["whitespace", " "],
  ["symbols", "\"'`\t"],
])("should throw if unsalvageable: %s", (_, s) => {
  expect(() => escapeIdentifier(s)).toThrow();
});

import path from "node:path";
import { fileURLToPath } from "node:url";

import { fixupConfigRules } from "@eslint/compat";
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  {
    ignores: [
      "**/build",
      "**/example",
      "**/vitest.config.ts",
      "**/docs",
      "**/docs-src",
    ],
  },
  ...fixupConfigRules(compat.extends("@kristiandupont")),
  {
    rules: {
      quotes: "off",
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      "unicorn/import-style": "off",
      "unicorn/no-array-for-each": "off",
      "unicorn/prefer-switch": "off",
      "unicorn/consistent-function-scoping": "off",
      "simple-import-sort/imports": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    languageOptions: {
      parserOptions: {
        project: [
          "./packages/kanel/tsconfig.json",
          "./packages/kanel-knex/tsconfig.json",
          "./packages/kanel-kysely/tsconfig.json",
          "./packages/kanel-seeder/tsconfig.json",
          "./packages/kanel-zod/tsconfig.json",
          "./tsconfig.json",
        ],
        tsconfigRootDir: __dirname,
      },
    },
  },
];

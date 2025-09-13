import type { PostRenderHook } from "../config-types";
import type prettier from "prettier";

type PrettierOptions = Parameters<typeof prettier.format>[1];

const formatWithPrettier =
  (options: PrettierOptions): PostRenderHook =>
  async (path, lines) => {
    if (!path.endsWith(".ts")) {
      return lines;
    }

    try {
      // Try to use the user's version of Prettier first
      const prettier = await import("prettier");
      const prettierOptions = await prettier.resolveConfig(path);
      const formatted = await prettier.format(lines.join("\n"), {
        ...prettierOptions,
        ...options,
      });
      return formatted.split("\n");
    } catch (_error) {
      console.error(
        "Prettier not found. Install prettier as a dev dependency to format generated files",
      );
      return lines;
    }
  };

export default formatWithPrettier;

import type { PostRenderHook } from "../config-types-v4";

/**
 * Post-render hook that formats TypeScript files with Prettier.
 *
 * This hook will automatically format all TypeScript files using Prettier
 * if it's installed in your project. If Prettier is not installed, files
 * will be returned unformatted without errors.
 *
 * The hook respects your project's Prettier configuration (.prettierrc, etc.).
 *
 * @example
 * ```typescript
 * import { makePgTsGenerator, formatWithPrettier } from 'kanel';
 *
 * const config = {
 *   generators: [makePgTsGenerator()],
 *   postRenderHooks: [formatWithPrettier],
 * };
 * ```
 */
const formatWithPrettier: PostRenderHook = async (
  path,
  lines,
): Promise<string[]> => {
  const extension = path.split(".").pop();

  // Only format TypeScript files
  if (!["ts", "tsx"].includes(extension ?? "")) {
    return lines;
  }

  try {
    // Dynamic import to avoid hard dependency
    const prettier = await import("prettier");

    const source = lines.join("\n");

    // Format using user's Prettier config
    const formatted = await prettier.format(source, {
      filepath: path,
    });

    return formatted.split("\n");
  } catch (_error) {
    // Prettier not installed or formatting failed - return unformatted
    // This is intentionally silent to avoid breaking builds when Prettier isn't available
    return lines;
  }
};

export default formatWithPrettier;

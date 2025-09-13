import { existsSync, readFileSync } from "fs";
import { join } from "path/posix";

export type TsModuleFormat = "esm" | "commonjs" | "classic";

export async function detectTsModuleFormat(): Promise<TsModuleFormat> {
  const packageJsonPath = join(process.cwd(), "package.json");

  // Try to detect from package.json first
  if (existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
      if (packageJson.type === "module") {
        return "esm";
      }
      // If type is "commonjs" or not specified, default to commonjs
      return "commonjs";
    } catch (_error) {
      // If package.json is malformed, continue to tsconfig.json check
      console.warn(
        "Failed to parse package.json, falling back to tsconfig.json",
      );
    }
  }

  // Fallback to tsconfig.json
  const tsconfigPath = join(process.cwd(), "tsconfig.json");
  if (existsSync(tsconfigPath)) {
    try {
      const tsconfig = JSON.parse(readFileSync(tsconfigPath, "utf8"));
      const module = tsconfig.compilerOptions?.module;

      if (
        module === "ESNext" ||
        module === "ES2020" ||
        module === "ES2022" ||
        module === "ES2023"
      ) {
        return "esm";
      }
      if (module === "CommonJS" || module === "UMD" || module === "AMD") {
        return "commonjs";
      }
      if (module === "None") {
        return "classic";
      }
    } catch (_error) {
      console.warn("Failed to parse tsconfig.json");
    }
  }

  // Default fallback - assume commonjs for maximum compatibility
  console.info(
    "Could not detect module format from package.json or tsconfig.json, defaulting to commonjs",
  );
  return "commonjs";
}

export function getImportExtension(
  tsModuleFormat: TsModuleFormat,
): ".mjs" | ".cjs" | ".js" | "" {
  if (tsModuleFormat === "esm") {
    return ".mjs";
  }
  if (tsModuleFormat === "commonjs") {
    return ".cjs";
  }
  if (tsModuleFormat === "classic") {
    return ".js";
  }
  return "";
}

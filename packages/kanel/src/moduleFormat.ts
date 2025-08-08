import type { Config } from "./config-types";

export const getModuleFormat = (config: Config) => {
  if (config.moduleFormat === "auto") {
    // Auto-detect based on package.json, tsconfig.json, etc.
    return detectModuleFormat();
  }
  return config.moduleFormat || "auto";
};

export const getOutputExtension = (moduleFormat: string) => {
  switch (moduleFormat) {
    case "esm":
      return ".mts";
    case "commonjs":
      return ".cts";
    case "classic":
      return ".ts";
    default:
      return ".ts";
  }
};

export const getImportExtension = (moduleFormat: string) => {
  switch (moduleFormat) {
    case "esm":
      return ".js";
    case "commonjs":
      return ".cjs";
    case "classic":
      return ""; // No extension for classic TypeScript
    default:
      return ".js";
  }
};

// Auto-detect module format based on project configuration
const detectModuleFormat = (): "esm" | "commonjs" | "classic" => {
  try {
    // Try to read package.json to detect module type
    const fs = require("fs");
    const path = require("path");

    // Look for package.json in current directory and parent directories
    let currentDir = process.cwd();
    let packageJsonPath: string | null = null;

    while (currentDir !== path.dirname(currentDir)) {
      const potentialPath = path.join(currentDir, "package.json");
      if (fs.existsSync(potentialPath)) {
        packageJsonPath = potentialPath;
        break;
      }
      currentDir = path.dirname(currentDir);
    }

    if (packageJsonPath) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
      if (packageJson.type === "module") {
        return "esm";
      }
    }

    // Check for tsconfig.json
    const tsconfigPath = path.join(process.cwd(), "tsconfig.json");
    if (fs.existsSync(tsconfigPath)) {
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf8"));
      const module = tsconfig.compilerOptions?.module;
      if (module === "ESNext" || module === "ES2020" || module === "ES2022") {
        return "esm";
      }
      if (module === "CommonJS") {
        return "commonjs";
      }
    }

    // Default to classic for backward compatibility
    return "classic";
  } catch (error) {
    // If we can't detect, default to classic
    console.warn(
      "Could not auto-detect module format, defaulting to classic:",
      error,
    );
    return "classic";
  }
};

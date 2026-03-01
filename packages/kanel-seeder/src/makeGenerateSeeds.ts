import type { Dirent } from "fs";
import { promises as fs } from "fs";
import { resolve } from "path";
import type { Generator, Output } from "kanel";
import { useKanelContext } from "kanel";
import parseMdconf from "@kristiandupont/mdconf";

import type { SeedInput } from "./seedInput";
import seedInput from "./seedInput";
import preprocessData from "./preprocessData";

export type MakeGenerateSeedsConfig = {
  srcPath: string;
  dstPath: string;
};

const makeGenerateSeeds =
  ({ srcPath, dstPath }: MakeGenerateSeedsConfig): Generator =>
  async (): Promise<Output> => {
    const context = useKanelContext();
    const output: Output = {};

    const allFiles = await fs.readdir(srcPath, { withFileTypes: true });
    const mdconfFiles = allFiles.filter((file) =>
      file.name.endsWith(".mdconf"),
    );

    for (const file of mdconfFiles) {
      const srcFilePath = resolve(srcPath, file.name);
      const contents = await fs.readFile(srcFilePath, "utf-8");
      const parsed = parseMdconf(contents, {
        keyNormalizationFunction: (s: string) => s.toLowerCase(),
        validator: seedInput,
      });

      const generatedFile = processSeedInput(
        parsed,
        context.schemas,
        srcFilePath,
        dstPath,
        file,
      );
      if (generatedFile) {
        output[generatedFile.path] = generatedFile.content;
      }
    }

    return output;
  };

export default makeGenerateSeeds;

function processSeedInput(
  parsed: SeedInput,
  schemas: Record<string, import("extract-pg-schema").Schema>,
  srcFilePath: string,
  dstPath: string,
  file: Dirent,
): { path: string; content: { fileType: "generic"; lines: string[] } } | null {
  const { config, defaults, data: inputData } = parsed;

  if (!config.schema) {
    if (Object.keys(schemas).length === 1) {
      config.schema = Object.keys(schemas)[0];
    } else {
      throw new Error(
        `No schema specified in ${srcFilePath} and no default schema found in config`,
      );
    }
  }

  if (!inputData) {
    throw new Error(`No data found in ${srcFilePath}`);
  }

  const data = preprocessData(
    inputData,
    schemas[config.schema],
    defaults || {},
  );

  const fullPath = resolve(dstPath, file.name.replace(".mdconf", ".js"));

  const lines = [
    'const { makeSeeder } = require("kanel-seeder");',
    "",
    `const data = ${JSON.stringify(data, null, 2)};`,
    "",
    "exports.seed = makeSeeder({ data });",
  ];

  return {
    path: fullPath,
    content: {
      fileType: "generic",
      lines,
    },
  };
}

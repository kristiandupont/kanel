import fs, { existsSync, mkdirSync } from "fs";
import os from "os";
import path, { dirname } from "path";

const writeFile = ({
  fullPath,
  lines,
  ensureFolder = true,
}: {
  fullPath: string;
  lines: string[];
  ensureFolder?: boolean;
}): void => {
  const relativePath = path.relative(process.cwd(), fullPath);
  console.info(` - ${relativePath}`);

  if (ensureFolder) {
    const folder = dirname(fullPath);
    if (!existsSync(folder)) {
      mkdirSync(folder, { recursive: true });
    }
  }

  const content = lines.join(os.EOL);
  fs.writeFileSync(fullPath, content, "utf8");
};

export default writeFile;

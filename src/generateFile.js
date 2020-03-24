import os from 'os';
import path from 'path';
import fs from 'fs';

const generateFile = ({ fullPath, lines }) => {
  const relativePath = path.relative(process.cwd(), fullPath);
  console.log(` - ${relativePath}`);
  const allLines = [
    "// Automatically generated. Don't change this file manually.",
    '',
    ...lines,
    '',
  ];

  const content = allLines.join(os.EOL);
  fs.writeFileSync(fullPath, content, 'utf-8');
};

export default generateFile;

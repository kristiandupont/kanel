import os from 'os';
import path from 'path';
import fs from 'fs';
import { logger } from './logger';

const generateFile = ({ fullPath, lines }) => {
  const relativePath = path.relative(process.cwd(), fullPath);
  logger.log(` - ${relativePath}`);
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

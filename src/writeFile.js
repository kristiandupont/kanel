import os from 'os';
import path from 'path';
import fs from 'fs';
import { pipe } from 'ramda';
import { logger } from './logger';

const labelAsGenerated = (lines) => [
  "// Automatically generated. Don't change this file manually.",
  '',
  ...lines,
];

const addEmptyLineAtEnd = (lines) => [...lines, ''];

const processLines = (processingChain) => pipe(...processingChain);

const processingChain = [labelAsGenerated, addEmptyLineAtEnd];

/**
 * @param {{ fullPath: string, lines: string[] }} p0
 */
const writeFile = ({ fullPath, lines }) => {
  const relativePath = path.relative(process.cwd(), fullPath);
  logger.log(` - ${relativePath}`);

  // @ts-ignore
  const allLines = pipe(...processingChain)(lines);

  const content = allLines.join(os.EOL);
  fs.writeFileSync(fullPath, content, 'utf-8');
};

export default writeFile;

import fs from 'fs';
import os from 'os';
import path from 'path';

import { logger } from './logger';

/**
 * @param {{ fullPath: string, lines: string[] }} p0
 */
const writeFile = ({ fullPath, lines }) => {
  const relativePath = path.relative(process.cwd(), fullPath);
  logger.log(` - ${relativePath}`);

  const content = lines.join(os.EOL);
  fs.writeFileSync(fullPath, content, 'utf-8');
};

export default writeFile;

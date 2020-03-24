import { forEach } from 'ramda';
import { recase }  from '@kristiandupont/recase';
import generateTypeFile from './generateTypeFile';

/**
 * @param {Type[]} types
 */
async function generateTypeFiles(types, modelDir, fromCase, filenameCase) {
  const fc = recase(fromCase, filenameCase);
  const pc = recase(fromCase, 'pascal');
  forEach((t) => generateTypeFile(t, modelDir, fc, pc), types);
}

export default generateTypeFiles;

import { forEach } from 'ramda';
import { recase } from '@kristiandupont/recase';
import generateModelFile from './generateModelFile';
import generateModelIndexFile from './generateModelIndexFile';

/**
 * @param {Table[]} tables
 */
async function generateModelFiles(
  tables,
  views,
  typeMap,
  userTypes,
  modelDir,
  fromCase,
  filenameCase
) {
  const pc = recase(fromCase, 'pascal');
  const cc = recase(fromCase, 'camel');
  const fc = recase(fromCase, filenameCase);
  forEach(
    (table) =>
      generateModelFile(table, false, typeMap, userTypes, modelDir, pc, cc, fc),
    tables
  );
  forEach(
    (view) =>
      generateModelFile(view, true, typeMap, userTypes, modelDir, pc, cc, fc),
    views
  );
  generateModelIndexFile(
    [...tables, ...views.map((v) => ({ ...v, isView: true }))],
    modelDir,
    pc,
    fc,
    cc
  );
}

export default generateModelFiles;

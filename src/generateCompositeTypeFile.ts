import { Attribute, CompositeType } from 'extract-pg-schema';
import path from 'path';
import { filter, forEach, map, uniq } from 'ramda';

import { Nominators, TypeMap } from './Config';
import generateInterface from './generateInterface';
import ImportGenerator from './importGenerator';
import { logger } from './logger';

const generateCompositeTypeFile = (
  compositeType: CompositeType,
  {
    typeMap,
    userTypes,
    tableOrViewTypes,
    schemaName,
    nominators,
    externalTypesFolder,
    schemaFolderMap,
  }: {
    typeMap: TypeMap;
    userTypes: string[];
    tableOrViewTypes: string[];
    schemaName: string;
    nominators: Nominators;
    externalTypesFolder?: string;
    schemaFolderMap: {
      [schemaName: string]: string;
    };
  }
): string[] => {
  const fileNominator = nominators.fileNominator;

  const lines = [];
  const { comment } = compositeType;

  const importGenerator = new ImportGenerator(schemaFolderMap[schemaName]);
  const appliedUserTypes = uniq(
    map(
      (p: Attribute) => p.type,
      filter((p) => userTypes.indexOf(p.type) !== -1, compositeType.attributes)
    )
  );
  appliedUserTypes.forEach((t) => {
    const givenName = nominators.typeDefinitionNominator(t);
    importGenerator.addImport(
      givenName,
      true,
      path.join(schemaFolderMap[schemaName], fileNominator(givenName, t)),
      false
    );
  });

  // Handle tables and views used as attribute types.
  const appliedTableOrViewTypes = uniq(
    map(
      (p: Attribute) => p.type,
      filter(
        (p) => tableOrViewTypes.indexOf(p.type) !== -1,
        compositeType.attributes
      )
    )
  );
  appliedTableOrViewTypes.forEach((t) => {
    const givenName = nominators.modelNominator(t, );
    importGenerator.addImport(
      givenName,
      true,
      path.join(schemaFolderMap[schemaName], fileNominator(givenName, t)),
      false
    );
  });

  const overriddenTypes = map(
    (p: Attribute) => p.tags.type,
    filter((p) => Boolean(p.tags.type), compositeType.attributes)
  );
  forEach((importedType) => {
    const givenName = importedType as GivenName; // We expect people to have used proper casing in their comments
    importGenerator.addImport(
      givenName,
      true,
      path.join(
        externalTypesFolder,
        fileNominator(givenName, importedType as string)
      ),
      false
    );
  }, overriddenTypes);

  const importLines = importGenerator.generateLines();
  lines.push(...importLines);

  if (importLines.length) {
    lines.push('');
  }

  const properties = compositeType.attributes.map((a) => {
    let rawType = a.tags.type || typeMap[a.type];
    if (!rawType) {
      logger.warn(`Unrecognized type: '${a.type}'`);
      if (tableOrViewTypes.indexOf(a.type) !== -1) {
        rawType = nominators.modelNominator(a.type);
      } else {
        rawType = nominators.typeNominator(a.type);
      }
    }
    const typeName = (a.nullable ? `${rawType} | null` : rawType) as string;
    const modelAttributes = {
      commentLines: a.comment ? [a.comment] : [],
      optional: false,
    };

    return {
      name: nominators.propertyNominator(a.name, compositeType),
      optional: false,
      typeName,
      modelAttributes,
    };
  });

  const givenName = nominators.typeNominator(compositeType.name);

  const interfaceLines = generateInterface({
    name: givenName,
    properties: properties.map(({ modelAttributes, ...props }) => ({
      ...props,
      ...modelAttributes,
    })),
    comment,
    exportAsDefault: true,
  });
  lines.push(...interfaceLines);

  return lines;
};

export default generateCompositeTypeFile;

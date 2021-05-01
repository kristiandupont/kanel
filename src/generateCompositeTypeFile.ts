import { Attribute, CompositeType } from 'extract-pg-schema';
import { forEach, map, filter, uniq } from 'ramda';
import { GivenName, Nominators, TypeMap } from './Config';
import generateInterface from './generateInterface';
import ImportGenerator from './importGenerator';
import path from 'path';

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
  const { comment, tags } = compositeType;

  const importGenerator = new ImportGenerator(schemaFolderMap[schemaName]);
  const appliedUserTypes = uniq(
    map(
      (p: Attribute) => p.type,
      filter((p) => userTypes.indexOf(p.type) !== -1, compositeType.attributes)
    )
  );
  appliedUserTypes.forEach((t) => {
    const givenName = nominators.typeNominator(t);
    importGenerator.addImport(
      givenName,
      true,
      path.join(schemaFolderMap[schemaName], fileNominator(givenName, t))
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
    const givenName = nominators.modelNominator(t);
    importGenerator.addImport(
      givenName,
      true,
      path.join(schemaFolderMap[schemaName], fileNominator(givenName, t))
    );
  });

  const overriddenTypes = map(
    (p: Attribute) => p.tags.type,
    filter((p) => !!p.tags.type, compositeType.attributes)
  );
  forEach((importedType) => {
    const givenName = importedType as GivenName; // We expect people to have used proper casing in their comments
    importGenerator.addImport(
      givenName,
      true,
      path.join(
        externalTypesFolder,
        fileNominator(givenName, importedType as string)
      )
    );
  }, overriddenTypes);

  const importLines = importGenerator.generateLines();
  lines.push(...importLines);

  if (importLines.length) {
    lines.push('');
  }

  const properties = compositeType.attributes.map((a) => {
    /** @type {string} */
    // @ts-ignore
    let rawType = a.tags.type || typeMap[a.type];
    if (!rawType) {
      console.warn(`Unrecognized type: '${a.type}'`);
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

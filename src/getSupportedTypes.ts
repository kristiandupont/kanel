import { CompositeType, EnumType, Type } from 'extract-pg-schema';

const getSupportedTypes = (
  types: Type[]
): {
  enumTypes: EnumType[];
  compositeTypes: CompositeType[];
} => {
  const enumTypes: EnumType[] = [];
  const compositeTypes: CompositeType[] = [];

  for (const type of types) {
    switch (type.type) {
      case 'composite':
        compositeTypes.push(type);
        break;
      case 'enum':
        enumTypes.push(type);
        break;
    }
  }

  return {
    enumTypes,
    compositeTypes,
  };
};

export default getSupportedTypes;

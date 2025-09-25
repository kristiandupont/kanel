import type TypeImport from "./TypeImport";

/**
 * A type definition can either be a string representing a builtin type,
 * or an object representing a non-builtin or complex type.
 */
type TypeDefinition =
  | string
  | {
      /**
       * Full name of type when used.
       * Examples: "string", "Partial<SomeType>", "{ a: string, b: number }"
       */
      name: string;

      /**
       * If this type is or depends on non-builtin types, this array
       * will contain the imports needed to use this type.
       */
      typeImports: TypeImport[];
    };

export default TypeDefinition;

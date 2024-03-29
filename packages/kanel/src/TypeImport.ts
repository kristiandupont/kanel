/**
 * This structure defines a type import in Typescript.
 * Used with importGenerator, it can generate a series
 * of combined import statements.
 */
type TypeImport = {
  /**
   * The name of the type to import. This is what goes
   * on the left side of an "import" statement
   */
  name: string;

  /**
   * If true, this type is imported as the default export
   * and otherwise it will be imported as a named export.
   */
  isDefault: boolean;

  /**
   * The path to the file where this type is defined.
   * This is what goes on the right side of an "import" statement.
   */
  path: string;

  /**
   * If true, the path above will be treated as an absolute path
   * and used in the import statement as-is.
   * If false, the path will be into a relative path,
   * resolved relative to the file that is importing this type.
   */
  isAbsolute: boolean;

  /**
   * If true, this type will be imported as a type-only import.
   * Note that there are certain types that cannot be imported
   * as type-only imports, such as classes and enums.
   */
  importAsType: boolean;
};

export default TypeImport;

export type TypeDeclaration = {
  declarationType: 'typeDeclaration';
  comments?: string[];
  name: string;
  typeDefinition: string;
};

export type TypeImport = {
  name: string;
  absolutePath: string;
  isAbsolute: boolean;
  isDefault: boolean;
};

export type InterfacePropertyDeclaration = {
  comments?: string[];
  name: string;
  typeName: string;
  isArray: boolean;
  isOptional: boolean;
  isNullable: boolean;
  typeImport?: TypeImport;
};

export type InterfaceDeclaration = {
  declarationType: 'interface';
  isDefaultExport: boolean;
  comments?: string[];
  name: string;
  base?: string;

  properties: InterfacePropertyDeclaration[];
};

export type ZodPropertyDeclaration = {
  name: string;
  typeName: string;
  isBuiltin: boolean;
  isOptional: boolean;
  isNullable: boolean;
  typeImport?: TypeImport;
};

export type ZodSchemaDeclaration = {
  declarationType: 'zodSchema';
  comments?: string[];
  name: string;
  overrideType?: string;
  properties: ZodPropertyDeclaration[];
};

export type Declaration =
  | TypeDeclaration
  | InterfaceDeclaration
  | ZodSchemaDeclaration;

/**
 * The purpose of this type is to encapsulate an abstracted version of a single model file.
 * Such a file is likely to contain an interface defining the model, identifier types,
 * initializers and the like, as well as Zod schemas.
 */
type ModelFileGenerationSetup = {
  declarations: Declaration[];
};

export default ModelFileGenerationSetup;

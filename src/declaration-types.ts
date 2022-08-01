import TypeImport from './TypeImport';

type DeclarationBase = {
  comment?: string[];
  typeImports?: TypeImport[];
};

export type TypeDeclaration = DeclarationBase & {
  declarationType: 'typeDeclaration';
  name: string;
  typeDefinition: string[];
  exportAs: 'named' | 'default';
};

export type InterfacePropertyDeclaration = {
  name: string;
  comment?: string[];
  dimensions: number;
  isNullable: boolean;
  isOptional: boolean;
  typeName: string;
  typeImports?: TypeImport[];
};

export type InterfaceDeclaration = DeclarationBase & {
  declarationType: 'interface';
  name: string;
  extends?: string;
  properties: InterfacePropertyDeclaration[];
  exportAs: 'named' | 'default';
};

export type GenericDeclaration = DeclarationBase & {
  declarationType: 'generic';
  lines: string[];
};

export type Declaration =
  | TypeDeclaration
  | InterfaceDeclaration
  | GenericDeclaration;

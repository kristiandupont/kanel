import TypeImport from "./TypeImport";

export type DeclarationBase = {
  comment?: string[];
  typeImports?: TypeImport[];
};

export type TypeDeclaration = DeclarationBase & {
  declarationType: "typeDeclaration";
  name: string;
  /** Must be valid TypeScript */
  typeDefinition: string[];
  exportAs: "named" | "default";
};

export type InterfacePropertyDeclaration = DeclarationBase & {
  name: string;
  dimensions: number;
  isNullable: boolean;
  isOptional: boolean;
  typeName: string;
};

export type InterfaceDeclaration = DeclarationBase & {
  declarationType: "interface";
  name: string;
  base?: string;
  properties: InterfacePropertyDeclaration[];
  exportAs: "named" | "default";
};

export type EnumDeclaration = DeclarationBase & {
  declarationType: "enum";
  name: string;
  values: string[];
  exportAs: "named" | "default";
};

export type ConstantDeclaration = DeclarationBase & {
  declarationType: "constant";
  name: string;
  /** Must be valid TypeScript */
  type: string | undefined;
  value: string | string[];
  exportAs: "named" | "default";
};

export type GenericDeclaration = DeclarationBase & {
  declarationType: "generic";
  lines: string[];
};

export type Declaration =
  | TypeDeclaration
  | InterfaceDeclaration
  | EnumDeclaration
  | ConstantDeclaration
  | GenericDeclaration;

import TypeImport from './TypeImport';

export type TypeMetadata = {
  name: string;
  comment: string[] | undefined;
  path: string;
};

export type PropertyMetadata = {
  name: string;
  comment: string[] | undefined;
  typeOverride?: TypeImport | string;
  optionalOverride?: boolean;
};

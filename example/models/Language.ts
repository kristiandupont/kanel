// @generated
// Automatically generated. Don't change this file manually.
// Name: language

export type LanguageId = number & { " __flavor"?: 'language' };

export default interface Language {
  /** Primary key. Index: language_pkey */
  language_id: LanguageId;

  name: string;

  last_update: Date;
}

export interface LanguageInitializer {
  /**
   * Default value: nextval('language_language_id_seq'::regclass)
   * Primary key. Index: language_pkey
   */
  language_id?: LanguageId;

  name: string;

  /** Default value: now() */
  last_update?: Date;
}

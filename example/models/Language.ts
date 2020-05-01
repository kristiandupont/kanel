// Automatically generated. Don't change this file manually.

export type LanguageId = number & { __flavor?: 'language' };

export default interface Language {
  /** Primary key. Index: language_pkey */
  languageId: LanguageId;

  name: string;

  lastUpdate: Date;
}

export interface LanguageInitializer {
  /**
   * Default value: nextval('language_language_id_seq'::regclass)
   * Primary key. Index: language_pkey
  */
  languageId?: LanguageId;

  name: string;

  /** Default value: now() */
  lastUpdate?: Date;
}

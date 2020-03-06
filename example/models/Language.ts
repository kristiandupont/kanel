// Automatically generated. Don't change this file manually.

export default interface Language  {
  /** Primary key. Index: language_pkey */
  language_id: number;

  name: bpchar;

  last_update: Date;
}

export interface LanguageInitializer  {
  /**
   * Default value: nextval('language_language_id_seq'::regclass)
   * Primary key. Index: language_pkey
  */
  languageId?: number;

  name: bpchar;

  /** Default value: now() */
  lastUpdate?: Date;
}

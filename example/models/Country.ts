// Automatically generated. Don't change this file manually.

export default interface Country  {
  /** Primary key. Index: country_pkey */
  country_id: number;

  country: string;

  last_update: Date;
}

export interface CountryInitializer  {
  /**
   * Default value: nextval('country_country_id_seq'::regclass)
   * Primary key. Index: country_pkey
  */
  countryId?: number;

  country: string;

  /** Default value: now() */
  lastUpdate?: Date;
}

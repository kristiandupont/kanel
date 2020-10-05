// Automatically generated. Don't change this file manually.
// Name: country

export type CountryId = number & { __flavor?: 'country' };

export default interface Country {
  /** Primary key. Index: country_pkey */
  country_id: CountryId;

  country: string;

  last_update: Date;
}

export interface CountryInitializer {
  /**
   * Default value: nextval('country_country_id_seq'::regclass)
   * Primary key. Index: country_pkey
  */
  country_id?: CountryId;

  country: string;

  /** Default value: now() */
  last_update?: Date;
}

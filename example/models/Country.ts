// Automatically generated. Don't change this file manually.

export type CountryId = number & { __flavor?: 'country' };

export default interface Country  {
  /** Primary key. Index: country_pkey */
  countryId: CountryId;

  country: string;

  lastUpdate: Date;
}

export interface CountryInitializer  {
  /**
   * Default value: nextval('country_country_id_seq'::regclass)
   * Primary key. Index: country_pkey
  */
  countryId?: CountryId;

  country: string;

  /** Default value: now() */
  lastUpdate?: Date;
}

// Automatically generated. Don't change this file manually.
// Name: city

import { CountryId } from './Country';

export type CityId = number & { __flavor?: 'city' };

export default interface City {
  /** Primary key. Index: city_pkey */
  city_id: CityId;

  city: string;

  /** Index: idx_fk_country_id */
  country_id: CountryId;

  last_update: Date;
}

export interface CityInitializer {
  /**
   * Default value: nextval('city_city_id_seq'::regclass)
   * Primary key. Index: city_pkey
   */
  city_id?: CityId;

  city: string;

  /** Index: idx_fk_country_id */
  country_id: CountryId;

  /** Default value: now() */
  last_update?: Date;
}

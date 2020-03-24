// Automatically generated. Don't change this file manually.

import { CountryId } from './Country';

export type CityId = number & { __flavor?: 'city' };

export default interface City  {
  /** Primary key. Index: city_pkey */
  cityId: CityId;

  city: string;

  /** Index: idx_fk_country_id */
  countryId: CountryId;

  lastUpdate: Date;
}

export interface CityInitializer  {
  /**
   * Default value: nextval('city_city_id_seq'::regclass)
   * Primary key. Index: city_pkey
  */
  cityId?: CityId;

  city: string;

  /** Index: idx_fk_country_id */
  countryId: CountryId;

  /** Default value: now() */
  lastUpdate?: Date;
}

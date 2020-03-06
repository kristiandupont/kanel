// Automatically generated. Don't change this file manually.

import { CountryId } from './Country';

export default interface City  {
  /** Primary key. Index: city_pkey */
  city_id: number;

  city: string;

  /** Index: idx_fk_country_id */
  country_id: CountryId;

  last_update: Date;
}

export interface CityInitializer  {
  /**
   * Default value: nextval('city_city_id_seq'::regclass)
   * Primary key. Index: city_pkey
  */
  cityId?: number;

  city: string;

  /** Index: idx_fk_country_id */
  country_id: CountryId;

  /** Default value: now() */
  lastUpdate?: Date;
}

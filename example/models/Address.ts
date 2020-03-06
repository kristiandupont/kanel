// Automatically generated. Don't change this file manually.

import { CityId } from './City';

export default interface Address  {
  /** Primary key. Index: address_pkey */
  address_id: number;

  address: string;

  address2: string | null;

  district: string;

  /** Index: idx_fk_city_id */
  city_id: CityId;

  postal_code: string | null;

  phone: string;

  last_update: Date;
}

export interface AddressInitializer  {
  /**
   * Default value: nextval('address_address_id_seq'::regclass)
   * Primary key. Index: address_pkey
  */
  addressId?: number;

  address: string;

  address2?: string;

  district: string;

  /** Index: idx_fk_city_id */
  city_id: CityId;

  postalCode?: string;

  phone: string;

  /** Default value: now() */
  lastUpdate?: Date;
}

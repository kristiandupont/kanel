// Automatically generated. Don't change this file manually.

import { CityId } from './City';

export type AddressId = number & { __flavor?: 'address' };

export default interface Address {
  /** Primary key. Index: address_pkey */
  addressId: AddressId;

  address: string;

  address2: string | null;

  district: string;

  /** Index: idx_fk_city_id */
  cityId: CityId;

  postalCode: string | null;

  phone: string;

  lastUpdate: Date;
}

export interface AddressInitializer {
  /**
   * Default value: nextval('address_address_id_seq'::regclass)
   * Primary key. Index: address_pkey
  */
  addressId?: AddressId;

  address: string;

  address2?: string;

  district: string;

  /** Index: idx_fk_city_id */
  cityId: CityId;

  postalCode?: string;

  phone: string;

  /** Default value: now() */
  lastUpdate?: Date;
}

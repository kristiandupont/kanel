// Automatically generated. Don't change this file manually.
// Name: store

import { StaffId } from './Staff';
import { AddressId } from './Address';

export type StoreId = number & { " __flavor"?: 'store' };

export default interface Store {
  /** Primary key. Index: store_pkey */
  store_id: StoreId;

  /** Index: idx_unq_manager_staff_id */
  manager_staff_id: StaffId;

  address_id: AddressId;

  last_update: Date;
}

export interface StoreInitializer {
  /**
   * Default value: nextval('store_store_id_seq'::regclass)
   * Primary key. Index: store_pkey
   */
  store_id?: StoreId;

  /** Index: idx_unq_manager_staff_id */
  manager_staff_id: StaffId;

  address_id: AddressId;

  /** Default value: now() */
  last_update?: Date;
}

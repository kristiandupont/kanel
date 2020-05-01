// Automatically generated. Don't change this file manually.

import { StaffId } from './Staff';
import { AddressId } from './Address';

export type StoreId = number & { __flavor?: 'store' };

export default interface Store {
  /** Primary key. Index: store_pkey */
  storeId: StoreId;

  /** Index: idx_unq_manager_staff_id */
  managerStaffId: StaffId;

  addressId: AddressId;

  lastUpdate: Date;
}

export interface StoreInitializer {
  /**
   * Default value: nextval('store_store_id_seq'::regclass)
   * Primary key. Index: store_pkey
  */
  storeId?: StoreId;

  /** Index: idx_unq_manager_staff_id */
  managerStaffId: StaffId;

  addressId: AddressId;

  /** Default value: now() */
  lastUpdate?: Date;
}

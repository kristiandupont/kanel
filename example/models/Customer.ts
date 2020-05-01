// Automatically generated. Don't change this file manually.

import { AddressId } from './Address';

export type CustomerId = number & { __flavor?: 'customer' };

export default interface Customer {
  /** Primary key. Index: customer_pkey */
  customerId: CustomerId;

  /** Index: idx_fk_store_id */
  storeId: number;

  firstName: string;

  /** Index: idx_last_name */
  lastName: string;

  email: string | null;

  /** Index: idx_fk_address_id */
  addressId: AddressId;

  activebool: boolean;

  createDate: Date;

  lastUpdate: Date | null;

  active: number | null;
}

export interface CustomerInitializer {
  /**
   * Default value: nextval('customer_customer_id_seq'::regclass)
   * Primary key. Index: customer_pkey
  */
  customerId?: CustomerId;

  /** Index: idx_fk_store_id */
  storeId: number;

  firstName: string;

  /** Index: idx_last_name */
  lastName: string;

  email?: string;

  /** Index: idx_fk_address_id */
  addressId: AddressId;

  /** Default value: true */
  activebool?: boolean;

  /** Default value: ('now'::text)::date */
  createDate?: Date;

  /** Default value: now() */
  lastUpdate?: Date;

  active?: number;
}

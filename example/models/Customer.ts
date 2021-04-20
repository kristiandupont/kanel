// Automatically generated. Don't change this file manually.
// Name: customer

import { AddressId } from './Address';

export type CustomerId = number & { " __flavor"?: 'customer' };

export default interface Customer {
  /** Primary key. Index: customer_pkey */
  customer_id: CustomerId;

  /** Index: idx_fk_store_id */
  store_id: number;

  first_name: string;

  /** Index: idx_last_name */
  last_name: string;

  email: string | null;

  /** Index: idx_fk_address_id */
  address_id: AddressId;

  activebool: boolean;

  create_date: Date;

  last_update: Date | null;

  active: number | null;
}

export interface CustomerInitializer {
  /**
   * Default value: nextval('customer_customer_id_seq'::regclass)
   * Primary key. Index: customer_pkey
   */
  customer_id?: CustomerId;

  /** Index: idx_fk_store_id */
  store_id: number;

  first_name: string;

  /** Index: idx_last_name */
  last_name: string;

  email?: string | null;

  /** Index: idx_fk_address_id */
  address_id: AddressId;

  /** Default value: true */
  activebool?: boolean;

  /** Default value: ('now'::text)::date */
  create_date?: Date;

  /** Default value: now() */
  last_update?: Date | null;

  active?: number | null;
}

// Automatically generated. Don't change this file manually.

import { AddressId } from './Address';

export default interface Customer  {
  /** Primary key. Index: customer_pkey */
  customer_id: number;

  /** Index: idx_fk_store_id */
  store_id: number;

  first_name: string;

  /** Index: idx_last_name */
  last_name: string;

  email: string | null;

  /** Index: idx_fk_address_id */
  address_id: AddressId;

  activebool: boolean;

  create_date: Date;

  last_update: Date | null;

  active: number | null;
}

export interface CustomerInitializer  {
  /**
   * Default value: nextval('customer_customer_id_seq'::regclass)
   * Primary key. Index: customer_pkey
  */
  customerId?: number;

  /** Index: idx_fk_store_id */
  store_id: number;

  first_name: string;

  /** Index: idx_last_name */
  last_name: string;

  email?: string;

  /** Index: idx_fk_address_id */
  address_id: AddressId;

  /** Default value: true */
  activebool?: boolean;

  /** Default value: ('now'::text)::date */
  createDate?: Date;

  /** Default value: now() */
  lastUpdate?: Date;

  active?: number;
}

// Automatically generated. Don't change this file manually.

import { AddressId } from './Address';

export default interface Staff  {
  /** Primary key. Index: staff_pkey */
  staff_id: number;

  first_name: string;

  last_name: string;

  address_id: AddressId;

  email: string | null;

  store_id: number;

  active: boolean;

  username: string;

  password: string | null;

  last_update: Date;

  picture: bytea | null;
}

export interface StaffInitializer  {
  /**
   * Default value: nextval('staff_staff_id_seq'::regclass)
   * Primary key. Index: staff_pkey
  */
  staffId?: number;

  first_name: string;

  last_name: string;

  address_id: AddressId;

  email?: string;

  store_id: number;

  /** Default value: true */
  active?: boolean;

  username: string;

  password?: string;

  /** Default value: now() */
  lastUpdate?: Date;

  picture?: bytea;
}

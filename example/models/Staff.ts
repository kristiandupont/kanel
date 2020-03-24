// Automatically generated. Don't change this file manually.

import { AddressId } from './Address';

export type StaffId = number & { __flavor?: 'staff' };

export default interface Staff  {
  /** Primary key. Index: staff_pkey */
  staffId: StaffId;

  firstName: string;

  lastName: string;

  addressId: AddressId;

  email: string | null;

  storeId: number;

  active: boolean;

  username: string;

  password: string | null;

  lastUpdate: Date;

  picture: Bytea | null;
}

export interface StaffInitializer  {
  /**
   * Default value: nextval('staff_staff_id_seq'::regclass)
   * Primary key. Index: staff_pkey
  */
  staffId?: StaffId;

  firstName: string;

  lastName: string;

  addressId: AddressId;

  email?: string;

  storeId: number;

  /** Default value: true */
  active?: boolean;

  username: string;

  password?: string;

  /** Default value: now() */
  lastUpdate?: Date;

  picture?: Bytea;
}

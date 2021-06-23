// @generated
// Automatically generated. Don't change this file manually.
// Name: staff_list

export type StaffListId = number & { " __flavor"?: 'staff_list' };

export default interface StaffList {
  /** Primary key. Index: staff_pkey */
  id: StaffListId;

  name: string | null;

  address: string;

  'zip code': string | null;

  phone: string;

  city: string;

  country: string;

  sid: number;
}

// @generated
// Automatically generated. Don't change this file manually.
// Name: customer_list

export type CustomerListId = number & { " __flavor"?: 'customer_list' };

export default interface CustomerList {
  /** Primary key. Index: customer_pkey */
  id: CustomerListId;

  name: string | null;

  address: string;

  'zip code': string | null;

  phone: string;

  city: string;

  country: string;

  notes: string | null;

  /** Index: idx_fk_store_id */
  sid: number;
}

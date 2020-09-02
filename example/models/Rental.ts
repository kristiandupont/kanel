// Automatically generated. Don't change this file manually.

import { InventoryId } from './Inventory';
import { CustomerId } from './Customer';
import { StaffId } from './Staff';

export type RentalId = number & { __flavor?: 'rental' };

export default interface Rental {
  /** Primary key. Index: rental_pkey */
  rental_id: RentalId;

  /** Index: idx_unq_rental_rental_date_inventory_id_customer_id */
  rental_date: Date;

  /**
   * Index: idx_fk_inventory_id
   * Index: idx_unq_rental_rental_date_inventory_id_customer_id
  */
  inventory_id: InventoryId;

  /** Index: idx_unq_rental_rental_date_inventory_id_customer_id */
  customer_id: CustomerId;

  return_date: Date | null;

  staff_id: StaffId;

  last_update: Date;
}

export interface RentalInitializer {
  /**
   * Default value: nextval('rental_rental_id_seq'::regclass)
   * Primary key. Index: rental_pkey
  */
  rental_id?: RentalId;

  /** Index: idx_unq_rental_rental_date_inventory_id_customer_id */
  rental_date: Date;

  /**
   * Index: idx_fk_inventory_id
   * Index: idx_unq_rental_rental_date_inventory_id_customer_id
  */
  inventory_id: InventoryId;

  /** Index: idx_unq_rental_rental_date_inventory_id_customer_id */
  customer_id: CustomerId;

  return_date?: Date;

  staff_id: StaffId;

  /** Default value: now() */
  last_update?: Date;
}

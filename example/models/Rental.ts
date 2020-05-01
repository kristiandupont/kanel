// Automatically generated. Don't change this file manually.

import { InventoryId } from './Inventory';
import { CustomerId } from './Customer';
import { StaffId } from './Staff';

export type RentalId = number & { __flavor?: 'rental' };

export default interface Rental {
  /** Primary key. Index: rental_pkey */
  rentalId: RentalId;

  /** Index: idx_unq_rental_rental_date_inventory_id_customer_id */
  rentalDate: Date;

  /**
   * Index: idx_fk_inventory_id
   * Index: idx_unq_rental_rental_date_inventory_id_customer_id
  */
  inventoryId: InventoryId;

  /** Index: idx_unq_rental_rental_date_inventory_id_customer_id */
  customerId: CustomerId;

  returnDate: Date | null;

  staffId: StaffId;

  lastUpdate: Date;
}

export interface RentalInitializer {
  /**
   * Default value: nextval('rental_rental_id_seq'::regclass)
   * Primary key. Index: rental_pkey
  */
  rentalId?: RentalId;

  /** Index: idx_unq_rental_rental_date_inventory_id_customer_id */
  rentalDate: Date;

  /**
   * Index: idx_fk_inventory_id
   * Index: idx_unq_rental_rental_date_inventory_id_customer_id
  */
  inventoryId: InventoryId;

  /** Index: idx_unq_rental_rental_date_inventory_id_customer_id */
  customerId: CustomerId;

  returnDate?: Date;

  staffId: StaffId;

  /** Default value: now() */
  lastUpdate?: Date;
}

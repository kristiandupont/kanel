// @generated
// This file is automatically generated by Kanel. Do not modify manually.

import type { InventoryId } from './Inventory';
import type { CustomerId } from './Customer';
import type { StaffId } from './Staff';
import type { ColumnType, Selectable, Insertable, Updateable } from 'kysely';

export type RentalId = number;

/** Represents the table public.rental */
export default interface RentalTable {
  rental_id: ColumnType<RentalId, RentalId | undefined, RentalId>;

  rental_date: ColumnType<Date, Date | string, Date | string>;

  inventory_id: ColumnType<InventoryId, InventoryId, InventoryId>;

  customer_id: ColumnType<CustomerId, CustomerId, CustomerId>;

  return_date: ColumnType<Date | null, Date | string | null, Date | string | null>;

  staff_id: ColumnType<StaffId, StaffId, StaffId>;

  last_update: ColumnType<Date, Date | string | undefined, Date | string>;
}

export type Rental = Selectable<RentalTable>;

export type NewRental = Insertable<RentalTable>;

export type RentalUpdate = Updateable<RentalTable>;

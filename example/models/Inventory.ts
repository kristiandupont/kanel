// Automatically generated. Don't change this file manually.
// Name: inventory

import { FilmId } from './Film';

export type InventoryId = number & { " __flavor"?: 'inventory' };

export default interface Inventory {
  /** Primary key. Index: inventory_pkey */
  inventory_id: InventoryId;

  /** Index: idx_store_id_film_id */
  film_id: FilmId;

  /** Index: idx_store_id_film_id */
  store_id: number;

  last_update: Date;
}

export interface InventoryInitializer {
  /**
   * Default value: nextval('inventory_inventory_id_seq'::regclass)
   * Primary key. Index: inventory_pkey
   */
  inventory_id?: InventoryId;

  /** Index: idx_store_id_film_id */
  film_id: FilmId;

  /** Index: idx_store_id_film_id */
  store_id: number;

  /** Default value: now() */
  last_update?: Date;
}

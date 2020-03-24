// Automatically generated. Don't change this file manually.

import { FilmId } from './Film';

export type InventoryId = number & { __flavor?: 'inventory' };

export default interface Inventory  {
  /** Primary key. Index: inventory_pkey */
  inventoryId: InventoryId;

  /** Index: idx_store_id_film_id */
  filmId: FilmId;

  /** Index: idx_store_id_film_id */
  storeId: number;

  lastUpdate: Date;
}

export interface InventoryInitializer  {
  /**
   * Default value: nextval('inventory_inventory_id_seq'::regclass)
   * Primary key. Index: inventory_pkey
  */
  inventoryId?: InventoryId;

  /** Index: idx_store_id_film_id */
  filmId: FilmId;

  /** Index: idx_store_id_film_id */
  storeId: number;

  /** Default value: now() */
  lastUpdate?: Date;
}

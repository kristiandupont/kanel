// @generated
// This file is automatically generated by Kanel. Do not modify manually.

import type { ColumnType, Selectable } from 'kysely';

/** Represents the view public.sales_by_film_category */
export default interface SalesByFilmCategoryTable {
  category: ColumnType<string, never, never>;

  total_sales: ColumnType<string, never, never>;
}

export type SalesByFilmCategory = Selectable<SalesByFilmCategoryTable>;

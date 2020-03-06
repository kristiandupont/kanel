// Automatically generated. Don't change this file manually.

export default interface Category  {
  /** Primary key. Index: category_pkey */
  category_id: number;

  name: string;

  last_update: Date;
}

export interface CategoryInitializer  {
  /**
   * Default value: nextval('category_category_id_seq'::regclass)
   * Primary key. Index: category_pkey
  */
  categoryId?: number;

  name: string;

  /** Default value: now() */
  lastUpdate?: Date;
}

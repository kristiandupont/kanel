// Automatically generated. Don't change this file manually.

export type CategoryId = number & { __flavor?: 'category' };

export default interface Category  {
  /** Primary key. Index: category_pkey */
  categoryId: CategoryId;

  name: string;

  lastUpdate: Date;
}

export interface CategoryInitializer  {
  /**
   * Default value: nextval('category_category_id_seq'::regclass)
   * Primary key. Index: category_pkey
  */
  categoryId?: CategoryId;

  name: string;

  /** Default value: now() */
  lastUpdate?: Date;
}

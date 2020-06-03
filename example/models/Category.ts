// Automatically generated. Don't change this file manually.

export type CategoryId = number & { __flavor?: 'category' };

export default interface Category {
  /** Primary key. Index: category_pkey */
  category_id: CategoryId;

  name: string;

  last_update: Date;
}

export interface CategoryInitializer {
  /**
   * Default value: nextval('category_category_id_seq'::regclass)
   * Primary key. Index: category_pkey
  */
  category_id?: CategoryId;

  name: string;

  /** Default value: now() */
  last_update?: Date;
}

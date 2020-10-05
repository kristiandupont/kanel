// Automatically generated. Don't change this file manually.
// Name: film_category

import { FilmId } from './Film';
import { CategoryId } from './Category';

export default interface FilmCategory {
  /** Primary key. Index: film_category_pkey */
  film_id: FilmId;

  /** Primary key. Index: film_category_pkey */
  category_id: CategoryId;

  last_update: Date;
}

export interface FilmCategoryInitializer {
  /** Primary key. Index: film_category_pkey */
  film_id: FilmId;

  /** Primary key. Index: film_category_pkey */
  category_id: CategoryId;

  /** Default value: now() */
  last_update?: Date;
}

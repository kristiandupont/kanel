// Automatically generated. Don't change this file manually.

import { FilmId } from './Film';
import { CategoryId } from './Category';

export default interface FilmCategory  {
  /** Primary key. Index: film_category_pkey */
  filmId: FilmId;

  /** Primary key. Index: film_category_pkey */
  categoryId: CategoryId;

  lastUpdate: Date;
}

export interface FilmCategoryInitializer  {
  /** Primary key. Index: film_category_pkey */
  filmId: FilmId;

  /** Primary key. Index: film_category_pkey */
  categoryId: CategoryId;

  /** Default value: now() */
  lastUpdate?: Date;
}

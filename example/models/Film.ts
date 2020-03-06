// Automatically generated. Don't change this file manually.

import { LanguageId } from './Language';

import mpaa_rating from './MpaaRating';

export default interface Film  {
  /** Primary key. Index: film_pkey */
  film_id: number;

  /** Index: idx_title */
  title: string;

  description: string | null;

  release_year: number | null;

  /** Index: idx_fk_language_id */
  language_id: LanguageId;

  rental_duration: number;

  rental_rate: numeric;

  length: number | null;

  replacement_cost: numeric;

  rating: mpaa_rating | null;

  last_update: Date;

  special_features: _text | null;

  /** Index: film_fulltext_idx */
  fulltext: tsvector;
}

export interface FilmInitializer  {
  /**
   * Default value: nextval('film_film_id_seq'::regclass)
   * Primary key. Index: film_pkey
  */
  filmId?: number;

  /** Index: idx_title */
  title: string;

  description?: string;

  releaseYear?: number;

  /** Index: idx_fk_language_id */
  language_id: LanguageId;

  /** Default value: 3 */
  rentalDuration?: number;

  /** Default value: 4.99 */
  rentalRate?: numeric;

  length?: number;

  /** Default value: 19.99 */
  replacementCost?: numeric;

  /** Default value: 'G'::mpaa_rating */
  rating?: mpaa_rating;

  /** Default value: now() */
  lastUpdate?: Date;

  specialFeatures?: _text;

  /** Index: film_fulltext_idx */
  fulltext: tsvector;
}

// Automatically generated. Don't change this file manually.
// Name: film

import { LanguageId } from './Language';

import MpaaRating from './MpaaRating';

export type FilmId = number & { __flavor?: 'film' };

export default interface Film {
  /** Primary key. Index: film_pkey */
  film_id: FilmId;

  /** Index: idx_title */
  title: string;

  description: string | null;

  release_year: number | null;

  /** Index: idx_fk_language_id */
  language_id: LanguageId;

  rental_duration: number;

  rental_rate: number;

  length: number | null;

  replacement_cost: number;

  rating: MpaaRating | null;

  last_update: Date;

  special_features: Text[] | null;

  /** Index: film_fulltext_idx */
  fulltext: string;
}

export interface FilmInitializer {
  /**
   * Default value: nextval('film_film_id_seq'::regclass)
   * Primary key. Index: film_pkey
   */
  film_id?: FilmId;

  /** Index: idx_title */
  title: string;

  description?: string;

  release_year?: number;

  /** Index: idx_fk_language_id */
  language_id: LanguageId;

  /** Default value: 3 */
  rental_duration?: number;

  /** Default value: 4.99 */
  rental_rate?: number;

  length?: number;

  /** Default value: 19.99 */
  replacement_cost?: number;

  /** Default value: 'G'::mpaa_rating */
  rating?: MpaaRating;

  /** Default value: now() */
  last_update?: Date;

  special_features?: Text[];

  /** Index: film_fulltext_idx */
  fulltext: string;
}

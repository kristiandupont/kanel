// Automatically generated. Don't change this file manually.

import { LanguageId } from './Language';

import MpaaRating from './MpaaRating';

export type FilmId = number & { __flavor?: 'film' };

export default interface Film {
  /** Primary key. Index: film_pkey */
  filmId: FilmId;

  /** Index: idx_title */
  title: string;

  description: string | null;

  releaseYear: number | null;

  /** Index: idx_fk_language_id */
  languageId: LanguageId;

  rentalDuration: number;

  rentalRate: number;

  length: number | null;

  replacementCost: number;

  rating: MpaaRating | null;

  lastUpdate: Date;

  specialFeatures: Text | null;

  /** Index: film_fulltext_idx */
  fulltext: string;
}

export interface FilmInitializer {
  /**
   * Default value: nextval('film_film_id_seq'::regclass)
   * Primary key. Index: film_pkey
  */
  filmId?: FilmId;

  /** Index: idx_title */
  title: string;

  description?: string;

  releaseYear?: number;

  /** Index: idx_fk_language_id */
  languageId: LanguageId;

  /** Default value: 3 */
  rentalDuration?: number;

  /** Default value: 4.99 */
  rentalRate?: number;

  length?: number;

  /** Default value: 19.99 */
  replacementCost?: number;

  /** Default value: 'G'::mpaa_rating */
  rating?: MpaaRating;

  /** Default value: now() */
  lastUpdate?: Date;

  specialFeatures?: Text;

  /** Index: film_fulltext_idx */
  fulltext: string;
}

// @generated
// Automatically generated. Don't change this file manually.
// Name: nicer_but_slower_film_list

import MpaaRating from './MpaaRating';

export type NicerButSlowerFilmListId = number & { " __flavor"?: 'nicer_but_slower_film_list' };

export default interface NicerButSlowerFilmList {
  /** Primary key. Index: film_pkey */
  fid: NicerButSlowerFilmListId;

  /** Index: idx_title */
  title: string;

  description: string | null;

  category: string;

  price: string;

  length: number | null;

  rating: MpaaRating | null;

  actors: string | null;
}

// Automatically generated. Don't change this file manually.
// Name: film_actor

import { ActorId } from './Actor';
import { FilmId } from './Film';

export default interface FilmActor {
  /** Primary key. Index: film_actor_pkey */
  actor_id: ActorId;

  /**
   * Primary key. Index: film_actor_pkey
   * Index: idx_fk_film_id
  */
  film_id: FilmId;

  last_update: Date;
}

export interface FilmActorInitializer {
  /** Primary key. Index: film_actor_pkey */
  actor_id: ActorId;

  /**
   * Primary key. Index: film_actor_pkey
   * Index: idx_fk_film_id
  */
  film_id: FilmId;

  /** Default value: now() */
  last_update?: Date;
}

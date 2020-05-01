// Automatically generated. Don't change this file manually.

import { ActorId } from './Actor';
import { FilmId } from './Film';

export default interface FilmActor {
  /** Primary key. Index: film_actor_pkey */
  actorId: ActorId;

  /**
   * Primary key. Index: film_actor_pkey
   * Index: idx_fk_film_id
  */
  filmId: FilmId;

  lastUpdate: Date;
}

export interface FilmActorInitializer {
  /** Primary key. Index: film_actor_pkey */
  actorId: ActorId;

  /**
   * Primary key. Index: film_actor_pkey
   * Index: idx_fk_film_id
  */
  filmId: FilmId;

  /** Default value: now() */
  lastUpdate?: Date;
}

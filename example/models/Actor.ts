// Automatically generated. Don't change this file manually.

export default interface Actor  {
  /** Primary key. Index: actor_pkey */
  actor_id: number;

  first_name: string;

  /** Index: idx_actor_last_name */
  last_name: string;

  last_update: Date;
}

export interface ActorInitializer  {
  /**
   * Default value: nextval('actor_actor_id_seq'::regclass)
   * Primary key. Index: actor_pkey
  */
  actorId?: number;

  first_name: string;

  /** Index: idx_actor_last_name */
  last_name: string;

  /** Default value: now() */
  lastUpdate?: Date;
}

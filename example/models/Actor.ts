// Automatically generated. Don't change this file manually.

export type ActorId = number & { __flavor?: 'actor' };

export default interface Actor {
  /** Primary key. Index: actor_pkey */
  actor_id: ActorId;

  first_name: string;

  /** Index: idx_actor_last_name */
  last_name: string;

  last_update: Date;
}

export interface ActorInitializer {
  /**
   * Default value: nextval('actor_actor_id_seq'::regclass)
   * Primary key. Index: actor_pkey
  */
  actor_id?: ActorId;

  first_name: string;

  /** Index: idx_actor_last_name */
  last_name: string;

  /** Default value: now() */
  last_update?: Date;
}

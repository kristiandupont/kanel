// Automatically generated. Don't change this file manually.

export type ActorId = number & { __flavor?: 'actor' };

export default interface Actor {
  /** Primary key. Index: actor_pkey */
  actorId: ActorId;

  firstName: string;

  /** Index: idx_actor_last_name */
  lastName: string;

  lastUpdate: Date;
}

export interface ActorInitializer {
  /**
   * Default value: nextval('actor_actor_id_seq'::regclass)
   * Primary key. Index: actor_pkey
  */
  actorId?: ActorId;

  firstName: string;

  /** Index: idx_actor_last_name */
  lastName: string;

  /** Default value: now() */
  lastUpdate?: Date;
}

// @generated
// Automatically generated. Don't change this file manually.
// Name: actor_info

export type ActorInfoId = number & { " __flavor"?: 'actor_info' };

export default interface ActorInfo {
  /** Primary key. Index: actor_pkey */
  actor_id: ActorInfoId;

  first_name: string;

  /** Index: idx_actor_last_name */
  last_name: string;

  film_info: string | null;
}

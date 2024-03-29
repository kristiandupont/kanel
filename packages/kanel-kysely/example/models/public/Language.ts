// @generated
// This file is automatically generated by Kanel. Do not modify manually.

import type { ColumnType, Selectable, Insertable, Updateable } from 'kysely';

export type LanguageId = number;

/** Represents the table public.language */
export default interface LanguageTable {
  language_id: ColumnType<LanguageId, LanguageId | undefined, LanguageId>;

  name: ColumnType<string, string, string>;

  last_update: ColumnType<Date, Date | string | undefined, Date | string>;
}

export type Language = Selectable<LanguageTable>;

export type NewLanguage = Insertable<LanguageTable>;

export type LanguageUpdate = Updateable<LanguageTable>;

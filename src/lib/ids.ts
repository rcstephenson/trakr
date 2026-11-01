import { ulid } from 'ulid';

/** New sortable unique id (ULID). */
export function newId(): string {
  return ulid();
}

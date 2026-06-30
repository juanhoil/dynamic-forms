/**
 * Browser-side SQLite singleton.
 *
 * Backed by IndexedDB via the `IDBBatchAtomicVFS` virtual file system
 * shipped with `@sqlite.org/sqlite-wasm`. This means:
 *   - There is no backend; the database file lives entirely in the user's
 *     browser.
 *   - Data persists across reloads on the same browser / profile / device,
 *     but is NOT shared across users or devices.
 *   - Wiping site data (or running "Clear storage" in DevTools) deletes it.
 *
 * Public API:
 *   - initDb()         — idempotent, must be awaited before any other call.
 *   - saveForm(input)  — insert a new row in the `form` table.
 *   - listForms()      — list all rows, newest first.
 *   - loadForm(id)     — fetch a single row by id (or null).
 *   - deleteForm(id)   — remove a row by id.
 *
 * Vite notes:
 *   - `@sqlite.org/sqlite-wasm` is excluded from `optimizeDeps` in
 *     `vite.config.ts` so the pre-bundler does not break the WASM file
 *     (this matches the official package README).
 *   - The library's worker script is resolved internally by
 *     `@sqlite.org/sqlite-wasm` itself using `new Worker(new URL(...))`,
 *     so we do NOT need to import the worker URL here.
 *   - We DO import the WASM file with `?url` and pass it to
 *     `sqlite3InitModule({ locateFile })` so Vite emits it as a hashed
 *     asset in production.
 */

import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import sqliteWasmUrl from '@sqlite.org/sqlite-wasm/sqlite3.wasm?url';

// `oo1.DB` is the OO-API #1 Database instance. We type it as `any` here
// because the indexed-access chain `Sqlite3Static['oo1']['DB']` is the
// type produced by the library's declaration file, and pulling it in
// across the package boundary in this TS version yields parse errors.
// The public API of this module only ever exposes `FormRow`, so the rest
// of the app never has to care about the underlying DB type.
type DbHandle = any;

export interface FormRow {
  id: number;
  schema: string;        // JSON-stringified JSON Schema
  uischema: string;      // JSON-stringified UI Schema
  name: string;
  description: string;
  created_at: string;    // 'YYYY-MM-DD HH:MM:SS' (SQLite CURRENT_TIMESTAMP)
}

export interface SaveFormInput {
  schema: unknown;
  uiSchema: unknown;
  name: string;
  description?: string;
}

let db: DbHandle | null = null;
let readyPromise: Promise<void> | null = null;

/**
 * Initialise the SQLite engine and create the `form` table on first run.
 * Subsequent calls return the cached promise (idempotent).
 */
export function initDb(): Promise<void> {
  if (readyPromise) return readyPromise;
  readyPromise = (async () => {
    const sqlite3: any = await sqlite3InitModule({
      // The library asks us for the URL of every file it needs (the WASM
      // and the worker). We always return our locally-emitted WASM URL;
      // the worker is auto-resolved by the library itself.
      locateFile: (path: string) => {
        if (path.endsWith('.wasm')) return sqliteWasmUrl;
        return path;
      },
    });
    const capi = sqlite3.capi;
    const oo1 = sqlite3.oo1;

    // Prefer IDBBatchAtomicVFS — works in every modern browser and does
    // not require cross-origin isolation / SharedArrayBuffer. Fall back
    // to the (faster) OPFS VFS if the platform supports it, and finally
    // to a plain in-memory DB as a last resort.
    let vfs = '';
    if (capi.sqlite3_vfs_find('IDBBatchAtomicVFS')) {
      vfs = 'IDBBatchAtomicVFS';
    } else if (capi.sqlite3_vfs_find('opfs')) {
      vfs = 'opfs';
    } else if (capi.sqlite3_vfs_find('memdb')) {
      vfs = 'memdb';
    }

    db = new oo1.DB(
      vfs
        ? `file:rjsf-playground.db?vfs=${vfs}`
        : 'file:rjsf-playground.db',
      'ct',
    );

    db.exec(`
      CREATE TABLE IF NOT EXISTS form (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        schema      TEXT NOT NULL,
        uischema    TEXT NOT NULL,
        name        TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  })();
  return readyPromise;
}

async function getDb(): Promise<NonNullable<typeof db>> {
  if (!db) await initDb();
  if (!db) throw new Error('SQLite database failed to initialise.');
  return db;
}

/**
 * Insert a new row in the `form` table and return the saved row
 * (including its generated `id` and `created_at`).
 */
export async function saveForm(input: SaveFormInput): Promise<FormRow> {
  const d = await getDb();
  const schemaText = JSON.stringify(input.schema ?? {});
  const uiSchemaText = JSON.stringify(input.uiSchema ?? {});
  const name = input.name ?? '';
  const description = input.description ?? '';

  d.exec({
    sql: `
      INSERT INTO form (schema, uischema, name, description)
      VALUES (?, ?, ?, ?);
    `,
    bind: [schemaText, uiSchemaText, name, description],
  });

  // Read back the freshly inserted row so the caller can get its id and
  // created_at without doing a second round trip.
  const rows = d.exec({
    sql: `
      SELECT id, schema, uischema, name, description, created_at
      FROM form
      WHERE id = last_insert_rowid();
    `,
    rowMode: 'object',
    returnValue: 'resultRows',
  }) as unknown as FormRow[];

  if (!rows.length) {
    throw new Error('Insert reported no rows.');
  }
  return rows[0];
}

/**
 * List all rows in the `form` table, newest first.
 */
export async function listForms(): Promise<FormRow[]> {
  const d = await getDb();
  return d.exec({
    sql: `
      SELECT id, schema, uischema, name, description, created_at
      FROM form
      ORDER BY id DESC;
    `,
    rowMode: 'object',
    returnValue: 'resultRows',
  }) as unknown as FormRow[];
}

/**
 * Fetch a single row by id. Returns null if the row does not exist.
 */
export async function loadForm(id: number): Promise<FormRow | null> {
  const d = await getDb();
  const rows = d.exec({
    sql: `
      SELECT id, schema, uischema, name, description, created_at
      FROM form
      WHERE id = ?;
    `,
    bind: [id],
    rowMode: 'object',
    returnValue: 'resultRows',
  }) as unknown as FormRow[];
  return rows[0] ?? null;
}

/**
 * Delete a row by id.
 */
export async function deleteForm(id: number): Promise<void> {
  const d = await getDb();
  d.exec({
    sql: 'DELETE FROM form WHERE id = ?;',
    bind: [id],
  });
}

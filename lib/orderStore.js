import { promises as fs } from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';
import { initialOrders, tags } from '../data/swagOrders';

const localStorePath = path.join(process.cwd(), 'data', '.swag-tracker.local.json');
let localWriteQueue = Promise.resolve();

function defaultPayload() {
  return { orders: initialOrders, availableTags: tags };
}

function normalizePayload(payload) {
  return {
    orders: Array.isArray(payload?.orders) ? payload.orders : [],
    availableTags: Array.isArray(payload?.availableTags) ? payload.availableTags : tags,
  };
}

function databaseUrl() {
  if (process.env.NODE_ENV !== 'production') return process.env.LOCAL_DATABASE_URL || '';
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
}

async function readLocalState() {
  try {
    const stored = JSON.parse(await fs.readFile(localStorePath, 'utf8'));
    return { revision: Number(stored.revision) || 0, payload: normalizePayload(stored.payload) };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const state = { revision: 0, payload: defaultPayload() };
    await fs.writeFile(localStorePath, JSON.stringify(state, null, 2));
    return state;
  }
}

async function writeLocalState(baseRevision, payload) {
  const operation = localWriteQueue.then(async () => {
    const current = await readLocalState();
    if (current.revision !== baseRevision) return { conflict: true, state: current };
    const nextState = { revision: current.revision + 1, payload: normalizePayload(payload) };
    const temporaryPath = `${localStorePath}.${process.pid}.tmp`;
    await fs.writeFile(temporaryPath, JSON.stringify(nextState, null, 2));
    await fs.rename(temporaryPath, localStorePath);
    return { conflict: false, state: nextState };
  });
  localWriteQueue = operation.catch(() => undefined);
  return operation;
}

async function databaseClient() {
  const url = databaseUrl();
  if (!url) {
    if (process.env.NODE_ENV === 'production') throw new Error('DATABASE_URL is required in production.');
    return null;
  }
  const sql = neon(url);
  await sql`CREATE TABLE IF NOT EXISTS swag_tracker_state (
    id integer PRIMARY KEY,
    revision integer NOT NULL,
    payload jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`;
  await sql`INSERT INTO swag_tracker_state (id, revision, payload)
    VALUES (1, 0, ${JSON.stringify(defaultPayload())}::jsonb)
    ON CONFLICT (id) DO NOTHING`;
  return sql;
}

export async function readState() {
  const sql = await databaseClient();
  if (!sql) return readLocalState();
  const rows = await sql`SELECT revision, payload FROM swag_tracker_state WHERE id = 1`;
  const row = rows[0];
  return { revision: Number(row.revision), payload: normalizePayload(row.payload) };
}

export async function writeState(baseRevision, payload) {
  const sql = await databaseClient();
  if (!sql) return writeLocalState(baseRevision, payload);
  const rows = await sql`UPDATE swag_tracker_state
    SET revision = revision + 1, payload = ${JSON.stringify(normalizePayload(payload))}::jsonb, updated_at = now()
    WHERE id = 1 AND revision = ${Number(baseRevision)}
    RETURNING revision, payload`;
  if (!rows.length) return { conflict: true, state: await readState() };
  return { conflict: false, state: { revision: Number(rows[0].revision), payload: normalizePayload(rows[0].payload) } };
}

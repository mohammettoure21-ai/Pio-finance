import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, lstatSync, readdirSync } from 'node:fs';
import { protectPrivate } from './private.mjs';
import { join, resolve } from 'node:path';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';

export const identities = Object.freeze({ holding: 'noir', immobilier: 'jaune', conciergerie: 'rose', afrodemy: 'vert', mbtg: 'blanc' });
export const digest = value => createHash('sha256').update(value).digest('hex');
export const secret = () => randomBytes(32).toString('base64url');
export function privateDirectory(path) {
  path = resolve(path);
  mkdirSync(path, { recursive: true, mode: 0o700 });
  if (lstatSync(path).isSymbolicLink()) throw new Error('Private directory cannot be a symlink');
  protectPrivate(path,true);
  return path;
}
export function openStore(directory) {
  directory = privateDirectory(directory);
  for (const name of readdirSync(directory)) {
    if (lstatSync(join(directory, name)).isSymbolicLink()) throw new Error('Symlink in private directory');
  }
  const path = join(directory, 'pio.sqlite');
  const db = new DatabaseSync(path);
  protectPrivate(path);
  db.exec('PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL) STRICT;');
  const empty = { revision: 0, portfolio: null, password: null, agents: {}, sessions: {}, proposals: [], versions: [], idempotency: {} };
  db.prepare('INSERT OR IGNORE INTO state VALUES (1, ?)').run(JSON.stringify(empty));
  const read = () => JSON.parse(db.prepare('SELECT data FROM state WHERE id=1').get().data);
  function transaction(fn) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const state = read();
      const result = fn(state);
      db.prepare('UPDATE state SET data=? WHERE id=1').run(JSON.stringify(state));
      db.exec('COMMIT');
      return result;
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  }
  return {
    directory, read, transaction,
    init(password) {
      if (typeof password !== 'string' || password.length < 16 || password.length > 256) throw new Error('Password must have 16–256 characters');
      const salt = randomBytes(16).toString('hex');
      const hash = scryptSync(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }).toString('hex');
      transaction(s => { if (s.password) throw new Error('Already initialized'); s.password = { salt, hash }; });
    },
    verifyPassword(password) {
      const p = read().password;
      if (!p || typeof password !== 'string' || password.length > 256) return false;
      return timingSafeEqual(Buffer.from(p.hash, 'hex'), scryptSync(password, p.salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }));
    },
    close: () => db.close(),
  };
}

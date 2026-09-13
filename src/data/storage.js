import { openDB } from 'idb'

/**
 * Storage backend contract
 * ------------------------
 * Every read and write in the app goes through an object shaped like this, and
 * `useSeasonData()` is the only thing that ever holds one. Swapping IndexedDB
 * for Firestore later means writing a second module with these five methods and
 * changing the import in `useSeasonData.js` — no UI component touches storage.
 *
 *   loadAll()                 -> { couples, entries, settings } | null  (null = fresh install)
 *   putCouples(couples)       -> void   (upsert, by id)
 *   putEntries(entries)       -> void   (upsert, by id)
 *   deleteEntries(ids)        -> void
 *   putSettings(settings)     -> void
 *   replaceAll(bundle)        -> void   (destructive; used by JSON import)
 *
 * All methods are async so a networked backend drops in unchanged.
 */

const DB_NAME = 'ballroom-ledger'
const DB_VERSION = 1
const COUPLES = 'couples'
const ENTRIES = 'entries'
const META = 'meta'
const SETTINGS_KEY = 'settings'

let dbPromise = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      // Another tab is holding an older version open, so this one cannot start.
      // Without this the open request simply never settles and the app sits on
      // its loading screen forever.
      blocked() {
        dbPromise = null
        throw new Error('BALLROOM_DB_BLOCKED')
      },
      // This tab is the one in the way: step aside so the other can upgrade.
      blocking() {
        dbPromise = null
      },
      // The browser reclaimed the connection (storage pressure, sleep). Drop the
      // cached handle so the next read opens a fresh one.
      terminated() {
        dbPromise = null
      },
      upgrade(db) {
        if (!db.objectStoreNames.contains(COUPLES)) {
          db.createObjectStore(COUPLES, { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains(ENTRIES)) {
          const store = db.createObjectStore(ENTRIES, { keyPath: 'id' })
          store.createIndex('byCouple', 'coupleId')
          store.createIndex('byWeek', 'week')
        }
        if (!db.objectStoreNames.contains(META)) {
          db.createObjectStore(META)
        }
      },
    }).catch((err) => {
      dbPromise = null
      throw err
    })
  }
  return dbPromise
}

export const indexedDbBackend = {
  async loadAll() {
    const db = await getDB()
    const [couples, entries, settings] = await Promise.all([
      db.getAll(COUPLES),
      db.getAll(ENTRIES),
      db.get(META, SETTINGS_KEY),
    ])
    if (!couples.length && !entries.length && !settings) return null
    return { couples, entries, settings: settings ?? null }
  },

  async putCouples(couples) {
    if (!couples.length) return
    const db = await getDB()
    const tx = db.transaction(COUPLES, 'readwrite')
    await Promise.all([...couples.map((c) => tx.store.put(c)), tx.done])
  },

  async putEntries(entries) {
    if (!entries.length) return
    const db = await getDB()
    const tx = db.transaction(ENTRIES, 'readwrite')
    await Promise.all([...entries.map((e) => tx.store.put(e)), tx.done])
  },

  async deleteEntries(ids) {
    if (!ids.length) return
    const db = await getDB()
    const tx = db.transaction(ENTRIES, 'readwrite')
    await Promise.all([...ids.map((id) => tx.store.delete(id)), tx.done])
  },

  async putSettings(settings) {
    const db = await getDB()
    await db.put(META, settings, SETTINGS_KEY)
  },

  async replaceAll({ couples, entries, settings }) {
    const db = await getDB()
    const tx = db.transaction([COUPLES, ENTRIES, META], 'readwrite')
    await Promise.all([
      tx.objectStore(COUPLES).clear(),
      tx.objectStore(ENTRIES).clear(),
      tx.objectStore(META).clear(),
    ])
    couples.forEach((c) => tx.objectStore(COUPLES).put(c))
    entries.forEach((e) => tx.objectStore(ENTRIES).put(e))
    tx.objectStore(META).put(settings, SETTINGS_KEY)
    await tx.done
  },
}

import "server-only";
import { Pool } from "pg";
import type { PGlite } from "@electric-sql/pglite";

export interface Queryable {
  query<T extends object>(text: string, params?: readonly unknown[]): Promise<T[]>;
}

export interface Db extends Queryable {
  transaction<R>(fn: (tx: Queryable) => Promise<R>): Promise<R>;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS dishes (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price INTEGER NOT NULL CHECK (price > 0),
  available BOOLEAN NOT NULL DEFAULT TRUE,
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  delivery BOOLEAN NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  comment TEXT NOT NULL DEFAULT '',
  payment TEXT NOT NULL CHECK (payment IN ('cash', 'card')),
  subtotal INTEGER NOT NULL,
  delivery_fee INTEGER NOT NULL,
  total INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'cooking', 'on_way', 'done', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS order_items (
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  dish_id INTEGER NOT NULL REFERENCES dishes(id),
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  qty INTEGER NOT NULL CHECK (qty BETWEEN 1 AND 50),
  PRIMARY KEY (order_id, dish_id)
);
CREATE INDEX IF NOT EXISTS orders_created_idx ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS dishes_category_idx ON dishes (category_id, sort);
`;

interface SeedCategory {
  name: string;
  dishes: ReadonlyArray<readonly [name: string, description: string, price: number]>;
}

const SEED: readonly SeedCategory[] = [
  {
    name: "Palov",
    dishes: [
      ["Choyxona palov", "Qo'y go'shti, sariq sabzi, no'xat, bedana tuxumi", 45000],
      ["To'y oshi", "Katta qozon palovi, qazi bilan", 55000],
      ["Samarqand palov", "Qavat-qavat, go'sht ustida", 50000],
    ],
  },
  {
    name: "Somsa va non",
    dishes: [
      ["Tandir somsa", "Mol go'shti va dumba, tandirda", 12000],
      ["Qovoq somsa", "Mavsumiy, yog'li qovoq bilan", 9000],
      ["Patir non", "Issiq, kunjutli", 8000],
    ],
  },
  {
    name: "Shashlik",
    dishes: [
      ["Qo'y go'shti shashlik", "1 six, piyoz va ko'kat bilan", 22000],
      ["Jigar shashlik", "1 six, dumba bilan", 18000],
      ["Tovuq qanoti", "1 six, achchiq sous", 16000],
    ],
  },
  {
    name: "Sho'rva va lag'mon",
    dishes: [
      ["Mastava", "Guruch, go'sht, sabzavot, qatiq bilan", 32000],
      ["Qovurma lag'mon", "Qo'lda cho'zilgan xamir", 42000],
      ["Shurpa", "Qo'y go'shti, kartoshka, sabzi", 38000],
    ],
  },
  {
    name: "Ichimliklar",
    dishes: [
      ["Ko'k choy", "Choynak", 6000],
      ["Kompot", "1 litr, uy usulida", 15000],
      ["Ayron", "0,5 litr", 10000],
    ],
  },
];

function wrapPg(client: { query: Pool["query"] }): Queryable {
  return {
    async query<T extends object>(text: string, params: readonly unknown[] = []) {
      const res = await client.query(text, [...params]);
      return res.rows as T[];
    },
  };
}

function wrapLite(lite: Pick<PGlite, "query">): Queryable {
  return {
    async query<T extends object>(text: string, params: readonly unknown[] = []) {
      const res = await lite.query<T>(text, [...params]);
      return res.rows;
    },
  };
}

/** Jadvallar va boshlang'ich menyu. Bir vaqtda ishga tushgan serverlar ikki marta yozmasligi uchun qulf ostida. */
async function migrate(tx: Queryable, runSchema: (sql: string) => Promise<void>): Promise<void> {
  await runSchema(SCHEMA);
  const rows = await tx.query<{ count: string }>("SELECT count(*)::text AS count FROM categories");
  if (rows[0]?.count !== "0") return;
  for (const [ci, cat] of SEED.entries()) {
    const [inserted] = await tx.query<{ id: number }>("INSERT INTO categories (name, sort) VALUES ($1, $2) RETURNING id", [
      cat.name,
      ci,
    ]);
    if (!inserted) throw new Error("Kategoriya yaratilmadi");
    for (const [di, [name, description, price]] of cat.dishes.entries()) {
      await tx.query("INSERT INTO dishes (category_id, name, description, price, sort) VALUES ($1, $2, $3, $4, $5)", [
        inserted.id,
        name,
        description,
        price,
        di,
      ]);
    }
  }
}

async function createDb(): Promise<Db> {
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

  if (url) {
    const pool = new Pool({ connectionString: url, max: 3, ssl: url.includes("localhost") ? false : { rejectUnauthorized: false } });
    const db: Db = {
      ...wrapPg(pool),
      async transaction(fn) {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const result = await fn(wrapPg(client));
          await client.query("COMMIT");
          return result;
        } catch (err) {
          await client.query("ROLLBACK");
          throw err;
        } finally {
          client.release();
        }
      },
    };
    await db.transaction(async (tx) => {
      await tx.query("SELECT pg_advisory_xact_lock(7312)");
      await migrate(tx, async (sql) => {
        await tx.query(sql);
      });
    });
    return db;
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const lite = await PGlite.create(process.env.PGLITE_DIR ?? "memory://");
  const db: Db = {
    ...wrapLite(lite),
    transaction: (fn) => lite.transaction((tx) => fn(wrapLite(tx))),
  };
  await migrate(db, async (sql) => {
    await lite.exec(sql);
  });
  return db;
}

const globalForDb = globalThis as unknown as { __restoranDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  if (!globalForDb.__restoranDb) {
    globalForDb.__restoranDb = createDb().catch((err: unknown) => {
      globalForDb.__restoranDb = undefined;
      throw err;
    });
  }
  return globalForDb.__restoranDb;
}

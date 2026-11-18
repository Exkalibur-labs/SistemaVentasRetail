import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * Cliente de base de datos con inicialización perezosa para no fallar durante `next build`
 * cuando `DATABASE_URL` no está presente en tiempo de compilación.
 * En desarrollo se reutiliza el pool entre recargas de Next.js.
 */
const globalForDb = globalThis as unknown as {
  __pgPool?: Pool;
  __drizzleDb?: NodePgDatabase<typeof schema>;
};

function createPool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "Falta DATABASE_URL. Copia .env.example a .env y configura la conexión.",
    );
  }
  return new Pool({
    connectionString: url,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    ssl:
      process.env.DATABASE_SSL === "true"
        ? { rejectUnauthorized: false }
        : undefined,
  });
}

export function getPool(): Pool {
  if (!globalForDb.__pgPool) {
    globalForDb.__pgPool = createPool();
  }
  return globalForDb.__pgPool;
}

export function getDb(): NodePgDatabase<typeof schema> {
  if (!globalForDb.__drizzleDb) {
    globalForDb.__drizzleDb = drizzle(getPool(), { schema });
  }
  return globalForDb.__drizzleDb;
}

function lazyProxy<T extends object>(resolve: () => T): T {
  return new Proxy({} as T, {
    get(_target, prop) {
      const instance = resolve();
      const value = Reflect.get(instance, prop, instance);
      return typeof value === "function" ? value.bind(instance) : value;
    },
  });
}

export const pool: Pool = lazyProxy(getPool);
export const db: NodePgDatabase<typeof schema> = lazyProxy(getDb);
export type Db = NodePgDatabase<typeof schema>;
/** Tipo de la transacción (mismo API que db). */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type DbOrTx = Db | Tx;
export { schema };

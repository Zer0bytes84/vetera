import pg from "pg";

export async function createPostgresStore(connectionString) {
  if (!connectionString)
    throw new Error(
      "DATABASE_URL manquante. Connectez une base PostgreSQL au projet Vercel."
    );
  const pool = new pg.Pool({
    connectionString,
    max: 3,
    connectionTimeoutMillis: 8000,
    idleTimeoutMillis: 20000,
    allowExitOnIdle: true,
  });
  pool.on("error", () =>
    console.error("[activation] PostgreSQL connection interrupted.")
  );
  const init = await pool.connect();
  let initError;
  try {
    await init.query("BEGIN");
    await init.query("SELECT pg_advisory_xact_lock(728419201)");
    await init.query(
      "CREATE TABLE IF NOT EXISTS baitari_license_store (id integer PRIMARY KEY CHECK (id = 1), data jsonb NOT NULL)"
    );
    await init.query(
      `INSERT INTO baitari_license_store (id,data) VALUES (1,'{"licenses":{}}'::jsonb) ON CONFLICT (id) DO NOTHING`
    );
    await init.query(
      "CREATE TABLE IF NOT EXISTS baitari_license_rate_limits (address_hash text PRIMARY KEY, window_start bigint NOT NULL, attempts integer NOT NULL)"
    );
    await init.query("COMMIT");
  } catch (error) {
    await init.query("ROLLBACK");
    initError = error;
  } finally {
    init.release();
  }
  if (initError) {
    await pool.end();
    throw initError;
  }
  return {
    read: async () =>
      (await pool.query("SELECT data FROM baitari_license_store WHERE id=1"))
        .rows[0].data,
    async transaction(change) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SET LOCAL statement_timeout = '8s'");
        const state = (
          await client.query(
            "SELECT data FROM baitari_license_store WHERE id=1 FOR UPDATE"
          )
        ).rows[0].data;
        const result = change(state);
        await client.query(
          "UPDATE baitari_license_store SET data=$1::jsonb WHERE id=1",
          [JSON.stringify(state)]
        );
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
    async consumeRateLimit(address, now) {
      // Shared across serverless instances; no raw client addresses are stored.
      const start = Math.floor(now / 60000) * 60000;
      const result = await pool.query(
        `INSERT INTO baitari_license_rate_limits(address_hash,window_start,attempts) VALUES($1,$2,1)
    ON CONFLICT(address_hash) DO UPDATE SET window_start=$2,
    attempts=CASE WHEN baitari_license_rate_limits.window_start=$2 THEN baitari_license_rate_limits.attempts+1 ELSE 1 END RETURNING attempts`,
        [address, start]
      );
      if (Math.random() < 0.02)
        await pool.query(
          "DELETE FROM baitari_license_rate_limits WHERE window_start<$1",
          [start - 120000]
        );
      return result.rows[0].attempts <= 60;
    },
    close: () => pool.end(),
  };
}

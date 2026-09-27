import "dotenv/config";
import pg from "pg";

const { Client } = pg;

export const admin = new Client({
  connectionString: process.env.DATABASE_URL,
});

let connected: Promise<void> | undefined;

export function connectAdmin(): Promise<void> {
  if (connected) return connected;
  const pending = admin
    .connect()
    .then(() => undefined)
    .catch((error: unknown) => {
      connected = undefined;
      throw error;
    });
  connected = pending;
  return pending;
}

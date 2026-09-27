import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export function tenantDatabaseUrl(databaseName: string): string {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");
  const url = new URL(databaseUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

export async function migrateTenantDatabase(databaseName: string): Promise<void> {
  await execFileAsync(
    "pnpm",
    [
      "exec",
      "prisma",
      "db",
      "migrate",
      "--config",
      "prisma.tenant.config.ts",
      "--db",
      tenantDatabaseUrl(databaseName),
      "--yes",
      "--no-interactive",
    ],
    { cwd: process.cwd() },
  );
}

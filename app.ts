import express from "express";
import pg from "pg";
import { admin, connectAdmin } from "./src/admin";
import { migrateTenantDatabase, tenantDatabaseUrl } from "./src/migrate-tenant";
import { db } from "./src/prisma/landloard/db";
import { tenantDb } from "./src/prisma/tenant/db";

const { escapeIdentifier } = pg;
const databaseNamePattern = /^[a-z][a-z0-9_]{0,62}$/;
const emailPattern = /^[^\s@]+@[^\s@]+$/;
const tenantClients = new Map<string, ReturnType<typeof tenantDb>>();


const app = express();

app.use(express.json());

app.get("/", async (req, res) => {
  const tenants = await db.orm.public.tenant.all();
  res.status(200).json({
    message: "Tenants fetched successfully",
    data: tenants,
  });
});

// create a new tenant and create database for it
app.post("/create-tenant", async (req, res) => {
  const tenant_key = req.body?.tenant_key;
  if (typeof tenant_key !== "string" || !databaseNamePattern.test(tenant_key)) {
    res.status(400).json({
      message:
        "tenant_key must start with a letter and use only lowercase letters, digits, and underscores",
    });
    return;
  }

  await connectAdmin();
  const existing = await admin.query<{ exists: boolean }>(
    "SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = $1) AS exists",
    [tenant_key],
  );
  if (existing.rows[0]?.exists) {
    res.status(409).json({ message: "Tenant database already exists" });
    return;
  }

  await admin.query(`CREATE DATABASE ${escapeIdentifier(tenant_key)}`);

  try {
    await migrateTenantDatabase(tenant_key);
  } catch (error) {
    await admin.query(`DROP DATABASE IF EXISTS ${escapeIdentifier(tenant_key)}`).catch(() => undefined);
    const message = error instanceof Error ? error.message : "Failed to migrate tenant database";
    res.status(500).json({ message });
    return;
  }

  const tenant = await db.orm.public.tenant.create({
    tenant_key,
  });

  res.status(201).json({
    message: "Tenant created successfully",
    data: {
      ...tenant,
      database_name: tenant_key,
    },
  });
});

app.get("/tenants/:tenant_key/users", async (req, res) => {
  const tenant = await findTenant(req.params.tenant_key);
  if (!tenant) {
    res.status(404).json({ message: "Tenant not found" });
    return;
  }

  const users = await clientFor(tenant.tenant_key).orm.public.User.all();
  res.status(200).json({
    message: "Users fetched successfully",
    data: users,
  });
});

app.post("/tenants/:tenant_key/users", async (req, res) => {
  const tenant = await findTenant(req.params.tenant_key);
  if (!tenant) {
    res.status(404).json({ message: "Tenant not found" });
    return;
  }

  const email = req.body?.email;
  const name = req.body?.name;
  if (typeof email !== "string" || !emailPattern.test(email)) {
    res.status(400).json({ message: "email must be a valid email address" });
    return;
  }
  if (name !== undefined && typeof name !== "string") {
    res.status(400).json({ message: "name must be a string" });
    return;
  }

  try {
    const user = await clientFor(tenant.tenant_key).orm.public.User.create({
      email,
      ...(typeof name === "string" && name.trim() !== "" ? { name: name.trim() } : {}),
    });
    res.status(201).json({
      message: "User created successfully",
      data: user,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      res.status(409).json({ message: "A user with this email already exists" });
      return;
    }
    throw error;
  }
});

async function findTenant(tenantKey: string | undefined) {
  if (typeof tenantKey !== "string" || !databaseNamePattern.test(tenantKey)) return null;
  return db.orm.public.tenant.where({ tenant_key: tenantKey }).first();
}

function clientFor(tenantKey: string) {
  const existing = tenantClients.get(tenantKey);
  if (existing) return existing;
  const client = tenantDb(tenantDatabaseUrl(tenantKey));
  tenantClients.set(tenantKey, client);
  return client;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "sqlState" in error &&
    error.sqlState === "23505"
  );
}

app.listen(5000, () => {
  console.log("Server is running on port 5000");
});

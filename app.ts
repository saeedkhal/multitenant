import express from "express";
import pg from "pg";
import { admin, connectAdmin } from "./src/admin";
import { db } from "./src/prisma/db";

const { escapeIdentifier, escapeLiteral } = pg;

const schoolNamePattern = /^[a-z][a-z0-9_]{0,62}$/;

const app = express();

app.use(express.json());

app.get("/", async (req, res) => {
  const users = await db.orm.public.User.all();
  res.status(200).json({
    message: "Users fetched successfully",
    data: users,
  });
});

app.post("/", async (req, res) => {
  const schoolName = req.body?.schoolName;
  if (typeof schoolName !== "string" || !schoolNamePattern.test(schoolName)) {
    res.status(400).json({
      message:
        "schoolName must start with a letter and use only lowercase letters, digits, and underscores",
    });
    return;
  }

  const schoolDatabaseUrl = `postgresql://${schoolName}:${schoolName}@localhost:5432/${schoolName}`;

  try {
    await connectAdmin();
    const existing = await admin.query<{ database_exists: boolean }>(
      "SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = $1) AS database_exists",
      [schoolName],
    );
    if (existing.rows[0]?.database_exists) {
      res.status(409).json({ message: "School database already exists" });
      return;
    }

    const role = await admin.query<{ role_exists: boolean }>(
      "SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = $1) AS role_exists",
      [schoolName],
    );
    if (!role.rows[0]?.role_exists) {
      await admin.query(
        `CREATE ROLE ${escapeIdentifier(schoolName)} LOGIN PASSWORD ${escapeLiteral(schoolName)}`,
      );
    }

    await admin.query(
      `CREATE DATABASE ${escapeIdentifier(schoolName)} OWNER ${escapeIdentifier(schoolName)}`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create school database";
    res.status(500).json({ message });
    return;
  }

  await db.orm.public.User.create({
    schoolName,
    schoolDatabaseUrl,
  });

  res.status(201).json({
    message: "School created successfully",
    data: schoolDatabaseUrl,
  });
});

app.listen(5000, () => {
  console.log("Server is running on port 5000");
});

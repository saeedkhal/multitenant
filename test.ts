import { admin, connectAdmin } from "./src/admin";

async function test() {
  await connectAdmin();
  const existing = await admin.query("SELECT 1");
  console.log(existing.rows);
  await admin.end();
}

test();

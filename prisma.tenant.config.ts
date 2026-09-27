import 'dotenv/config';
import { definePrismaConfig } from '@prisma/cli-engine';
import { defineConfig as ormConfig } from '@prisma/orm-postgres/config';

export default definePrismaConfig({
  orm: ormConfig({
    contract: './src/prisma/tenant/tenant.prisma',
    migrations: { dir: 'migrations/tenant' },
    db: {
      connection: process.env['DATABASE_URL']!,
    },
  }),
});

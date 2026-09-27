#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/fec17785b42636157f6d2a44bc823243ebe9a1148811adf8006b4c521a7ce3dc/contract';
import endContract from '../../snapshots/fec17785b42636157f6d2a44bc823243ebe9a1148811adf8006b4c521a7ce3dc/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'User',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('schoolDatabaseUrl', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('schoolName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);

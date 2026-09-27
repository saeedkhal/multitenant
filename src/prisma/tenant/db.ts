import postgres from '@prisma/orm-postgres/runtime';
import type { Contract } from './tenant';
import contractJson from './tenant.json' with { type: 'json' };

export function tenantDb(url: string) {
  return postgres<Contract>({
    contractJson,
    url,
  });
}

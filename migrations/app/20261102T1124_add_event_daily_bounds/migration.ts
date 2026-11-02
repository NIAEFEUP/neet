#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/40743f4273a2210ce4d130dbab9bd961d5a6b9633e44ce490d25305c997d40da/contract';
import endContract from '../../snapshots/40743f4273a2210ce4d130dbab9bd961d5a6b9633e44ce490d25305c997d40da/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/c307b3b0e2eb63e240a88f70e34e07f118ea66115e590b9d529d7fd87deef231/contract';
import startContract from '../../snapshots/c307b3b0e2eb63e240a88f70e34e07f118ea66115e590b9d529d7fd87deef231/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Event',
        column: col('endTime', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Event',
        column: col('startTime', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);

#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/1a45590f99accd759cfaf1cdaf03bbfd5bbecdef9822e1bf5c00801577fe9ad2/contract';
import endContract from '../../snapshots/1a45590f99accd759cfaf1cdaf03bbfd5bbecdef9822e1bf5c00801577fe9ad2/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/a7e082ada7e174d22523d2f5e724ff04371da98d6acbfb99258bd59559bce0b5/contract';
import startContract from '../../snapshots/a7e082ada7e174d22523d2f5e724ff04371da98d6acbfb99258bd59559bce0b5/contract.json' with { type: 'json' };
import { Temporal } from 'temporal-polyfill';

(globalThis as typeof globalThis & { Temporal?: typeof Temporal }).Temporal = Temporal;

import postgres from '@prisma/orm-postgres/runtime';
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

const { sql: db, contract } = postgres<End>({ contractJson: endContract });

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Participant',
        column: col('userId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      // Participants used to be anonymous: a per-event cookie plus a typed
      // name, with no account behind them. There is nothing to attribute them
      // to, so they cannot satisfy the new NOT NULL "userId" — drop them
      // (their availability rows cascade) rather than invent an owner.
      this.dataTransform(contract, 'backfill-Participant-userId', {
        check: () =>
          db.public.Participant.select('id')
            .where((f, fns) => fns.eq(f.userId, null))
            .limit(1),
        run: () =>
          db.public.Participant.delete().where((f, fns) => fns.eq(f.userId, null)),
      }),
      this.setNotNull({ schema: 'public', table: 'Participant', column: 'userId' }),
      this.addUnique({
        schema: 'public',
        table: 'Participant',
        constraint: 'Participant_eventId_userId_key',
        columns: ['eventId', 'userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Participant',
        index: 'Participant_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Participant',
        foreignKey: {
          name: 'Participant_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);

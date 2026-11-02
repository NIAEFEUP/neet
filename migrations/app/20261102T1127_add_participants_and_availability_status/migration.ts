#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/40743f4273a2210ce4d130dbab9bd961d5a6b9633e44ce490d25305c997d40da/contract';
import startContract from '../../snapshots/40743f4273a2210ce4d130dbab9bd961d5a6b9633e44ce490d25305c997d40da/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/7a6c828df60ceaf477fb5d859e628d8a8afa43dac17135f34e90f4eeb47e3c03/contract';
import endContract from '../../snapshots/7a6c828df60ceaf477fb5d859e628d8a8afa43dac17135f34e90f4eeb47e3c03/contract.json' with { type: 'json' };
import { Temporal } from 'temporal-polyfill';

globalThis.Temporal = Temporal;

import postgres from '@prisma/orm-postgres/runtime';
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

const { sql: db, contract } = postgres<End>({ contractJson: endContract });

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropConstraint({
        schema: 'public',
        table: 'Availability',
        constraint: 'Availability_userId_fkey',
        kind: 'foreignKey',
      }),
      this.dropIndex({
        schema: 'public',
        table: 'Availability',
        index: 'Availability_userId_idx_a489d58a',
      }),
      this.dropColumn({ schema: 'public', table: 'Availability', column: 'userId' }),
      this.createTable({
        schema: 'public',
        table: 'Participant',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('eventId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('modality', 'text', {
            notNull: true,
            default: lit('in_person'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'Participant_modality_check_5669a018',
            "\"modality\" IN ('in_person', 'online')",
          ),
        ],
      }),
      this.addColumn({
        schema: 'public',
        table: 'Availability',
        column: col('status', 'text', {
          notNull: true,
          default: lit('available'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Availability',
        column: col('participantId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
      }),
      // The old rows were tied to a global User, not to an event-scoped guest
      // response, so there is no honest participant to map them to. The app is
      // pre-release and these rows are seed data; drop them before the new
      // participantId column becomes required.
      this.dataTransform(contract, 'clear-legacy-availabilities', {
        check: () =>
          db.public.Availability.select('id')
            .where((f, fns) => fns.eq(f.participantId, null))
            .limit(1),
        run: () =>
          db.public.Availability.delete().where((f, fns) =>
            fns.eq(f.participantId, null),
          ),
      }),
      this.setNotNull({ schema: 'public', table: 'Availability', column: 'participantId' }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'Availability',
        constraint: 'Availability_status_check_22f79d17',
        expression: "\"status\" IN ('available', 'if_need_be')",
      }),
      this.createIndex({
        schema: 'public',
        table: 'Availability',
        index: 'Availability_participantId_idx_e6c70ceb',
        columns: ['participantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Participant',
        index: 'Participant_eventId_idx_6a266d47',
        columns: ['eventId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Participant',
        foreignKey: {
          name: 'Participant_eventId_fkey',
          columns: ['eventId'],
          references: { schema: 'public', table: 'Event', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Availability',
        foreignKey: {
          name: 'Availability_participantId_fkey',
          columns: ['participantId'],
          references: { schema: 'public', table: 'Participant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);

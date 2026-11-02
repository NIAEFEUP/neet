#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/7a6c828df60ceaf477fb5d859e628d8a8afa43dac17135f34e90f4eeb47e3c03/contract';
import startContract from '../../snapshots/7a6c828df60ceaf477fb5d859e628d8a8afa43dac17135f34e90f4eeb47e3c03/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/7b525222390501732368f17d5d765041988e5c9b450eaccb4db85ba6e3a74f28/contract';
import endContract from '../../snapshots/7b525222390501732368f17d5d765041988e5c9b450eaccb4db85ba6e3a74f28/contract.json' with { type: 'json' };
import { Temporal } from 'temporal-polyfill';

globalThis.Temporal = Temporal;

import postgres from '@prisma/orm-postgres/runtime';
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

const { sql: db, contract } = postgres<End>({ contractJson: endContract });

/** The old `available` value is no longer part of the end contract. */
const legacyStatus = (value: string) => value as never;

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropCheckConstraint({
        schema: 'public',
        table: 'Availability',
        constraint: 'Availability_status_check_22f79d17',
      }),
      this.dropCheckConstraint({
        schema: 'public',
        table: 'Participant',
        constraint: 'Participant_modality_check_5669a018',
      }),
      this.dropColumn({ schema: 'public', table: 'Participant', column: 'modality' }),
      // The setDefault postcheck only asserts that *a* default exists, so the
      // runner would skip it while the old default is still in place. Drop the
      // default first to force the new literal through.
      this.dropDefault({
        schema: 'public',
        table: 'Availability',
        column: 'status',
      }),
      this.setDefault({
        schema: 'public',
        table: 'Availability',
        column: 'status',
        defaultSql: "DEFAULT 'yes'",
        operationClass: 'widening',
      }),
      this.dataTransform(contract, 'rename-available-to-yes', {
        check: () =>
          db.public.Availability.select('id')
            .where((f, fns) => fns.eq(f.status, legacyStatus('available')))
            .limit(1),
        run: () =>
          db.public.Availability.update({ status: 'yes' }).where((f, fns) =>
            fns.eq(f.status, legacyStatus('available')),
          ),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'Availability',
        constraint: 'Availability_status_check_a85a7e5d',
        expression: "\"status\" IN ('yes', 'if_need_be')",
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);

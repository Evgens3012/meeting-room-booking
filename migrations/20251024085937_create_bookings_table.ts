import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1) Нужное расширение для EXCLUDE по room_id
  await knex.raw(`CREATE EXTENSION IF NOT EXISTS btree_gist`);

  // 2) Основная таблица бронирований
  await knex.schema.createTable('bookings', (t) => {
    t.increments('id').primary();
    t
      .integer('room_id')
      .notNullable()
      .references('id')
      .inTable('rooms')
      .onDelete('CASCADE'); // если комнату удалить — бронирования тоже

    t.string('title').notNullable(); // название встречи
    t.timestamp('start_at', { useTz: true }).notNullable();
    t.timestamp('end_at', { useTz: true }).notNullable();

    t.timestamps(true, true); // created_at, updated_at
  });

  // 3) Запрет пересечений: для одной room_id диапазоны времени не должны пересекаться
  await knex.raw(`
    ALTER TABLE bookings
    ADD CONSTRAINT bookings_no_overlap
    EXCLUDE USING GIST (
      room_id WITH =,
      tstzrange(start_at, end_at, '[]') WITH &&
    )
  `);

  // 4) Индекс на поиск по комнате/времени (ускоряет запросы)
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_bookings_room_period
    ON bookings
    USING GIST (room_id, tstzrange(start_at, end_at, '[]'));
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('bookings');
}

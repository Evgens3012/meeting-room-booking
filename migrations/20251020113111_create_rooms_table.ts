import type { Knex } from 'knex';

// Применение миграции: создаём таблицу rooms
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('rooms', (table) => {
    table.increments('id').primary();     // автоинкрементный ID (PK)
    table.string('name').notNullable();   // название комнаты
    table.integer('capacity').notNullable(); // вместимость
    table.text('description');            // описание (опционально)
    table.timestamps(true, true);         // created_at, updated_at (UTC)
  });
}

// Откат миграции: удаляем таблицу rooms
export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('rooms');
}

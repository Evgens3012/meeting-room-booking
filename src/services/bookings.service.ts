import type { ServiceSchema } from 'moleculer';
import { Errors } from 'moleculer';
import Knex from 'knex';
import { z } from 'zod';

// Подключение к БД через ENV (работает и локально, и в Docker)
const knex = Knex({
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 15432,
    user: process.env.DB_USER || 'app_user',
    password: process.env.DB_PASSWORD || 'app_password',
    database: process.env.DB_NAME || 'meeting_room_db',
  },
});

/** Валидация: создание брони */
const createBookingSchema = z
  .object({
    room_id: z.number().int().min(1, { message: 'room_id минимум 1' }),
    title: z.string().min(1, { message: 'title обязателен' }).max(200, { message: 'title слишком длинный' }),
    start_at: z.string().min(1, { message: 'start_at обязателен' }), // ISO-строка
    end_at: z.string().min(1, { message: 'end_at обязателен' }),     // ISO-строка
  })
  .superRefine((val, ctx) => {
    const start = new Date(val.start_at);
    const end = new Date(val.end_at);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['start_at'], message: 'Некорректный формат даты/времени' });
    } else if (start >= end) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['end_at'], message: 'end_at должен быть позже start_at' });
    }
  });

/** Валидация: список (пагинация + фильтры) */
const listQuerySchema = z.object({
  limit: z
    .preprocess((v) => (v === undefined ? 50 : Number(v)), z.number().int().min(1).max(100))
    .default(50),
  offset: z
    .preprocess((v) => (v === undefined ? 0 : Number(v)), z.number().int().min(0))
    .default(0),
  room_id: z.preprocess((v) => (v == null ? undefined : Number(v)), z.number().int().min(1)).optional(),
  from: z.string().optional(), // ISO
  to: z.string().optional(),   // ISO
});

const BookingsService: ServiceSchema = {
  name: 'bookings',

  actions: {
    /** GET /bookings?limit&offset&room_id&from&to */
    async list(ctx) {
      const parsed = listQuerySchema.safeParse(ctx.params);
      if (!parsed.success) {
        throw new Errors.MoleculerClientError('Validation failed', 400, 'VALIDATION_ERROR', {
          issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        });
      }
      const { limit, offset, room_id, from, to } = parsed.data;

      const q = knex('bookings').select('*').orderBy('id');

      if (room_id) q.where({ room_id });
      if (from) q.andWhere('end_at', '>', new Date(from).toISOString()); // есть смысл показать активные относительно from
      if (to) q.andWhere('start_at', '<', new Date(to).toISOString());

      const rows = await q.limit(limit).offset(offset);
      return { data: rows, limit, offset, count: rows.length };
    },

    /** POST /bookings  body: { room_id, title, start_at, end_at } (ISO) */
    async create(ctx) {
      const normalized = {
        ...ctx.params,
        room_id: typeof ctx.params?.room_id === 'string' ? Number(ctx.params.room_id) : ctx.params?.room_id,
      };

      const parsed = createBookingSchema.safeParse(normalized);
      if (!parsed.success) {
        throw new Errors.MoleculerClientError('Validation failed', 400, 'VALIDATION_ERROR', {
          issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        });
      }

      const { room_id, title, start_at, end_at } = parsed.data;

      try {
        const [booking] = await knex('bookings')
          .insert({
            room_id,
            title,
            start_at: new Date(start_at).toISOString(),
            end_at: new Date(end_at).toISOString(),
          })
          .returning('*');

        return booking;
      } catch (err: any) {
        // Перехватываем конфликт пересечения
        // В Postgres для EXCLUDE обычно SQLSTATE начинается с '23', а текст содержит имя нашего ограничения
        const message = String(err?.message || '');
        const code = String(err?.code || '');
        if (message.includes('bookings_no_overlap') || code.startsWith('23')) {
          throw new Errors.MoleculerClientError(
            'Время занято: пересечение бронирований в этой комнате',
            409,
            'BOOKING_OVERLAP',
            { hint: 'Выберите другой интервал или комнату' }
          );
        }
        // Неизвестная ошибка БД
        throw new Errors.MoleculerClientError('Database error', 500, 'DB_ERROR');
      }
    },
  },
};

export default BookingsService;

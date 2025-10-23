import type { ServiceSchema } from 'moleculer';
import { Errors } from 'moleculer';
import Knex from 'knex';
import { z } from 'zod'; // <-- Zod

// Подключение к БД
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


/**
 * Схемы Zod
 * - createRoomSchema: для POST /rooms
 * - listQuerySchema: для GET /rooms (limit/offset)
 */
const createRoomSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'name обязателен' })
    .max(100, { message: 'name слишком длинный' }),
  capacity: z
    .number()
    .int({ message: 'capacity должен быть целым числом' })
    .min(1, { message: 'capacity минимум 1' }),
  description: z
    .string()
    .max(500, { message: 'description слишком длинный' })
    .optional(),
});


const listQuerySchema = z.object({
  limit: z
    .preprocess((v) => (v === undefined ? 50 : Number(v)), z.number().int().min(1).max(100))
    .default(50),
  offset: z
    .preprocess((v) => (v === undefined ? 0 : Number(v)), z.number().int().min(0))
    .default(0),
});

const RoomsService: ServiceSchema = {
  name: 'rooms',

  actions: {
    // GET /rooms?limit=..&offset=..
    async list(ctx) {
      // ctx.params включает query-параметры из moleculer-web
      const parsed = listQuerySchema.safeParse(ctx.params);
      if (!parsed.success) {
        throw new Errors.MoleculerClientError('Validation failed', 400, 'VALIDATION_ERROR', {
          issues: parsed.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        });
      }
      const { limit, offset } = parsed.data;

      const rows = await knex('rooms').select('*').orderBy('id').limit(limit).offset(offset);
      return { data: rows, limit, offset, count: rows.length };
    },

    // POST /rooms  body: { name, capacity, description? }
    async create(ctx) {
      // moleculer-web кладёт JSON body в ctx.params
      // Приводим capacity к числу, если пришла строка (например, из Postman)
      const normalizedParams = {
        ...ctx.params,
        capacity:
          typeof ctx.params?.capacity === 'string'
            ? Number(ctx.params.capacity)
            : ctx.params?.capacity,
      };

      const parsed = createRoomSchema.safeParse(normalizedParams);
      if (!parsed.success) {
        throw new Errors.MoleculerClientError('Validation failed', 400, 'VALIDATION_ERROR', {
          issues: parsed.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        });
      }

      const { name, capacity, description } = parsed.data;

      const [room] = await knex('rooms')
        .insert({ name, capacity, description })
        .returning('*');

      return room;
    },
  },
};

export default RoomsService;

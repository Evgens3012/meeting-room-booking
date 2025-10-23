import request from 'supertest';
import { createTestBroker } from '../src/server';

describe('Rooms API', () => {
  let broker: any;
  let baseUrl: string;

  beforeAll(async () => {
    const setup = await createTestBroker();
    broker = setup.broker;
    baseUrl = setup.baseUrl;
  });

  afterAll(async () => {
    await broker.stop();
  });

  it('создаёт новую комнату (валидные данные)', async () => {
    const res = await request(baseUrl)
      .post('/rooms')
      .send({ name: 'Тестовая', capacity: 5 });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
  });

  it('отклоняет комнату с пустым именем', async () => {
    const res = await request(baseUrl)
      .post('/rooms')
      .send({ name: '', capacity: 3 });
    expect(res.status).toBe(400);
    expect(res.body.type).toBe('VALIDATION_ERROR');
  });

  it('возвращает список комнат', async () => {
    const res = await request(baseUrl).get('/rooms');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
  });
  
  it('не создаёт комнату с capacity = 0', async () => {
  const res = await request(baseUrl)
    .post('/rooms')
    .send({ name: 'Ошибка', capacity: 0 });
  expect(res.status).toBe(400);
  expect(res.body.type).toBe('VALIDATION_ERROR');
});
});

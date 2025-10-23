import { ServiceBroker } from 'moleculer';
import ApiService from 'moleculer-web';
import RoomsService from './services/rooms.service';

export async function createTestBroker() {
  const broker = new ServiceBroker({
    nodeID: 'test-node',
    transporter: null,
    logger: false,
  });

  broker.createService({
    name: 'api',
    mixins: [ApiService],
    settings: {
      port: 0, // случайный свободный порт
      routes: [
        {
          path: '/api',
          aliases: {
            'GET /rooms': 'rooms.list',
            'POST /rooms': 'rooms.create',
          },
          bodyParsers: { json: true },
        },
      ],
    },
  });

  broker.createService(RoomsService);
  await broker.start();

  const port = (broker.getLocalService('api')?.server.address() as any).port;
  return { broker, baseUrl: `http://localhost:${port}/api` };
}

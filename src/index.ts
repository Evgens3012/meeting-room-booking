import { ServiceBroker } from 'moleculer';
import ApiService from 'moleculer-web';
import RoomsService from './services/rooms.service';

async function main() {
  const broker = new ServiceBroker({
    nodeID: 'meeting-room-node',
    transporter: null,
    logger: true,
  });

  // API
  broker.createService({
    name: 'api',
    mixins: [ApiService],
    settings: {
      port: 3000,
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

  // важно: дожидаемся старта
  await broker.start();

  console.log('✅ Moleculer API запущен на http://localhost:3000/api');
}

// Запускаем
main().catch(console.error);

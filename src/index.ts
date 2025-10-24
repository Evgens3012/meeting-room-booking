import { ServiceBroker } from 'moleculer';
import ApiService from 'moleculer-web';
import RoomsService from './services/rooms.service';
import BookingsService from './services/bookings.service';

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
            'GET /bookings': 'bookings.list',
            'POST /bookings': 'bookings.create'
          },
          bodyParsers: { json: true },
        },
      ],
    },
  });

  broker.createService(RoomsService);
  broker.createService(BookingsService);

  await broker.start();
  console.log('✅ Moleculer API запущен на http://localhost:3000/api');
}

// Запускаем
main().catch(console.error);

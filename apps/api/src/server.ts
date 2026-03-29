import 'dotenv/config';
import app from './app';
import { prisma } from './lib/prisma';

const PORT = Number(process.env.PORT) || 3001;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[API] Server running on http://0.0.0.0:${PORT}`);
});

function gracefulShutdown(signal: string) {
  console.log(`[API] ${signal} received. Shutting down gracefully...`);

  server.close(async () => {
    console.log('[API] HTTP server closed.');
    await prisma.$disconnect();
    console.log('[API] Prisma disconnected.');
    process.exit(0);
  });

  // Force exit after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    console.error('[API] Forced shutdown after timeout.');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { logger } from './logger';
import { settingsRouter } from './routes/settings';
import { techniciansRouter } from './routes/technicians';
import { requestsRouter } from './routes/requests';
import { logsRouter } from './routes/logs';

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(
  morgan('short', {
    stream: { write: (msg: string) => logger.info(msg.trim()) }
  })
);

app.use('/api/settings', settingsRouter);
app.use('/api/technicians', techniciansRouter);
app.use('/api/requests', requestsRouter);
app.use('/api/logs', logsRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', { err: err?.message, stack: err?.stack });
  res.status(500).json({ message: 'Internal server error' });
});

app.listen(PORT, () => {
  logger.info(`SDP Tools server listening on port ${PORT}`);
});

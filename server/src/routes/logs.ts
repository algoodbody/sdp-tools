import { Router } from 'express';
import fs from 'fs';
import { LOG_FILE } from '../logger';

export const logsRouter = Router();

logsRouter.get('/', (req, res) => {
  const lines = req.query.lines ? Number(req.query.lines) : 500;
  if (!fs.existsSync(LOG_FILE)) {
    return res.json({ lines: [] });
  }
  try {
    const content = fs.readFileSync(LOG_FILE, 'utf-8');
    const all = content.split('\n').filter(Boolean);
    const tail = all.slice(Math.max(0, all.length - lines));
    res.json({ lines: tail });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to read log file', error: err.message });
  }
});

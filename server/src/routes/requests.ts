import { Router } from 'express';
import { bulkCloseRequests, closeRequest, listRequests, buildTicketUrl } from '../services/sdpClient';
import { mockListRequests } from '../services/mockData';
import { loadSettings } from '../services/settingsStore';
import { logger } from '../logger';
import { RequestsQuery } from '../types';

export const requestsRouter = Router();

function parseQuery(q: any): RequestsQuery {
  return {
    page: q.page ? Number(q.page) : 1,
    pageSize: q.pageSize ? Number(q.pageSize) : 50,
    technicianId: q.technicianId || undefined,
    status: q.status || undefined,
    search: q.search || undefined,
    sortField: q.sortField || undefined,
    sortOrder: q.sortOrder === 'desc' ? 'desc' : 'asc'
  };
}

requestsRouter.get('/', async (req, res) => {
  const query = parseQuery(req.query);
  const settings = loadSettings();

  if (!settings.configured) {
    const result = mockListRequests({
      page: query.page || 1,
      pageSize: query.pageSize || 50,
      technicianId: query.technicianId,
      status: query.status,
      search: query.search,
      sortField: query.sortField,
      sortOrder: query.sortOrder
    });
    return res.json({ ...result, mock: true });
  }

  try {
    const result = await listRequests(query);
    res.json({ ...result, mock: false });
  } catch (err: any) {
    logger.error('Failed to fetch requests', { err: err.message });
    res.status(err.status || 500).json({ message: err.message || 'Failed to fetch requests' });
  }
});

requestsRouter.get('/:id/url', (req, res) => {
  res.json({ url: buildTicketUrl(req.params.id) });
});

requestsRouter.post('/:id/close', async (req, res) => {
  const settings = loadSettings();
  if (!settings.configured) {
    return res.status(400).json({ message: 'Cannot close tickets in demo/mock mode. Configure your connection in Settings.' });
  }
  const { resolution, category, subcategory, item, closureCode } = req.body || {};
  if (!resolution) {
    return res.status(400).json({ message: 'Resolution is required to close a request.' });
  }
  try {
    await closeRequest(req.params.id, { resolution, category, subcategory, item, closureCode });
    res.json({ success: true });
  } catch (err: any) {
    logger.error('Failed to close request', { id: req.params.id, err: err.message });
    res.status(err.status || 500).json({ message: err.message || 'Failed to close request' });
  }
});

requestsRouter.post('/bulk-close', async (req, res) => {
  const settings = loadSettings();
  if (!settings.configured) {
    return res.status(400).json({ message: 'Cannot close tickets in demo/mock mode. Configure your connection in Settings.' });
  }
  const { ids, resolution, category, subcategory, item, closureCode } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: 'No request IDs provided.' });
  }
  if (!resolution) {
    return res.status(400).json({ message: 'Resolution is required to close requests.' });
  }
  try {
    const results = await bulkCloseRequests(ids, { resolution, category, subcategory, item, closureCode });
    const failed = results.filter((r) => !r.success);
    logger.info('Bulk close completed', { total: ids.length, failed: failed.length });
    res.json({ results, succeeded: results.length - failed.length, failed: failed.length });
  } catch (err: any) {
    logger.error('Bulk close failed', { err: err.message });
    res.status(500).json({ message: err.message || 'Bulk close failed' });
  }
});

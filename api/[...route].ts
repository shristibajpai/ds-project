import type { Request, Response } from 'express';
import { cBridge } from '../server';

function sanitizeSingleLineName(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/[\r\n\t]+/g, ' ').trim().slice(0, 49);
}

function parsePriority(raw: unknown): number | null {
  const priority = typeof raw === 'number' ? raw : Number(raw);
  return Number.isInteger(priority) && priority >= 1 && priority <= 10
    ? priority
    : null;
}

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export default async function handler(req: Request, res: Response): Promise<void> {
  const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
  const method = req.method ?? 'GET';

  if (pathname === '/api/tasks' && method === 'GET') {
    res.status(200).json(await cBridge.sendCommand('LIST'));
    return;
  }

  if (pathname === '/api/tasks' && method === 'POST') {
    const name = sanitizeSingleLineName(req.body?.name);
    const priority = parsePriority(req.body?.priority);
    if (!name) {
      res.status(400).json({ ok: false, message: 'Task name cannot be empty.' });
      return;
    }
    if (priority === null) {
      res.status(400).json({
        ok: false,
        message: 'Priority must be an integer between 1 and 10.',
      });
      return;
    }

    const result = await cBridge.sendCommand(`INSERT ${priority}|${name}`);
    res.status(result.ok ? 201 : 400).json(result);
    return;
  }

  if (pathname === '/api/tasks/process' && method === 'POST') {
    const result = await cBridge.sendCommand('PROCESS');
    res.status(result.ok ? 200 : 400).json(result);
    return;
  }

  if (pathname === '/api/tasks/reset' && method === 'POST') {
    res.status(200).json(await cBridge.sendCommand('RESET'));
    return;
  }

  if (pathname === '/api/tasks/clear-completed' && method === 'POST') {
    res.status(200).json(await cBridge.sendCommand('CLEAR_COMPLETED'));
    return;
  }

  const priorityMatch = pathname.match(/^\/api\/tasks\/(\d+)\/priority$/);
  if (priorityMatch && method === 'PATCH') {
    const id = parseId(priorityMatch[1]);
    const priority = parsePriority(req.body?.priority);
    if (id === null) {
      res.status(400).json({ ok: false, message: 'Invalid task ID.' });
      return;
    }
    if (priority === null) {
      res.status(400).json({
        ok: false,
        message: 'Priority must be an integer between 1 and 10.',
      });
      return;
    }

    const result = await cBridge.sendCommand(`UPDATE ${id} ${priority}`);
    res.status(result.ok ? 200 : 404).json(result);
    return;
  }

  const taskMatch = pathname.match(/^\/api\/tasks\/(\d+)$/);
  if (taskMatch) {
    const id = parseId(taskMatch[1]);
    if (id === null) {
      res.status(400).json({ ok: false, message: 'Invalid task ID.' });
      return;
    }

    if (method === 'DELETE') {
      const result = await cBridge.sendCommand(`DELETE ${id}`);
      res.status(result.ok ? 200 : 404).json(result);
      return;
    }

    if (method === 'PUT') {
      const name = sanitizeSingleLineName(req.body?.name);
      const priority = parsePriority(req.body?.priority);
      if (!name) {
        res.status(400).json({ ok: false, message: 'Task name cannot be empty.' });
        return;
      }
      if (priority === null) {
        res.status(400).json({
          ok: false,
          message: 'Priority must be an integer between 1 and 10.',
        });
        return;
      }

      const result = await cBridge.sendCommand(`EDIT ${id} ${priority}|${name}`);
      res.status(result.ok ? 200 : 404).json(result);
      return;
    }
  }

  res.status(404).json({ ok: false, message: 'API route not found.' });
}

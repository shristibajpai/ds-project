import { ChildProcessWithoutNullStreams, execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import express, { Request, Response } from 'express';

const ROOT_DIR = process.cwd();
const C_SOURCE = path.resolve(ROOT_DIR, 'backend/task_manager.c');
const C_BINARY = path.resolve(ROOT_DIR, 'backend/task_manager');
const PORT = Number(process.env.PORT) || 3000;

interface CTask {
  id: number;
  name: string;
  priority: number;
  status: 'Pending' | 'Completed';
}

interface CResponse {
  ok: boolean;
  message: string;
  maxCapacity: number;
  size: number;
  completedSize: number;
  nextId: number;
  nextPendingIndex: number;
  nextTask: CTask | null;
  affectedTask?: CTask;
  affectedIndex?: number;
  tasks: CTask[];
}

function ensureCompiledCBinary(): void {
  let needsCompile = !fs.existsSync(C_BINARY);
  if (!needsCompile && fs.existsSync(C_SOURCE)) {
    const srcStat = fs.statSync(C_SOURCE);
    const binStat = fs.statSync(C_BINARY);
    if (srcStat.mtimeMs > binStat.mtimeMs) {
      needsCompile = true;
    }
  }

  if (needsCompile) {
    execSync(`gcc -O2 -Wall -Wextra "${C_SOURCE}" -o "${C_BINARY}"`, {
      cwd: ROOT_DIR,
      stdio: 'inherit',
    });
  }
}

class CBackendBridge {
  private proc: ChildProcessWithoutNullStreams | null = null;
  private rl: readline.Interface | null = null;
  private pendingResolvers: Array<{
    resolve: (val: CResponse) => void;
    reject: (err: Error) => void;
  }> = [];
  private queue: Promise<unknown> = Promise.resolve();

  private startProcess(): void {
    if (this.proc && !this.proc.killed && this.proc.exitCode === null) {
      return;
    }

    ensureCompiledCBinary();
    const proc = spawn(C_BINARY, ['--server'], {
      cwd: ROOT_DIR,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const rl = readline.createInterface({
      input: proc.stdout,
      crlfDelay: Infinity,
    });

    rl.on('line', (line) => {
      const waiter = this.pendingResolvers.shift();
      if (!waiter) return;
      try {
        const parsed = JSON.parse(line) as CResponse;
        waiter.resolve(parsed);
      } catch (err) {
        waiter.reject(
          new Error(
            `Invalid JSON from C backend: ${err instanceof Error ? err.message : String(err)}`
          )
        );
      }
    });

    proc.stderr.on('data', (chunk) => {
      console.error('[C backend stderr]', chunk.toString());
    });

    proc.on('exit', (code) => {
      while (this.pendingResolvers.length > 0) {
        const waiter = this.pendingResolvers.shift();
        waiter?.reject(new Error(`C backend exited unexpectedly with code ${code}`));
      }
      this.rl?.close();
      this.rl = null;
      this.proc = null;
    });

    this.proc = proc;
    this.rl = rl;
  }

  public sendCommand(command: string): Promise<CResponse> {
    const run = (): Promise<CResponse> => {
      this.startProcess();
      const proc = this.proc;
      if (!proc) {
        return Promise.reject(new Error('Failed to start C backend process'));
      }

      return new Promise<CResponse>((resolve, reject) => {
        const timer = setTimeout(() => {
          const idx = this.pendingResolvers.findIndex((w) => w.resolve === resolve);
          if (idx !== -1) this.pendingResolvers.splice(idx, 1);
          reject(new Error('C backend command timed out'));
        }, 5000);

        this.pendingResolvers.push({
          resolve: (val) => {
            clearTimeout(timer);
            resolve(val);
          },
          reject: (err) => {
            clearTimeout(timer);
            reject(err);
          },
        });

        proc.stdin.write(`${command}\n`);
      });
    };

    const next = this.queue.then(run, run);
    this.queue = next.catch(() => {});
    return next;
  }
}

const cBridge = new CBackendBridge();

function sanitizeSingleLineName(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/[\r\n\t]+/g, ' ').trim().slice(0, 49);
}

function parsePriority(raw: unknown): number | null {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > 10) return null;
  return n;
}

function parseId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

async function startServer() {
  ensureCompiledCBinary();

  const app = express();
  app.use(express.json());

  app.get('/api/tasks', async (_req: Request, res: Response) => {
    try {
      const result = await cBridge.sendCommand('LIST');
      res.json(result);
    } catch (err) {
      res.status(500).json({
        ok: false,
        message: err instanceof Error ? err.message : 'C backend error',
      });
    }
  });

  app.post('/api/tasks', async (req: Request, res: Response) => {
    const name = sanitizeSingleLineName(req.body?.name);
    const priority = parsePriority(req.body?.priority);

    if (!name) {
      res.status(400).json({ ok: false, message: 'Task name cannot be empty.' });
      return;
    }
    if (priority === null) {
      res.status(400).json({ ok: false, message: 'Priority must be an integer between 1 and 10.' });
      return;
    }

    try {
      const result = await cBridge.sendCommand(`INSERT ${priority}|${name}`);
      res.status(result.ok ? 201 : 400).json(result);
    } catch (err) {
      res.status(500).json({
        ok: false,
        message: err instanceof Error ? err.message : 'C backend error',
      });
    }
  });

  app.post('/api/tasks/process', async (_req: Request, res: Response) => {
    try {
      const result = await cBridge.sendCommand('PROCESS');
      res.status(result.ok ? 200 : 400).json(result);
    } catch (err) {
      res.status(500).json({
        ok: false,
        message: err instanceof Error ? err.message : 'C backend error',
      });
    }
  });

  app.patch('/api/tasks/:id/priority', async (req: Request, res: Response) => {
    const id = parseId(String(req.params.id));
    const priority = parsePriority(req.body?.priority);

    if (id === null) {
      res.status(400).json({ ok: false, message: 'Invalid task ID.' });
      return;
    }
    if (priority === null) {
      res.status(400).json({ ok: false, message: 'Priority must be an integer between 1 and 10.' });
      return;
    }

    try {
      const result = await cBridge.sendCommand(`UPDATE ${id} ${priority}`);
      res.status(result.ok ? 200 : 404).json(result);
    } catch (err) {
      res.status(500).json({
        ok: false,
        message: err instanceof Error ? err.message : 'C backend error',
      });
    }
  });

  app.put('/api/tasks/:id', async (req: Request, res: Response) => {
    const id = parseId(String(req.params.id));
    const name = sanitizeSingleLineName(req.body?.name);
    const priority = parsePriority(req.body?.priority);

    if (id === null) {
      res.status(400).json({ ok: false, message: 'Invalid task ID.' });
      return;
    }
    if (!name) {
      res.status(400).json({ ok: false, message: 'Task name cannot be empty.' });
      return;
    }
    if (priority === null) {
      res.status(400).json({ ok: false, message: 'Priority must be an integer between 1 and 10.' });
      return;
    }

    try {
      const result = await cBridge.sendCommand(`EDIT ${id} ${priority}|${name}`);
      res.status(result.ok ? 200 : 404).json(result);
    } catch (err) {
      res.status(500).json({
        ok: false,
        message: err instanceof Error ? err.message : 'C backend error',
      });
    }
  });

  app.delete('/api/tasks/:id', async (req: Request, res: Response) => {
    const id = parseId(String(req.params.id));
    if (id === null) {
      res.status(400).json({ ok: false, message: 'Invalid task ID.' });
      return;
    }

    try {
      const result = await cBridge.sendCommand(`DELETE ${id}`);
      res.status(result.ok ? 200 : 404).json(result);
    } catch (err) {
      res.status(500).json({
        ok: false,
        message: err instanceof Error ? err.message : 'C backend error',
      });
    }
  });

  app.post('/api/tasks/clear-completed', async (_req: Request, res: Response) => {
    try {
      const result = await cBridge.sendCommand('CLEAR_COMPLETED');
      res.json(result);
    } catch (err) {
      res.status(500).json({
        ok: false,
        message: err instanceof Error ? err.message : 'C backend error',
      });
    }
  });

  app.post('/api/tasks/reset', async (_req: Request, res: Response) => {
    try {
      const result = await cBridge.sendCommand('RESET');
      res.json(result);
    } catch (err) {
      res.status(500).json({
        ok: false,
        message: err instanceof Error ? err.message : 'C backend error',
      });
    }
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(ROOT_DIR, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PriorityFlow server listening on http://0.0.0.0:${PORT} (C backend linked)`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start PriorityFlow server:', err);
  process.exit(1);
});

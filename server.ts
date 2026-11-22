import { ChildProcessWithoutNullStreams, execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import express, { Request, Response } from 'express';

const ROOT_DIR = process.cwd();
const C_SOURCE = path.resolve(ROOT_DIR, 'backend/task_manager.c');
const C_BINARY = path.resolve(
  ROOT_DIR,
  process.platform === 'win32' ? 'backend/task_manager.exe' : 'backend/task_manager'
);
const PORT = Number(process.env.PORT) || 3000;
const STATE_FILE = path.resolve(ROOT_DIR, 'backend/tasks_state.dat');
const MAX_CAPACITY = 100;

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

class JavaScriptFallbackBackend {
  private pending: CTask[] = [];
  private completed: CTask[] = [];
  private nextId = 1;

  public constructor() {
    this.loadState();
  }

  private sanitizeName(raw: string): string {
    return raw
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/[^\x20-\x7e]/g, '')
      .trim()
      .slice(0, 49);
  }

  private resetDefaults(): void {
    const defaults: Array<{ name: string; priority: number; status: CTask['status'] }> = [
      { name: 'Audit API gateway rate-limit thresholds', priority: 5, status: 'Pending' },
      { name: 'Resolve production OAuth token timeout', priority: 10, status: 'Pending' },
      { name: 'Update weekly sprint changelog notes', priority: 2, status: 'Pending' },
      { name: 'Patch payment webhook retry backoff', priority: 9, status: 'Pending' },
      { name: 'Refactor PostgreSQL connection pooler', priority: 6, status: 'Pending' },
      { name: 'Migrate legacy static assets to CDN', priority: 1, status: 'Completed' },
      { name: 'Rotate staging TLS certificates', priority: 8, status: 'Completed' },
    ];

    this.pending = [];
    this.completed = [];
    this.nextId = 1;
    for (const item of defaults) {
      const task: CTask = {
        id: this.nextId++,
        name: item.name,
        priority: item.priority,
        status: item.status,
      };
      if (task.status === 'Pending') this.pending.push(task);
      else this.completed.push(task);
    }
    this.saveState();
  }

  private loadState(): void {
    if (!fs.existsSync(STATE_FILE)) {
      this.resetDefaults();
      return;
    }

    try {
      const lines = fs.readFileSync(STATE_FILE, 'utf8').split(/\r?\n/).filter(Boolean);
      const header = lines.shift()?.trim().split(/\s+/).map(Number);
      if (!header || header.length !== 3) {
        this.resetDefaults();
        return;
      }

      this.nextId = header[0] > 0 ? header[0] : 1;
      this.pending = [];
      this.completed = [];

      for (const line of lines) {
        const parts = line.split('\t');
        if (parts.length < 4) continue;
        const id = Number(parts[1]);
        const priority = Number(parts[2]);
        const name = this.sanitizeName(parts.slice(3).join('\t'));
        if (!Number.isInteger(id) || !Number.isInteger(priority) || !name) continue;
        const task: CTask = {
          id,
          name,
          priority,
          status: parts[0] === 'C' ? 'Completed' : 'Pending',
        };
        if (task.status === 'Pending') this.pending.push(task);
        else this.completed.push(task);
        if (id >= this.nextId) this.nextId = id + 1;
      }
    } catch {
      this.resetDefaults();
    }
  }

  private saveState(): void {
    if (process.env.VERCEL === '1') {
      return;
    }

    const lines = [
      `${this.nextId} ${this.pending.length} ${this.completed.length}`,
      ...this.pending.map((task) => `P\t${task.id}\t${task.priority}\t${task.name}`),
      ...this.completed.map((task) => `C\t${task.id}\t${task.priority}\t${task.name}`),
    ];
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, `${lines.join('\n')}\n`, 'utf8');
  }

  private findHighestIndex(): number {
    if (this.pending.length === 0) return -1;
    let highest = 0;
    for (let i = 1; i < this.pending.length; i++) {
      if (this.pending[i].priority > this.pending[highest].priority) highest = i;
    }
    return highest;
  }

  private response(
    ok: boolean,
    message: string,
    affectedTask?: CTask,
    affectedIndex = -1,
    affectedStatus?: CTask['status']
  ): CResponse {
    const nextPendingIndex = this.findHighestIndex();
    const tasks: CTask[] = [
      ...this.pending,
      ...this.completed,
    ];

    return {
      ok,
      message,
      maxCapacity: MAX_CAPACITY,
      size: this.pending.length,
      completedSize: this.completed.length,
      nextId: this.nextId,
      nextPendingIndex,
      nextTask: nextPendingIndex >= 0 ? this.pending[nextPendingIndex] : null,
      ...(affectedTask
        ? {
            affectedTask: affectedStatus
              ? { ...affectedTask, status: affectedStatus }
              : affectedTask,
            affectedIndex,
          }
        : {}),
      tasks,
    };
  }

  public sendCommand(command: string): CResponse {
    if (command === 'LIST') return this.response(true, 'OK');

    if (command === 'RESET') {
      this.resetDefaults();
      return this.response(true, 'Default tasks restored');
    }

    if (command === 'CLEAR_COMPLETED') {
      this.completed = [];
      this.saveState();
      return this.response(true, 'Completed tasks cleared');
    }

    if (command === 'PROCESS') {
      if (this.pending.length === 0) {
        return this.response(false, 'Priority Queue is empty!');
      }
      const index = this.findHighestIndex();
      const processed = this.pending[index];
      this.pending.splice(index, 1);
      if (this.completed.length < MAX_CAPACITY) this.completed.push(processed);
      this.saveState();
      return this.response(true, 'Task processed successfully!', processed, index, 'Completed');
    }

    if (command.startsWith('INSERT ')) {
      if (this.pending.length >= MAX_CAPACITY) {
        return this.response(false, 'Priority Queue is full!');
      }
      const separator = command.indexOf('|', 7);
      if (separator < 0) return this.response(false, 'Invalid INSERT payload');
      const priority = Number(command.slice(7, separator));
      const name = this.sanitizeName(command.slice(separator + 1));
      if (!name) return this.response(false, 'Task name cannot be empty.');
      if (!Number.isInteger(priority) || priority < 1 || priority > 10) {
        return this.response(false, 'Priority must be between 1 and 10.');
      }
      const task: CTask = { id: this.nextId++, name, priority, status: 'Pending' };
      this.pending.push(task);
      this.saveState();
      return this.response(true, 'Task inserted successfully!', task, this.pending.length - 1);
    }

    if (command.startsWith('UPDATE ')) {
      const parts = command.split(/\s+/);
      const id = Number(parts[1]);
      const priority = Number(parts[2]);
      if (!Number.isInteger(priority) || priority < 1 || priority > 10) {
        return this.response(false, 'Priority must be between 1 and 10.');
      }
      const task = [...this.pending, ...this.completed].find((item) => item.id === id);
      if (!task) return this.response(false, 'Task not found!');
      task.priority = priority;
      this.saveState();
      return this.response(true, 'Task priority updated successfully!', task, -1, task.status);
    }

    if (command.startsWith('EDIT ')) {
      const separator = command.indexOf('|');
      if (separator < 0) return this.response(false, 'Invalid EDIT payload');
      const header = command.slice(5, separator).trim().split(/\s+/);
      const id = Number(header[0]);
      const priority = Number(header[1]);
      const name = this.sanitizeName(command.slice(separator + 1));
      if (!name) return this.response(false, 'Task name cannot be empty.');
      if (!Number.isInteger(priority) || priority < 1 || priority > 10) {
        return this.response(false, 'Priority must be between 1 and 10.');
      }
      const task = [...this.pending, ...this.completed].find((item) => item.id === id);
      if (!task) return this.response(false, 'Task not found!');
      task.name = name;
      task.priority = priority;
      this.saveState();
      return this.response(true, 'Task updated successfully!', task, -1, task.status);
    }

    if (command.startsWith('DELETE ')) {
      const id = Number(command.slice(7));
      let index = this.pending.findIndex((item) => item.id === id);
      if (index >= 0) {
        const deleted = this.pending[index];
        this.pending.splice(index, 1);
        this.saveState();
        return this.response(true, 'Task deleted successfully!', deleted, index);
      }
      index = this.completed.findIndex((item) => item.id === id);
      if (index >= 0) {
        const deleted = this.completed[index];
        this.completed.splice(index, 1);
        this.saveState();
        return this.response(true, 'Task deleted successfully!', deleted, index, 'Completed');
      }
      return this.response(false, 'Task not found!');
    }

    return this.response(false, 'Unknown command');
  }
}

function ensureCompiledCBinary(): void {
  if (process.platform === 'win32' || process.env.VERCEL === '1') {
    return;
  }
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
  private fallbackMode = process.platform === 'win32' || process.env.VERCEL === '1';
  private fallback = new JavaScriptFallbackBackend();
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
      if (this.fallbackMode) {
        return Promise.resolve(this.fallback.sendCommand(command));
      }
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

export const cBridge = new CBackendBridge();

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

if (process.env.VERCEL !== '1') {
  startServer().catch((err) => {
    console.error('Failed to start PriorityFlow server:', err);
    process.exit(1);
  });
}

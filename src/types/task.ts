export type TaskStatus = 'Pending' | 'Completed';

export type ViewType =
  | 'dashboard'
  | 'all'
  | 'pending'
  | 'completed'
  | 'analytics'
  | 'settings';

export interface Task {
  id: number;
  name: string;
  priority: number;
  status: TaskStatus;
}

export interface ApiStateResponse {
  ok: boolean;
  message: string;
  maxCapacity: number;
  size: number;
  completedSize: number;
  nextId: number;
  nextPendingIndex: number;
  nextTask: Task | null;
  affectedTask?: Task;
  affectedIndex?: number;
  tasks: Task[];
}

export interface ActivityNotification {
  id: string;
  text: string;
  time: string;
}

export function formatTaskId(id: number): string {
  return `TSK-${String(id).padStart(3, '0')}`;
}

/**
 * Returns pending tasks in exact insertion order (matching C pq[0..size-1]).
 */
export function getPendingQueue(tasks: Task[]): Task[] {
  const pending: Task[] = [];
  for (let i = 0; i < tasks.length; i++) {
    if (tasks[i].status === 'Pending') {
      pending.push(tasks[i]);
    }
  }
  return pending;
}

/**
 * Linear search for highest priority in pending queue (FIFO tie-break via strict '>').
 */
export function findHighestPriorityPending(pendingQueue: Task[]): {
  task: Task | null;
  index: number;
} {
  if (pendingQueue.length === 0) {
    return { task: null, index: -1 };
  }
  let bestIdx = 0;
  let maxPriority = pendingQueue[0].priority;
  for (let i = 1; i < pendingQueue.length; i++) {
    if (pendingQueue[i].priority > maxPriority) {
      maxPriority = pendingQueue[i].priority;
      bestIdx = i;
    }
  }
  return { task: pendingQueue[bestIdx], index: bestIdx };
}

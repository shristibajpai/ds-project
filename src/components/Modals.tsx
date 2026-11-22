import { FormEvent, useEffect, useRef, useState } from 'react';
import { formatTaskId, Task } from '../types/task';
import { PriorityBadge } from './Badges';

const PRIORITY_OPTIONS = [
  { value: 1, label: '1 — Low' },
  { value: 2, label: '2 — Low' },
  { value: 3, label: '3 — Low' },
  { value: 4, label: '4 — Medium' },
  { value: 5, label: '5 — Medium' },
  { value: 6, label: '6 — Medium' },
  { value: 7, label: '7 — Medium' },
  { value: 8, label: '8 — High' },
  { value: 9, label: '9 — High' },
  { value: 10, label: '10 — Critical (Highest)' },
];

interface TaskModalProps {
  open: boolean;
  editingTask: Task | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (name: string, priority: number, existingId?: number) => void;
}

export function TaskModal({
  open,
  editingTask,
  busy,
  onClose,
  onSubmit,
}: TaskModalProps) {
  const [name, setName] = useState('');
  const [priority, setPriority] = useState<number>(5);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(editingTask ? editingTask.name : '');
      setPriority(editingTask ? editingTask.priority : 5);
      setError(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open, editingTask]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open && !busy) onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, busy, onClose]);

  if (!open) return null;

  const hasCustomPriority = !PRIORITY_OPTIONS.some((p) => p.value === priority);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError(true);
      inputRef.current?.focus();
      return;
    }
    setError(false);
    onSubmit(trimmed, priority, editingTask?.id);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#131B2E]/42 dark:bg-black/65"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-modal-title"
        className="w-full max-w-md rounded-xl bg-light-surface-container-lowest dark:bg-dark-surface-container-low border border-light-outline-variant/60 dark:border-dark-outline-variant/60 p-6 shadow-xl"
      >
        <header className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2
              id="task-modal-title"
              className="font-headline text-headline-md text-light-on-surface dark:text-dark-on-surface"
            >
              {editingTask
                ? `Edit Task (${formatTaskId(editingTask.id)})`
                : 'Add New Task'}
            </h2>
            <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant mt-1">
              {editingTask
                ? 'Modify task name or priority while preserving array position.'
                : 'Appends the task to the end of the pending queue array.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close dialog"
            className="w-8 h-8 rounded flex items-center justify-center text-light-on-surface-variant dark:text-dark-on-surface-variant hover:bg-light-surface-container-low dark:hover:bg-dark-surface-container cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="task-name-input"
              className="block font-label text-label-md text-light-on-surface dark:text-dark-on-surface mb-1.5"
            >
              Task Name
            </label>
            <input
              ref={inputRef}
              id="task-name-input"
              type="text"
              maxLength={49}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error && e.target.value.trim()) setError(false);
              }}
              placeholder="e.g., Patch OAuth token refresh race condition"
              className="w-full px-3 py-2 rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant text-body-md text-light-on-surface dark:text-dark-on-surface placeholder:text-light-outline dark:placeholder:text-dark-outline focus:outline-none focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary"
            />
            {error && (
              <p className="mt-1.5 font-body text-body-sm text-light-error dark:text-dark-error">
                Task name cannot be empty.
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="task-priority-select"
              className="block font-label text-label-md text-light-on-surface dark:text-dark-on-surface mb-1.5"
            >
              Priority Level (1–10)
            </label>
            <select
              id="task-priority-select"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className="w-full px-3 py-2 rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant text-body-md text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary"
            >
              {hasCustomPriority && (
                <option value={priority}>Custom ({priority})</option>
              )}
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <footer className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="px-4 py-2 rounded border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface hover:bg-light-surface-container-low dark:hover:bg-dark-surface-container cursor-pointer disabled:opacity-50"
            >
              <span className="font-label text-label-lg">Cancel</span>
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 rounded bg-light-primary text-light-on-primary hover:bg-light-primary-container dark:bg-dark-primary dark:text-dark-on-primary dark:hover:bg-dark-primary-container dark:hover:text-dark-on-primary-container cursor-pointer disabled:opacity-50"
            >
              <span className="font-label text-label-lg">
                {editingTask ? 'Save Changes' : 'Add Task'}
              </span>
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

interface PriorityModalProps {
  task: Task | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (taskId: number, newPriority: number) => void;
}

export function PriorityModal({
  task,
  busy,
  onClose,
  onSubmit,
}: PriorityModalProps) {
  const [newPriority, setNewPriority] = useState<number>(5);

  useEffect(() => {
    if (task) setNewPriority(task.priority);
  }, [task]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && task && !busy) onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [task, busy, onClose]);

  if (!task) return null;

  const hasCustomPriority = !PRIORITY_OPTIONS.some((p) => p.value === newPriority);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!task || busy) return;
    onSubmit(task.id, newPriority);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#131B2E]/42 dark:bg-black/65"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="priority-modal-title"
        className="w-full max-w-md rounded-xl bg-light-surface-container-lowest dark:bg-dark-surface-container-low border border-light-outline-variant/60 dark:border-dark-outline-variant/60 p-6 shadow-xl"
      >
        <header className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2
              id="priority-modal-title"
              className="font-headline text-headline-md text-light-on-surface dark:text-dark-on-surface"
            >
              Update Task Priority
            </h2>
            <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant mt-1">
              Updates priority in-place by Task ID without sorting the array.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close dialog"
            className="w-8 h-8 rounded flex items-center justify-center text-light-on-surface-variant dark:text-dark-on-surface-variant hover:bg-light-surface-container-low dark:hover:bg-dark-surface-container cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3.5 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container border border-light-outline-variant/50 dark:border-dark-outline-variant/50">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-mono-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums">
                {formatTaskId(task.id)}
              </span>
              <PriorityBadge priority={task.priority} />
            </div>
            <p className="font-title text-title-md text-light-on-surface dark:text-dark-on-surface">
              {task.name}
            </p>
          </div>

          <div>
            <label
              htmlFor="new-priority-select"
              className="block font-label text-label-md text-light-on-surface dark:text-dark-on-surface mb-1.5"
            >
              New Priority (1–10)
            </label>
            <select
              id="new-priority-select"
              value={newPriority}
              onChange={(e) => setNewPriority(Number(e.target.value))}
              className="w-full px-3 py-2 rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant text-body-md text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary"
            >
              {hasCustomPriority && (
                <option value={newPriority}>Custom ({newPriority})</option>
              )}
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <footer className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="px-4 py-2 rounded border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface hover:bg-light-surface-container-low dark:hover:bg-dark-surface-container cursor-pointer disabled:opacity-50"
            >
              <span className="font-label text-label-lg">Cancel</span>
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 rounded bg-light-primary text-light-on-primary hover:bg-light-primary-container dark:bg-dark-primary dark:text-dark-on-primary dark:hover:bg-dark-primary-container dark:hover:text-dark-on-primary-container cursor-pointer disabled:opacity-50"
            >
              <span className="font-label text-label-lg">Save Priority</span>
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

interface ProcessModalProps {
  open: boolean;
  nextTask: Task | null;
  pendingIndex: number;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ProcessModal({
  open,
  nextTask,
  pendingIndex,
  busy,
  onClose,
  onConfirm,
}: ProcessModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open && !busy) onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, busy, onClose]);

  if (!open || !nextTask) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#131B2E]/42 dark:bg-black/65"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="process-modal-title"
        className="w-full max-w-md rounded-xl bg-light-surface-container-lowest dark:bg-dark-surface-container-low border border-light-outline-variant/60 dark:border-dark-outline-variant/60 p-6 shadow-xl"
      >
        <header className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-md bg-light-surface-container text-light-secondary dark:bg-dark-surface-container-high dark:text-dark-secondary flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">bolt</span>
            </span>
            <h2
              id="process-modal-title"
              className="font-headline text-headline-md text-light-on-surface dark:text-dark-on-surface"
            >
              Process Next Task
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close dialog"
            className="w-8 h-8 rounded flex items-center justify-center text-light-on-surface-variant dark:text-dark-on-surface-variant hover:bg-light-surface-container-low dark:hover:bg-dark-surface-container cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </header>

        <div className="space-y-3 mb-6">
          <p className="font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant">
            Linear search selected the highest-priority pending task (FIFO tie-break):
          </p>
          <div className="p-4 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container border border-light-secondary/40 dark:border-dark-secondary/40">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="font-mono text-mono-sm text-light-secondary dark:text-dark-secondary tabular-nums">
                {formatTaskId(nextTask.id)}
              </span>
              <PriorityBadge priority={nextTask.priority} />
            </div>
            <p className="font-title text-title-md text-light-on-surface dark:text-dark-on-surface">
              {nextTask.name}
            </p>
            <p className="font-mono text-mono-sm text-light-on-surface-variant dark:text-dark-on-surface-variant mt-1 tabular-nums">
              Pending array index [{pendingIndex}]
            </p>
          </div>
        </div>

        <footer className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 rounded border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface hover:bg-light-surface-container-low dark:hover:bg-dark-surface-container cursor-pointer disabled:opacity-50"
          >
            <span className="font-label text-label-lg">Cancel</span>
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="px-4 py-2 rounded bg-light-secondary text-light-on-secondary hover:bg-light-secondary-container dark:bg-dark-secondary dark:text-dark-on-secondary dark:hover:bg-dark-secondary-container dark:hover:text-dark-on-secondary-container cursor-pointer disabled:opacity-50"
          >
            <span className="font-label text-label-lg">Confirm &amp; Process</span>
          </button>
        </footer>
      </div>
    </div>
  );
}

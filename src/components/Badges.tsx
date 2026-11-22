import { TaskStatus } from '../types/task';

export function PriorityBadge({ priority }: { priority: number }) {
  if (priority >= 8) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-light-error-container text-light-on-error-container dark:bg-dark-error-container dark:text-dark-on-error-container font-label text-label-sm whitespace-nowrap">
        <span
          className="w-1.5 h-1.5 rounded-full bg-light-error dark:bg-dark-error"
          aria-hidden="true"
        />
        High ({priority})
      </span>
    );
  }
  if (priority >= 4) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-warning-container text-on-warning-container dark:bg-amber-950/80 dark:text-amber-200 font-label text-label-sm whitespace-nowrap">
        <span
          className="w-1.5 h-1.5 rounded-full bg-warning dark:bg-amber-400"
          aria-hidden="true"
        />
        Medium ({priority})
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-info-container text-on-info-container dark:bg-blue-950/80 dark:text-blue-200 font-label text-label-sm whitespace-nowrap">
      <span
        className="w-1.5 h-1.5 rounded-full bg-info dark:bg-blue-400"
        aria-hidden="true"
      />
      Low ({priority})
    </span>
  );
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  if (status === 'Completed') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-success-container text-on-success-container dark:bg-emerald-950/80 dark:text-emerald-200 font-label text-label-sm whitespace-nowrap">
        <span
          className="w-1.5 h-1.5 rounded-full bg-success dark:bg-emerald-400"
          aria-hidden="true"
        />
        Completed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-light-surface-container text-light-primary dark:bg-dark-surface-container-high dark:text-dark-primary font-label text-label-sm whitespace-nowrap">
      <span
        className="w-1.5 h-1.5 rounded-full bg-light-primary dark:bg-dark-primary"
        aria-hidden="true"
      />
      Pending
    </span>
  );
}

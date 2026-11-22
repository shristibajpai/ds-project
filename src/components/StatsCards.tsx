import { Task } from '../types/task';

interface StatsCardsProps {
  tasks: Task[];
}

export function StatsCards({ tasks }: StatsCardsProps) {
  const total = tasks.length;
  let pending = 0;
  let completed = 0;
  let highPending = 0;

  for (let i = 0; i < tasks.length; i++) {
    if (tasks[i].status === 'Pending') {
      pending++;
      if (tasks[i].priority >= 8) highPending++;
    } else {
      completed++;
    }
  }

  return (
    <section
      aria-label="Task statistics"
      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch"
    >
      <article className="h-full bg-light-surface-container-lowest dark:bg-dark-surface-container-low border border-light-outline-variant/60 dark:border-dark-outline-variant/60 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow duration-150">
        <header className="flex items-center justify-between mb-3">
          <h2 className="font-label text-label-md text-light-on-surface-variant dark:text-dark-on-surface-variant">
            Total Tasks
          </h2>
          <span className="w-9 h-9 rounded-md bg-light-surface-container-low text-light-primary dark:bg-dark-surface-container-high dark:text-dark-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">assignment</span>
          </span>
        </header>
        <p className="font-headline text-display-lg-mobile sm:text-display-lg text-light-on-surface dark:text-dark-on-surface tabular-nums">
          {total}
        </p>
        <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant mt-1">
          All tasks in C array
        </p>
      </article>

      <article className="h-full bg-light-surface-container-lowest dark:bg-dark-surface-container-low border border-light-outline-variant/60 dark:border-dark-outline-variant/60 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow duration-150">
        <header className="flex items-center justify-between mb-3">
          <h2 className="font-label text-label-md text-light-on-surface-variant dark:text-dark-on-surface-variant">
            Pending Tasks
          </h2>
          <span className="w-9 h-9 rounded-md bg-warning-container text-on-warning-container dark:bg-amber-950/80 dark:text-amber-200 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">hourglass_top</span>
          </span>
        </header>
        <p className="font-headline text-display-lg-mobile sm:text-display-lg text-light-on-surface dark:text-dark-on-surface tabular-nums">
          {pending}
        </p>
        <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant mt-1">
          Active in priority queue
        </p>
      </article>

      <article className="h-full bg-light-surface-container-lowest dark:bg-dark-surface-container-low border border-light-outline-variant/60 dark:border-dark-outline-variant/60 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow duration-150">
        <header className="flex items-center justify-between mb-3">
          <h2 className="font-label text-label-md text-light-on-surface-variant dark:text-dark-on-surface-variant">
            Completed Tasks
          </h2>
          <span className="w-9 h-9 rounded-md bg-success-container text-on-success-container dark:bg-emerald-950/80 dark:text-emerald-200 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
          </span>
        </header>
        <p className="font-headline text-display-lg-mobile sm:text-display-lg text-light-on-surface dark:text-dark-on-surface tabular-nums">
          {completed}
        </p>
        <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant mt-1">
          Processed from queue
        </p>
      </article>

      <article className="h-full bg-light-surface-container-lowest dark:bg-dark-surface-container-low border border-light-outline-variant/60 dark:border-dark-outline-variant/60 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow duration-150">
        <header className="flex items-center justify-between mb-3">
          <h2 className="font-label text-label-md text-light-on-surface-variant dark:text-dark-on-surface-variant">
            High Priority Tasks
          </h2>
          <span className="w-9 h-9 rounded-md bg-light-error-container text-light-on-error-container dark:bg-dark-error-container dark:text-dark-on-error-container flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">priority_high</span>
          </span>
        </header>
        <p className="font-headline text-display-lg-mobile sm:text-display-lg text-light-on-surface dark:text-dark-on-surface tabular-nums">
          {highPending}
        </p>
        <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant mt-1">
          Pending weight (8–10) items
        </p>
      </article>
    </section>
  );
}

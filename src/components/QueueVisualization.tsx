import {
  findHighestPriorityPending,
  formatTaskId,
  getPendingQueue,
  Task,
} from '../types/task';
import { PriorityBadge } from './Badges';

interface QueueVisualizationProps {
  tasks: Task[];
  onSelectTaskForPriority: (task: Task) => void;
  onAddNewTask: () => void;
}

export function QueueVisualization({
  tasks,
  onSelectTaskForPriority,
  onAddNewTask,
}: QueueVisualizationProps) {
  const pendingQueue = getPendingQueue(tasks);
  const { task: nextTask } = findHighestPriorityPending(pendingQueue);

  return (
    <section className="bg-light-surface-container-lowest dark:bg-dark-surface-container-low border border-light-outline-variant/60 dark:border-dark-outline-variant/60 rounded-lg p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-headline text-headline-md text-light-on-surface dark:text-dark-on-surface">
              Queue Visualization
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-light-surface-container text-light-primary dark:bg-dark-surface-container-high dark:text-dark-primary font-mono text-mono-sm tabular-nums">
              {pendingQueue.length} pending
            </span>
          </div>
          <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant mt-0.5">
            Unsorted insertion-order array. Linear search selects the highlighted highest-priority task (FIFO on ties).
          </p>
        </div>
      </div>

      {pendingQueue.length === 0 ? (
        <div className="py-8 text-center rounded-lg border border-dashed border-light-outline-variant dark:border-dark-outline-variant bg-light-surface-container-low/50 dark:bg-dark-surface-container/50">
          <p className="font-title text-title-md text-light-on-surface dark:text-dark-on-surface">
            Queue is empty
          </p>
          <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant mt-1 mb-4">
            Click Add New Task to append an item to the priority queue.
          </p>
          <button
            type="button"
            onClick={onAddNewTask}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-light-primary text-light-on-primary hover:bg-light-primary-container dark:bg-dark-primary dark:text-dark-on-primary dark:hover:bg-dark-primary-container dark:hover:text-dark-on-primary-container font-label text-label-md transition-colors duration-150 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Add New Task
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 items-stretch">
          {pendingQueue.map((task, idx) => {
            const isNext = nextTask?.id === task.id;
            const displayId = formatTaskId(task.id);
            return (
              <article
                key={task.id}
                onClick={() => onSelectTaskForPriority(task)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectTaskForPriority(task);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Update priority for ${displayId}: ${task.name}`}
                className={`h-full rounded-lg border p-4 shadow-sm hover:shadow-md transition-shadow duration-150 cursor-pointer flex flex-col justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary ${
                  isNext
                    ? 'border-light-secondary ring-1 ring-light-secondary/30 bg-light-surface-container-lowest dark:border-dark-secondary dark:ring-dark-secondary/30 dark:bg-dark-surface-container'
                    : 'border-light-outline-variant/60 bg-light-surface-container-lowest dark:border-dark-outline-variant/60 dark:bg-dark-surface-container'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-mono-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums">
                    {displayId}
                  </span>
                  {isNext ? (
                    <span className="px-2 py-0.5 rounded-full bg-light-secondary text-light-on-secondary dark:bg-dark-secondary dark:text-dark-on-secondary font-label text-label-sm whitespace-nowrap">
                      NEXT IN QUEUE
                    </span>
                  ) : (
                    <span className="font-mono text-mono-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums">
                      [{idx}]
                    </span>
                  )}
                </div>

                <p className="font-body text-body-md font-medium text-light-on-surface dark:text-dark-on-surface leading-snug">
                  {task.name}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-light-outline-variant/40 dark:border-dark-outline-variant/40">
                  <PriorityBadge priority={task.priority} />
                  <span className="font-label text-label-sm text-light-primary dark:text-dark-primary">
                    Update
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

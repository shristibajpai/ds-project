import { Task } from '../types/task';

interface AnalyticsSectionProps {
  tasks: Task[];
}

export function AnalyticsSection({ tasks }: AnalyticsSectionProps) {
  const total = tasks.length;
  let completed = 0;
  let pending = 0;
  let high = 0;
  let med = 0;
  let low = 0;

  for (let i = 0; i < tasks.length; i++) {
    if (tasks[i].status === 'Completed') completed++;
    else pending++;

    if (tasks[i].priority >= 8) high++;
    else if (tasks[i].priority >= 4) med++;
    else low++;
  }

  const compPct = total ? Math.round((completed / total) * 100) : 0;
  const pendPct = total ? 100 - compPct : 0;
  const circumference = 301.59;
  const offset = circumference - (compPct / 100) * circumference;

  const highPct = total ? Math.round((high / total) * 100) : 0;
  const medPct = total ? Math.round((med / total) * 100) : 0;
  const lowPct = total ? Math.round((low / total) * 100) : 0;

  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
      {/* Completion Breakdown Card */}
      <article className="h-full bg-light-surface-container-lowest dark:bg-dark-surface-container-low border border-light-outline-variant/60 dark:border-dark-outline-variant/60 rounded-lg p-5 shadow-sm flex flex-col justify-between">
        <div>
          <h2 className="font-headline text-headline-md text-light-on-surface dark:text-dark-on-surface">
            Completion Breakdown
          </h2>
          <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant mt-0.5">
            Completed vs. pending tasks across the array
          </p>
        </div>

        <div className="my-6 flex flex-col sm:flex-row items-center gap-6">
          <div className="relative w-36 h-36 shrink-0">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <circle
                cx="60"
                cy="60"
                r="48"
                fill="none"
                strokeWidth="14"
                className="stroke-light-surface-container dark:stroke-dark-surface-container-high"
              />
              <circle
                cx="60"
                cy="60"
                r="48"
                fill="none"
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset.toFixed(2)}
                className="stroke-light-primary dark:stroke-dark-primary transition-all duration-300"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-headline text-headline-lg text-light-on-surface dark:text-dark-on-surface tabular-nums">
                {compPct}%
              </span>
              <span className="font-label text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                Done
              </span>
            </div>
          </div>

          <div className="flex-1 w-full space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-label text-label-md text-light-on-surface dark:text-dark-on-surface">
                  Completed
                </span>
                <span className="font-mono text-mono-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums">
                  {completed} tasks
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-light-surface-container dark:bg-dark-surface-container-high overflow-hidden">
                <div
                  className="h-full rounded-full bg-light-primary dark:bg-dark-primary transition-all duration-200"
                  style={{ width: `${compPct}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-label text-label-md text-light-on-surface dark:text-dark-on-surface">
                  Pending in Queue
                </span>
                <span className="font-mono text-mono-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums">
                  {pending} tasks
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-light-surface-container dark:bg-dark-surface-container-high overflow-hidden">
                <div
                  className="h-full rounded-full bg-light-secondary dark:bg-dark-secondary transition-all duration-200"
                  style={{ width: `${pendPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-light-outline-variant/40 dark:border-dark-outline-variant/40 flex items-center justify-between text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
          <span>Total tracked tasks</span>
          <span className="font-mono text-mono-md text-light-on-surface dark:text-dark-on-surface tabular-nums">
            {total}
          </span>
        </div>
      </article>

      {/* Priority Distribution Card */}
      <article className="h-full bg-light-surface-container-lowest dark:bg-dark-surface-container-low border border-light-outline-variant/60 dark:border-dark-outline-variant/60 rounded-lg p-5 shadow-sm flex flex-col justify-between">
        <div>
          <h2 className="font-headline text-headline-md text-light-on-surface dark:text-dark-on-surface">
            Priority Distribution
          </h2>
          <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant mt-0.5 text-pretty">
            Task volume by priority weight
          </p>
        </div>

        <div className="my-6 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="inline-flex items-center gap-2 font-label text-label-md text-light-on-surface dark:text-dark-on-surface">
                <span
                  className="w-2.5 h-2.5 rounded-full bg-light-error dark:bg-dark-error"
                  aria-hidden="true"
                />
                High Priority (8–10)
              </span>
              <span className="font-mono text-mono-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums">
                {high} ({highPct}%)
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-light-surface-container dark:bg-dark-surface-container-high overflow-hidden">
              <div
                className="h-full rounded-full bg-light-error dark:bg-dark-error transition-all duration-200"
                style={{ width: `${highPct}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="inline-flex items-center gap-2 font-label text-label-md text-light-on-surface dark:text-dark-on-surface">
                <span
                  className="w-2.5 h-2.5 rounded-full bg-warning dark:bg-amber-400"
                  aria-hidden="true"
                />
                Medium Priority (4–7)
              </span>
              <span className="font-mono text-mono-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums">
                {med} ({medPct}%)
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-light-surface-container dark:bg-dark-surface-container-high overflow-hidden">
              <div
                className="h-full rounded-full bg-warning dark:bg-amber-400 transition-all duration-200"
                style={{ width: `${medPct}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="inline-flex items-center gap-2 font-label text-label-md text-light-on-surface dark:text-dark-on-surface">
                <span
                  className="w-2.5 h-2.5 rounded-full bg-info dark:bg-blue-400"
                  aria-hidden="true"
                />
                Low Priority (1–3)
              </span>
              <span className="font-mono text-mono-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums">
                {low} ({lowPct}%)
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-light-surface-container dark:bg-dark-surface-container-high overflow-hidden">
              <div
                className="h-full rounded-full bg-info dark:bg-blue-400 transition-all duration-200"
                style={{ width: `${lowPct}%` }}
              />
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-light-outline-variant/40 dark:border-dark-outline-variant/40 flex items-center justify-between text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
          <span>Selection rule</span>
          <span className="font-mono text-mono-sm text-light-secondary dark:text-dark-secondary">
            Max weight · FIFO tie-break
          </span>
        </div>
      </article>
    </section>
  );
}

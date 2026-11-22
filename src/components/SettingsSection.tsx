interface SettingsSectionProps {
  onResetSampleData: () => void;
  onClearCompleted: () => void;
  completedCount: number;
  pendingCount: number;
  maxCapacity: number;
  busy: boolean;
  theme: 'light' | 'dark';
  onSetTheme: (theme: 'light' | 'dark') => void;
}

export function SettingsSection({
  onResetSampleData,
  onClearCompleted,
  completedCount,
  pendingCount,
  maxCapacity,
  busy,
  theme,
  onSetTheme,
}: SettingsSectionProps) {
  return (
    <section className="bg-light-surface-container-lowest dark:bg-dark-surface-container-low border border-light-outline-variant/60 dark:border-dark-outline-variant/60 rounded-lg p-6 shadow-sm space-y-6">
      <div>
        <h2 className="font-headline text-headline-md text-light-on-surface dark:text-dark-on-surface">
          Queue &amp; Storage Settings
        </h2>
        <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant mt-1">
          PriorityFlow executes queue operations in the compiled C backend (
          <span className="font-mono">struct Task pq[{maxCapacity}]</span>, currently{' '}
          {pendingCount}/{maxCapacity} pending slots used) and persists insertion order without sorting.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-lg border border-light-outline-variant/60 dark:border-dark-outline-variant/60 bg-light-surface-container-low dark:bg-dark-surface-container flex items-center justify-between gap-4">
          <div>
            <h3 className="font-title text-title-md text-light-on-surface dark:text-dark-on-surface">
              Reset Sample Tasks
            </h3>
            <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
              Restore the default realistic engineering task queue.
            </p>
          </div>
          <button
            type="button"
            onClick={onResetSampleData}
            disabled={busy}
            className="px-3.5 py-2 rounded bg-light-primary text-light-on-primary hover:bg-light-primary-container dark:bg-dark-primary dark:text-dark-on-primary dark:hover:bg-dark-primary-container dark:hover:text-dark-on-primary-container font-label text-label-md shrink-0 transition-colors duration-150 disabled:opacity-50 cursor-pointer"
          >
            Restore Defaults
          </button>
        </div>

        <div className="p-4 rounded-lg border border-light-outline-variant/60 dark:border-dark-outline-variant/60 bg-light-surface-container-low dark:bg-dark-surface-container flex items-center justify-between gap-4">
          <div>
            <h3 className="font-title text-title-md text-light-on-surface dark:text-dark-on-surface">
              Clear Completed Tasks
            </h3>
            <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
              Remove processed tasks ({completedCount}) from the history table.
            </p>
          </div>
          <button
            type="button"
            onClick={onClearCompleted}
            disabled={busy || completedCount === 0}
            className="px-3.5 py-2 rounded border border-light-outline-variant dark:border-dark-outline-variant bg-light-surface-container-lowest dark:bg-dark-surface-container-lowest text-light-error dark:text-dark-error hover:bg-light-error-container dark:hover:bg-dark-error-container dark:hover:text-dark-on-error-container font-label text-label-md shrink-0 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Clear Completed
          </button>
        </div>

        <div className="md:col-span-2 p-4 rounded-lg border border-light-outline-variant/60 dark:border-dark-outline-variant/60 bg-light-surface-container-low dark:bg-dark-surface-container flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-title text-title-md text-light-on-surface dark:text-dark-on-surface">
              Interface Theme
            </h3>
            <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
              Choose between the light workspace and pure black dark theme.
            </p>
          </div>
          <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-light-surface-container dark:bg-dark-surface-container-lowest border border-light-outline-variant/50 dark:border-dark-outline-variant/50 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => onSetTheme('light')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-label text-label-md transition-colors duration-150 cursor-pointer ${
                theme === 'light'
                  ? 'bg-light-surface-container-lowest text-light-primary shadow-sm'
                  : 'text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-on-surface dark:hover:text-dark-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">light_mode</span>
              Light
            </button>
            <button
              type="button"
              onClick={() => onSetTheme('dark')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-label text-label-md transition-colors duration-150 cursor-pointer ${
                theme === 'dark'
                  ? 'bg-dark-surface-container-high text-dark-primary shadow-sm'
                  : 'text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-on-surface dark:hover:text-dark-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">dark_mode</span>
              Dark
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

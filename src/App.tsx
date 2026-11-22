import { useEffect, useRef, useState } from 'react';
import { AnalyticsSection } from './components/AnalyticsSection';
import { PriorityModal, ProcessModal, TaskModal } from './components/Modals';
import { QueueVisualization } from './components/QueueVisualization';
import { SettingsSection } from './components/SettingsSection';
import { Sidebar } from './components/Sidebar';
import { StatsCards } from './components/StatsCards';
import { TaskTable } from './components/TaskTable';
import { TopBar } from './components/TopBar';
import {
  ActivityNotification,
  ApiStateResponse,
  findHighestPriorityPending,
  formatTaskId,
  getPendingQueue,
  Task,
  ViewType,
} from './types/task';

const THEME_STORAGE_KEY = 'priorityflow_theme';

function loadInitialTheme(): 'light' | 'dark' {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

async function requestApi(
  url: string,
  options?: RequestInit
): Promise<ApiStateResponse> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = (await res.json()) as ApiStateResponse;
  if (!res.ok || !data.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data;
}

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(loadInitialTheme);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [maxCapacity, setMaxCapacity] = useState(100);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [notifications, setNotifications] = useState<ActivityNotification[]>([]);

  // Modal state
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [priorityModalTask, setPriorityModalTask] = useState<Task | null>(null);
  const [processModalOpen, setProcessModalOpen] = useState(false);

  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastIsError, setToastIsError] = useState(false);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage errors in restricted environments
    }
  }, [theme]);

  function addNotification(text: string) {
    const time = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    setNotifications((prev) => [
      { id: `${Date.now()}-${Math.random()}`, text, time },
      ...prev,
    ]);
  }

  function showToast(msg: string, isError = false) {
    setToastMessage(msg);
    setToastIsError(isError);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  }

  async function fetchTasks() {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await requestApi('/api/tasks');
      setTasks(data.tasks);
      setMaxCapacity(data.maxCapacity);
      setNotifications([
        {
          id: 'init-c-queue',
          text: `C queue loaded (${data.size} pending, ${data.completedSize} completed)`,
          time: 'Just now',
        },
      ]);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : 'Unable to reach C backend'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchTasks();
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const pendingQueue = getPendingQueue(tasks);
  const { task: nextTask, index: nextPendingIndex } =
    findHighestPriorityPending(pendingQueue);
  const completedCount = tasks.filter((t) => t.status === 'Completed').length;

  function handleSelectView(view: ViewType) {
    setCurrentView(view);
    setMobileSidebarOpen(false);
  }

  function handleOpenAddModal() {
    setEditingTask(null);
    setTaskModalOpen(true);
  }

  function handleOpenEditModal(task: Task) {
    setEditingTask(task);
    setTaskModalOpen(true);
  }

  async function handleTaskFormSubmit(
    name: string,
    priority: number,
    existingId?: number
  ) {
    setMutating(true);
    try {
      if (existingId !== undefined) {
        const data = await requestApi(`/api/tasks/${existingId}`, {
          method: 'PUT',
          body: JSON.stringify({ name, priority }),
        });
        setTasks(data.tasks);
        const displayId = formatTaskId(existingId);
        addNotification(`Updated task ${displayId}`);
        showToast(`Task ${displayId} updated.`);
      } else {
        const data = await requestApi('/api/tasks', {
          method: 'POST',
          body: JSON.stringify({ name, priority }),
        });
        setTasks(data.tasks);
        const createdId = data.affectedTask
          ? formatTaskId(data.affectedTask.id)
          : 'task';
        addNotification(`Inserted ${createdId} at end of queue`);
        showToast(`Added ${createdId} to queue.`);
      }
      setTaskModalOpen(false);
      setEditingTask(null);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to save task.',
        true
      );
    } finally {
      setMutating(false);
    }
  }

  async function handlePrioritySubmit(taskId: number, newPriority: number) {
    setMutating(true);
    try {
      const data = await requestApi(`/api/tasks/${taskId}/priority`, {
        method: 'PATCH',
        body: JSON.stringify({ priority: newPriority }),
      });
      setTasks(data.tasks);
      setPriorityModalTask(null);
      const displayId = formatTaskId(taskId);
      addNotification(`Updated priority for ${displayId} to ${newPriority}`);
      showToast(`Priority updated for ${displayId}.`);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to update priority.',
        true
      );
    } finally {
      setMutating(false);
    }
  }

  async function handleConfirmProcessNext() {
    if (!nextTask) {
      setProcessModalOpen(false);
      return;
    }
    setMutating(true);
    try {
      const data = await requestApi('/api/tasks/process', {
        method: 'POST',
      });
      setTasks(data.tasks);
      setProcessModalOpen(false);
      const processed = data.affectedTask ?? nextTask;
      const displayId = formatTaskId(processed.id);
      addNotification(`Processed ${displayId} (${processed.name})`);
      showToast(`Processed ${displayId} and removed from pending queue.`);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to process task.',
        true
      );
    } finally {
      setMutating(false);
    }
  }

  async function handleDeleteTask(taskId: number) {
    setMutating(true);
    try {
      const data = await requestApi(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });
      setTasks(data.tasks);
      const displayId = formatTaskId(taskId);
      addNotification(`Deleted task ${displayId}`);
      showToast(`Deleted ${displayId}.`);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to delete task.',
        true
      );
    } finally {
      setMutating(false);
    }
  }

  async function handleResetSampleData() {
    setMutating(true);
    try {
      const data = await requestApi('/api/tasks/reset', {
        method: 'POST',
      });
      setTasks(data.tasks);
      addNotification('Restored default sample task queue');
      showToast('Default sample tasks restored.');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to restore defaults.',
        true
      );
    } finally {
      setMutating(false);
    }
  }

  async function handleClearCompleted() {
    setMutating(true);
    try {
      const data = await requestApi('/api/tasks/clear-completed', {
        method: 'POST',
      });
      setTasks(data.tasks);
      addNotification('Cleared completed tasks');
      showToast('Completed tasks cleared.');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to clear completed tasks.',
        true
      );
    } finally {
      setMutating(false);
    }
  }

  const showActionBar = currentView !== 'settings';
  const showStats = currentView !== 'analytics' && currentView !== 'settings';
  const showQueue = currentView === 'dashboard' || currentView === 'pending';
  const showTable = currentView !== 'analytics' && currentView !== 'settings';
  const showAnalytics = currentView === 'dashboard' || currentView === 'analytics';
  const showSettings = currentView === 'settings';

  return (
    <div className="min-h-screen flex bg-light-surface dark:bg-dark-surface transition-colors duration-150">
      <Sidebar
        currentView={currentView}
        onSelectView={handleSelectView}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          currentView={currentView}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          notifications={notifications}
          onClearNotifications={() => setNotifications([])}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          theme={theme}
          onToggleTheme={() =>
            setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
          }
        />

        <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto space-y-6">
          {/* Action Header Bar */}
          {showActionBar && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  Manage tasks in insertion order and process the highest-priority item via linear queue search.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  disabled={loading || mutating}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded bg-light-primary text-light-on-primary hover:bg-light-primary-container dark:bg-dark-primary dark:text-dark-on-primary dark:hover:bg-dark-primary-container dark:hover:text-dark-on-primary-container transition-colors duration-150 ease-state-change focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-dark-surface disabled:opacity-50 cursor-pointer"
                >
                  <span
                    className="material-symbols-outlined text-[18px]"
                    aria-hidden="true"
                  >
                    add
                  </span>
                  <span className="font-label text-label-lg whitespace-nowrap">
                    Add New Task
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!nextTask) {
                      showToast('No pending tasks to process.');
                      return;
                    }
                    setProcessModalOpen(true);
                  }}
                  disabled={loading || mutating || pendingQueue.length === 0}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded bg-light-secondary text-light-on-secondary hover:bg-light-secondary-container dark:bg-dark-secondary dark:text-dark-on-secondary dark:hover:bg-dark-secondary-container dark:hover:text-dark-on-secondary-container transition-colors duration-150 ease-state-change focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-secondary dark:focus-visible:ring-dark-secondary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-dark-surface disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <span
                    className="material-symbols-outlined text-[18px]"
                    aria-hidden="true"
                  >
                    play_arrow
                  </span>
                  <span className="font-label text-label-lg whitespace-nowrap">
                    Process Next Task
                  </span>
                </button>
              </div>
            </div>
          )}

          {loadError ? (
            <div className="rounded-lg border border-light-error/40 dark:border-dark-error/40 bg-light-error-container/50 dark:bg-dark-error-container/50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-title text-title-md text-light-on-error-container dark:text-dark-on-error-container">
                  C Backend Connection Error
                </h2>
                <p className="font-body text-body-sm text-light-on-error-container/90 dark:text-dark-on-error-container/90 mt-1">
                  {loadError}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void fetchTasks()}
                className="px-4 py-2 rounded bg-light-error text-light-on-error dark:bg-dark-error dark:text-dark-on-error font-label text-label-md shrink-0 cursor-pointer"
              >
                Retry Connection
              </button>
            </div>
          ) : loading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {[0, 1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className="h-36 rounded-lg bg-light-surface-container-lowest dark:bg-dark-surface-container-low border border-light-outline-variant/60 dark:border-dark-outline-variant/60 p-5 animate-pulse"
                  />
                ))}
              </div>
              <div className="h-48 rounded-lg bg-light-surface-container-lowest dark:bg-dark-surface-container-low border border-light-outline-variant/60 dark:border-dark-outline-variant/60 animate-pulse" />
            </div>
          ) : (
            <>
              {showStats && <StatsCards tasks={tasks} />}

              {showQueue && (
                <QueueVisualization
                  tasks={tasks}
                  onSelectTaskForPriority={(task) => setPriorityModalTask(task)}
                  onAddNewTask={handleOpenAddModal}
                />
              )}

              {showTable && (
                <TaskTable
                  tasks={tasks}
                  currentView={currentView}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  priorityFilter={priorityFilter}
                  onPriorityFilterChange={setPriorityFilter}
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                  onEditTask={handleOpenEditModal}
                  onUpdatePriority={(task) => setPriorityModalTask(task)}
                  onDeleteTask={(id) => void handleDeleteTask(id)}
                />
              )}

              {showAnalytics && <AnalyticsSection tasks={tasks} />}

              {showSettings && (
                <SettingsSection
                  onResetSampleData={() => void handleResetSampleData()}
                  onClearCompleted={() => void handleClearCompleted()}
                  completedCount={completedCount}
                  pendingCount={pendingQueue.length}
                  maxCapacity={maxCapacity}
                  busy={mutating}
                  theme={theme}
                  onSetTheme={setTheme}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Modals */}
      <TaskModal
        open={taskModalOpen}
        editingTask={editingTask}
        busy={mutating}
        onClose={() => {
          setTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSubmit={(name, priority, existingId) =>
          void handleTaskFormSubmit(name, priority, existingId)
        }
      />

      <PriorityModal
        task={priorityModalTask}
        busy={mutating}
        onClose={() => setPriorityModalTask(null)}
        onSubmit={(id, priority) => void handlePrioritySubmit(id, priority)}
      />

      <ProcessModal
        open={processModalOpen}
        nextTask={nextTask}
        pendingIndex={nextPendingIndex}
        busy={mutating}
        onClose={() => setProcessModalOpen(false)}
        onConfirm={() => void handleConfirmProcessNext()}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div aria-live="polite" className="fixed bottom-5 right-5 z-50">
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-light-inverse-surface text-light-inverse-on-surface dark:bg-dark-inverse-surface dark:text-dark-inverse-on-surface shadow-lg">
            <span
              className={`material-symbols-outlined text-[20px] ${
                toastIsError
                  ? 'text-light-error-container dark:text-light-error'
                  : 'text-success-container dark:text-success'
              }`}
            >
              {toastIsError ? 'error' : 'check_circle'}
            </span>
            <span className="font-label text-label-md">{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}

import { formatTaskId, Task, ViewType } from '../types/task';
import { PriorityBadge, StatusBadge } from './Badges';

interface TaskTableProps {
  tasks: Task[];
  currentView: ViewType;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  priorityFilter: string;
  onPriorityFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  onEditTask: (task: Task) => void;
  onUpdatePriority: (task: Task) => void;
  onDeleteTask: (taskId: number) => void;
}

export function TaskTable({
  tasks,
  currentView,
  searchQuery,
  onSearchChange,
  priorityFilter,
  onPriorityFilterChange,
  statusFilter,
  onStatusFilterChange,
  onEditTask,
  onUpdatePriority,
  onDeleteTask,
}: TaskTableProps) {
  const q = searchQuery.trim().toLowerCase();

  const filtered = tasks.filter((t) => {
    if (currentView === 'pending' && t.status !== 'Pending') return false;
    if (currentView === 'completed' && t.status !== 'Completed') return false;
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (priorityFilter === 'high' && t.priority < 8) return false;
    if (priorityFilter === 'medium' && (t.priority < 4 || t.priority > 7)) return false;
    if (priorityFilter === 'low' && t.priority > 3) return false;
    if (
      priorityFilter !== 'all' &&
      priorityFilter !== 'high' &&
      priorityFilter !== 'medium' &&
      priorityFilter !== 'low' &&
      String(t.priority) !== priorityFilter
    ) {
      return false;
    }
    if (q) {
      const displayId = formatTaskId(t.id).toLowerCase();
      if (
        !displayId.includes(q) &&
        !String(t.id).includes(q) &&
        !t.name.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  return (
    <section className="bg-light-surface-container-lowest dark:bg-dark-surface-container-low border border-light-outline-variant/60 dark:border-dark-outline-variant/60 rounded-lg shadow-sm overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-4 sm:p-5 border-b border-light-outline-variant/50 dark:border-dark-outline-variant/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="font-headline text-headline-md text-light-on-surface dark:text-dark-on-surface">
            Task Management
          </h2>
          <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
            Showing {filtered.length} of {tasks.length} tasks
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Mobile/Inline Search */}
          <div className="relative flex-1 sm:flex-initial min-w-[180px]">
            <span className="material-symbols-outlined text-[18px] text-light-on-surface-variant dark:text-dark-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              search
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Filter tasks..."
              aria-label="Filter tasks"
              className="w-full pl-9 pr-3 py-1.5 rounded bg-light-surface-container-low dark:bg-dark-surface-container border border-light-outline-variant/60 dark:border-dark-outline-variant/60 text-body-sm text-light-on-surface dark:text-dark-on-surface placeholder:text-light-outline dark:placeholder:text-dark-outline focus:outline-none focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:bg-light-surface-container-lowest dark:focus:bg-dark-surface-container-high"
            />
          </div>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => onPriorityFilterChange(e.target.value)}
            aria-label="Filter by priority"
            className="px-3 py-1.5 rounded bg-light-surface-container-low dark:bg-dark-surface-container border border-light-outline-variant/60 dark:border-dark-outline-variant/60 text-body-sm text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary"
          >
            <option value="all">All Priorities</option>
            <optgroup label="By Tier">
              <option value="high">High (8–10)</option>
              <option value="medium">Medium (4–7)</option>
              <option value="low">Low (1–3)</option>
            </optgroup>
            <optgroup label="Exact Priority (1–10)">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                <option key={level} value={String(level)}>
                  Priority {level}
                </option>
              ))}
            </optgroup>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            aria-label="Filter by status"
            className="px-3 py-1.5 rounded bg-light-surface-container-low dark:bg-dark-surface-container border border-light-outline-variant/60 dark:border-dark-outline-variant/60 text-body-sm text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary"
          >
            <option value="all">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Responsive Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-light-surface-container-low dark:bg-dark-surface-container border-b border-light-outline-variant/60 dark:border-dark-outline-variant/60">
            <tr>
              <th
                scope="col"
                className="px-5 py-3 text-light-on-surface-variant dark:text-dark-on-surface-variant uppercase tracking-wider"
              >
                <span className="font-label text-label-md">Task ID</span>
              </th>
              <th
                scope="col"
                className="px-5 py-3 text-light-on-surface-variant dark:text-dark-on-surface-variant uppercase tracking-wider"
              >
                <span className="font-label text-label-md">Task Name</span>
              </th>
              <th
                scope="col"
                className="px-5 py-3 text-light-on-surface-variant dark:text-dark-on-surface-variant uppercase tracking-wider"
              >
                <span className="font-label text-label-md">Priority</span>
              </th>
              <th
                scope="col"
                className="px-5 py-3 text-light-on-surface-variant dark:text-dark-on-surface-variant uppercase tracking-wider"
              >
                <span className="font-label text-label-md">Status</span>
              </th>
              <th
                scope="col"
                className="px-5 py-3 text-right text-light-on-surface-variant dark:text-dark-on-surface-variant uppercase tracking-wider"
              >
                <span className="font-label text-label-md">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-light-outline-variant/40 dark:divide-dark-outline-variant/40">
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-10 text-center text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant"
                >
                  No matching tasks found. Adjust your search or filters, or add a new task.
                </td>
              </tr>
            ) : (
              filtered.map((task) => {
                const displayId = formatTaskId(task.id);
                return (
                  <tr
                    key={task.id}
                    className="hover:bg-light-surface-container-low/60 dark:hover:bg-dark-surface-container/60 transition-colors duration-150"
                  >
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="font-mono text-mono-md text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums">
                        {displayId}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-body text-body-md font-medium text-light-on-surface dark:text-dark-on-surface">
                        {task.name}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <PriorityBadge priority={task.priority} />
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onEditTask(task)}
                          title="Edit Task"
                          aria-label={`Edit ${displayId}`}
                          className="inline-flex items-center justify-center w-8 h-8 rounded text-light-on-surface-variant dark:text-dark-on-surface-variant hover:bg-light-surface-container dark:hover:bg-dark-surface-container-high hover:text-light-primary dark:hover:text-dark-primary transition-colors duration-150 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdatePriority(task)}
                          title="Update Priority"
                          aria-label={`Update priority for ${displayId}`}
                          className="inline-flex items-center justify-center w-8 h-8 rounded text-light-on-surface-variant dark:text-dark-on-surface-variant hover:bg-light-surface-container dark:hover:bg-dark-surface-container-high hover:text-light-secondary dark:hover:text-dark-secondary transition-colors duration-150 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[18px]">tune</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteTask(task.id)}
                          title="Delete Task"
                          aria-label={`Delete ${displayId}`}
                          className="inline-flex items-center justify-center w-8 h-8 rounded text-light-on-surface-variant dark:text-dark-on-surface-variant hover:bg-light-error-container dark:hover:bg-dark-error-container hover:text-light-error dark:hover:text-dark-error transition-colors duration-150 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

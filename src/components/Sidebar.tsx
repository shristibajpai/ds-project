import { ViewType } from '../types/task';

interface SidebarProps {
  currentView: ViewType;
  onSelectView: (view: ViewType) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: { id: ViewType; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'all', label: 'All Tasks', icon: 'list_alt' },
  { id: 'pending', label: 'Pending Tasks', icon: 'pending_actions' },
  { id: 'completed', label: 'Completed Tasks', icon: 'task_alt' },
  { id: 'analytics', label: 'Analytics', icon: 'analytics' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

export function Sidebar({
  currentView,
  onSelectView,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-light-inverse-surface/40 dark:bg-black/60 z-30 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen bg-light-surface-container-lowest dark:bg-dark-surface-container-lowest border-r border-light-outline-variant/60 dark:border-dark-outline-variant/60 flex flex-col justify-between transition-all duration-200 ease-surface-enter shrink-0 ${
          collapsed ? 'w-[72px]' : 'w-60'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div>
          {/* Brand Header */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-light-outline-variant/50 dark:border-dark-outline-variant/50">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-9 h-9 rounded-md bg-light-primary text-light-on-primary dark:bg-dark-primary dark:text-dark-on-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">layers</span>
              </div>
              {!collapsed && (
                <span className="font-headline text-headline-md text-light-on-surface dark:text-dark-on-surface tracking-tight whitespace-nowrap">
                  PriorityFlow
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="hidden lg:inline-flex items-center justify-center w-8 h-8 rounded text-light-on-surface-variant dark:text-dark-on-surface-variant hover:bg-light-surface-container-low dark:hover:bg-dark-surface-container-low hover:text-light-on-surface dark:hover:text-dark-on-surface transition-colors duration-150 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">
                {collapsed ? 'chevron_right' : 'menu_open'}
              </span>
            </button>

            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close navigation"
              className="lg:hidden inline-flex items-center justify-center w-8 h-8 rounded text-light-on-surface-variant dark:text-dark-on-surface-variant hover:bg-light-surface-container-low dark:hover:bg-dark-surface-container-low cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Primary Navigation */}
          <nav className="p-3 space-y-1" aria-label="Main navigation">
            {NAV_ITEMS.map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectView(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-left transition-colors duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-light-surface-container text-light-primary dark:bg-dark-surface-container dark:text-dark-primary'
                      : 'text-light-on-surface-variant dark:text-dark-on-surface-variant hover:bg-light-surface-container-low dark:hover:bg-dark-surface-container-low hover:text-light-on-surface dark:hover:text-dark-on-surface'
                  } ${collapsed ? 'justify-center px-0' : ''}`}
                >
                  <span className="material-symbols-outlined text-[20px] shrink-0">
                    {item.icon}
                  </span>
                  {!collapsed && (
                    <span className="font-label text-label-lg whitespace-nowrap">
                      {item.label}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Queue Engine Footer Badge */}
        {!collapsed && (
          <div className="p-3 border-t border-light-outline-variant/50 dark:border-dark-outline-variant/50">
            <div className="rounded-md bg-light-surface-container-low dark:bg-dark-surface-container-low p-3">
              <div className="flex items-center gap-2 text-light-on-surface dark:text-dark-on-surface mb-1">
                <span className="material-symbols-outlined text-[16px] text-light-secondary dark:text-dark-secondary">
                  memory
                </span>
                <span className="font-label text-label-md">Array Queue Engine</span>
              </div>
              <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                O(n) linear scan · FIFO tie-break
              </p>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

import { useEffect, useRef, useState } from 'react';
import { ActivityNotification, ViewType } from '../types/task';

interface TopBarProps {
  currentView: ViewType;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  notifications: ActivityNotification[];
  onClearNotifications: () => void;
  onOpenMobileSidebar: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const VIEW_TITLES: Record<ViewType, string> = {
  dashboard: 'Dashboard',
  all: 'All Tasks',
  pending: 'Pending Tasks',
  completed: 'Completed Tasks',
  analytics: 'Analytics',
  settings: 'Settings',
};

export function TopBar({
  currentView,
  searchQuery,
  onSearchChange,
  notifications,
  onClearNotifications,
  onOpenMobileSidebar,
  theme,
  onToggleTheme,
}: TopBarProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notifOpen]);

  return (
    <header className="sticky top-0 z-20 h-16 bg-light-surface-container-lowest dark:bg-dark-surface-container-lowest border-b border-light-outline-variant/60 dark:border-dark-outline-variant/60 px-4 sm:px-6 flex items-center justify-between gap-4 transition-colors duration-150">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          aria-label="Open navigation"
          className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded text-light-on-surface-variant dark:text-dark-on-surface-variant hover:bg-light-surface-container-low dark:hover:bg-dark-surface-container-low cursor-pointer"
        >
          <span className="material-symbols-outlined text-[22px]">menu</span>
        </button>
        <h1 className="font-headline text-headline-lg text-light-on-surface dark:text-dark-on-surface truncate">
          {VIEW_TITLES[currentView]}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Global Search Bar */}
        <div className="relative hidden sm:block w-64 md:w-72">
          <span className="material-symbols-outlined text-[18px] text-light-on-surface-variant dark:text-dark-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            search
          </span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search tasks by ID or name..."
            aria-label="Search tasks by ID or name"
            className="w-full pl-9 pr-3 py-1.5 rounded bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant/60 dark:border-dark-outline-variant/60 text-body-md text-light-on-surface dark:text-dark-on-surface placeholder:text-light-outline dark:placeholder:text-dark-outline focus:outline-none focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:bg-light-surface-container-lowest dark:focus:bg-dark-surface-container transition-colors duration-150"
          />
        </div>

        {/* Theme Switch */}
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          className="inline-flex items-center justify-center w-9 h-9 rounded text-light-on-surface-variant dark:text-dark-on-surface-variant hover:bg-light-surface-container-low dark:hover:bg-dark-surface-container-low hover:text-light-on-surface dark:hover:text-dark-on-surface transition-colors duration-150 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">
            {theme === 'dark' ? 'light_mode' : 'dark_mode'}
          </span>
        </button>

        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setNotifOpen((prev) => !prev)}
            aria-label="Notifications"
            aria-expanded={notifOpen}
            className="relative inline-flex items-center justify-center w-9 h-9 rounded text-light-on-surface-variant dark:text-dark-on-surface-variant hover:bg-light-surface-container-low dark:hover:bg-dark-surface-container-low hover:text-light-on-surface dark:hover:text-dark-on-surface transition-colors duration-150 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            {notifications.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-light-secondary dark:bg-dark-secondary absolute top-2 right-2" />
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-lg bg-light-surface-container-lowest dark:bg-dark-surface-container-low border border-light-outline-variant/60 dark:border-dark-outline-variant/60 shadow-lg p-4 z-50">
              <div className="flex items-center justify-between mb-3">
                <span className="font-title text-title-md text-light-on-surface dark:text-dark-on-surface">
                  Activity Log
                </span>
                <button
                  type="button"
                  onClick={onClearNotifications}
                  className="font-label text-label-sm text-light-primary dark:text-dark-primary hover:underline cursor-pointer"
                >
                  Clear
                </button>
              </div>

              {notifications.length === 0 ? (
                <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant py-2">
                  No recent queue activity.
                </p>
              ) : (
                <ul className="space-y-2.5 max-h-60 overflow-y-auto">
                  {notifications.slice(0, 6).map((n) => (
                    <li
                      key={n.id}
                      className="pb-2 border-b border-light-outline-variant/40 dark:border-dark-outline-variant/40 last:border-b-0"
                    >
                      <p className="font-body text-body-sm text-light-on-surface dark:text-dark-on-surface">
                        {n.text}
                      </p>
                      <span className="font-mono text-mono-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                        {n.time}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* User Profile Avatar */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-light-outline-variant/50 dark:border-dark-outline-variant/50">
          <div
            className="w-9 h-9 rounded-full bg-light-surface-container text-light-primary dark:bg-dark-surface-container-high dark:text-dark-primary font-headline text-label-lg flex items-center justify-center border border-light-outline-variant/60 dark:border-dark-outline-variant/60 shrink-0"
            title="Alex Rivera — Systems Lead"
          >
            AR
          </div>
          <div className="hidden md:block leading-tight">
            <p className="font-label text-label-md text-light-on-surface dark:text-dark-on-surface whitespace-nowrap">
              Alex Rivera
            </p>
            <p className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant whitespace-nowrap">
              Systems Lead
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

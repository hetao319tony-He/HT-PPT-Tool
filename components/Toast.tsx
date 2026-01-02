
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckIcon, XIcon, SparklesIcon } from './Icons';
import { clsx } from 'clsx';

export type ToastType = 'success' | 'error' | 'info' | 'loading';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={clsx(
              "pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-md transition-all duration-300 animate-[slideInRight_0.3s_ease-out]",
              toast.type === 'success' && "bg-emerald-50 dark:bg-emerald-900/80 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-100",
              toast.type === 'error' && "bg-red-50 dark:bg-red-900/80 border-red-200 dark:border-red-700 text-red-800 dark:text-red-100",
              (toast.type === 'info' || toast.type === 'loading') && "bg-white dark:bg-zinc-800/90 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100"
            )}
            style={{ maxWidth: '350px' }}
          >
            <div className={clsx(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                toast.type === 'success' && "bg-emerald-100 dark:bg-emerald-800",
                toast.type === 'error' && "bg-red-100 dark:bg-red-800",
                (toast.type === 'info' || toast.type === 'loading') && "bg-zinc-100 dark:bg-zinc-700"
            )}>
                {toast.type === 'success' && <CheckIcon className="w-4 h-4" />}
                {toast.type === 'error' && <XIcon className="w-4 h-4" />}
                {toast.type === 'info' && <SparklesIcon className="w-4 h-4 text-indigo-500" />}
                {toast.type === 'loading' && <SparklesIcon className="w-4 h-4 text-indigo-500 animate-spin" />}
            </div>
            <p className="text-xs font-medium leading-relaxed">{toast.message}</p>
            <button 
                onClick={() => removeToast(toast.id)}
                className="ml-auto p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors"
            >
                <XIcon className="w-3 h-3 opacity-50" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};


import React, { useEffect } from 'react';
import { CheckCircleIcon, TrashIcon } from './icons';

export type ToastType = 'success' | 'error' | 'info';

interface Props {
  message: string;
  type: ToastType;
  isVisible: boolean;
  onClose: () => void;
}

export const Toast: React.FC<Props> = ({ message, type, isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-emerald-900/80 text-emerald-100 border-emerald-700/50 shadow-emerald-900/20';
      case 'error':
        return 'bg-red-900/80 text-red-100 border-red-700/50 shadow-red-900/20';
      default:
        return 'bg-zinc-800/90 text-zinc-100 border-zinc-700 shadow-black/20';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircleIcon className="w-5 h-5 text-emerald-400" />;
      case 'error': return <div className="w-5 h-5 rounded-full bg-red-800/50 flex items-center justify-center"><div className="w-3 h-0.5 bg-red-400 rotate-45 absolute"></div><div className="w-3 h-0.5 bg-red-400 -rotate-45 absolute"></div></div>;
      default: return <div className="w-5 h-5 rounded-full border-2 border-blue-400 flex items-center justify-center text-[10px] font-bold text-blue-400">i</div>;
    }
  };

  return (
    <div className="fixed top-4 left-0 right-0 mx-auto max-w-[640px] px-4 z-50 animate-slide-down pointer-events-none">
      <div className={`mx-auto max-w-sm backdrop-blur-md border shadow-2xl rounded-2xl p-4 flex items-center gap-3 ${getStyles()} pointer-events-auto`}>
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <p className="flex-1 text-sm font-semibold">{message}</p>
        <button onClick={onClose} className="p-1 opacity-50 hover:opacity-100 text-white">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
    </div>
  );
};

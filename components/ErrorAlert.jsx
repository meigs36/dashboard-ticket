// components/ErrorAlert.jsx - Alert non-bloccante per errori
'use client'

import { X, AlertCircle } from 'lucide-react';

export default function ErrorAlert({ error, onClose, className = '' }) {
  if (!error) return null;

  return (
    <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 ${className}`}>
      <div className="flex gap-3">
        <div className="flex-shrink-0">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
        </div>
        
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
            Errore Registrazione
          </h3>
          <div className="text-sm text-red-700 dark:text-red-300 whitespace-pre-line">
            {error}
          </div>
        </div>
        
        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 transition-colors"
            aria-label="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}

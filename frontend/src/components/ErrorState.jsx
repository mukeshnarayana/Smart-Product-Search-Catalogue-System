import React from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

export function ErrorState({ error, onRetry, onClearAll }) {
  const details = error?.details || [];

  return (
    <div
      className="w-full flex flex-col items-center justify-center p-10 bg-rose-50/60 rounded-3xl border border-rose-200 text-center my-6"
      role="alert"
    >
      <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4 shadow-xs">
        <AlertTriangle className="w-7 h-7" />
      </div>

      <h3 className="text-xl font-bold text-slate-900 mb-2">
        {error?.code === 'VALIDATION_ERROR' ? 'Invalid Search Query' : 'Failed to Load Products'}
      </h3>

      <p className="text-sm text-slate-600 max-w-md mb-4">
        {error?.message || 'An unexpected error occurred while communicating with the catalog service.'}
      </p>

      {/* Structured Validation Details from 400 responses */}
      {details.length > 0 && (
        <div className="bg-white/80 border border-rose-200/80 rounded-xl p-3.5 mb-6 text-left max-w-md w-full">
          <p className="text-xs font-semibold text-rose-800 uppercase tracking-wider mb-2">
            Validation Issues:
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs text-rose-700">
            {details.map((d, index) => (
              <li key={index}>
                <span className="font-semibold text-rose-900">{d.field}:</span> {d.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-medium text-sm hover:bg-slate-800 transition-colors shadow-xs focus:outline-none focus:ring-2 focus:ring-slate-900/20"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry Request</span>
          </button>
        )}

        {onClearAll && (
          <button
            type="button"
            onClick={onClearAll}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors focus:outline-none"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Filters</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default ErrorState;

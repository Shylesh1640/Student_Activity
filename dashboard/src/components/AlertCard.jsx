import { format } from 'date-fns';
import { AlertTriangle, Clock, ShieldCheck } from 'lucide-react';

export default function AlertCard({ alert, onAcknowledge }) {
  const { title, url, timestamp, studentId, isAcknowledged } = alert;

  const getDomain = (urlStr) => {
    try {
      return new URL(urlStr).hostname.replace('www.', '');
    } catch {
      return urlStr;
    }
  };

  return (
    <div className={`card border-l-4 ${isAcknowledged ? 'border-l-slate-300 opacity-70' : 'border-l-red-500 shadow-sm'}`}>
      <div className="p-4 flex flex-col h-full">
        
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center text-red-600 font-semibold text-sm">
            <AlertTriangle className="w-4 h-4 mr-1.5" />
            Social Media Blocklist
          </div>
          <div className="text-xs text-slate-400 flex items-center bg-slate-50 px-2 py-1 rounded">
            <Clock className="w-3 h-3 mr-1" />
            {format(new Date(timestamp), 'h:mm a')}
          </div>
        </div>

        <div className="flex-1">
          <h4 className="text-slate-900 font-medium mb-1 line-clamp-2 leading-tight">
            {title || 'Unknown Title'}
          </h4>
          <a href={url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline truncate block">
            {getDomain(url)}
          </a>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Student: <span className="text-slate-700">{studentId.substring(0,8)}...</span>
          </span>

          {!isAcknowledged ? (
            <button
              onClick={() => onAcknowledge(alert._id)}
              className="text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 px-3 py-1.5 rounded transition-colors flex items-center"
            >
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              Acknowledge
            </button>
          ) : (
            <span className="text-xs font-medium text-slate-400 flex items-center">
              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-green-500" />
              Resolved
            </span>
          )}
        </div>

      </div>
    </div>
  );
}

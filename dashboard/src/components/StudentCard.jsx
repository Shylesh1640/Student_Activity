import { useNavigate } from 'react-router-dom';
import { MonitorPlay, Clock, ExternalLink } from 'lucide-react';

export default function StudentCard({ student }) {
  const navigate = useNavigate();
  const { studentId, name, isOnline, lastSeen } = student;

  // Generate initials
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || '?';

  // Format last seen
  const timeAgo = (date) => {
    const min = Math.floor((new Date() - new Date(date)) / 60000);
    if (min < 1) return 'Just now';
    if (min < 60) return `${min}m ago`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="card hover:border-blue-200 transition-colors group">
      <div className="p-5 flex items-start justify-between">
        
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-semibold text-lg border border-slate-200">
              {initials}
            </div>
            <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-white rounded-full ${isOnline ? 'bg-green-500' : 'bg-slate-400'}`} />
          </div>
          
          <div>
            <h3 className="font-semibold text-slate-900 leading-tight">{name}</h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              {isOnline ? 'Online now' : `Last seen ${timeAgo(lastSeen)}`}
            </p>
          </div>
        </div>

      </div>

      <div className="px-3 pt-3 pb-3 bg-slate-50/50 border-t border-slate-100 flex gap-2">
        <button 
          onClick={() => navigate(`/students/${studentId}?tab=activity`)}
          className="flex-1 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 flex items-center justify-center transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
          Activity
        </button>
        <button 
          onClick={() => navigate(`/students/${studentId}?tab=live`)}
          disabled={!isOnline}
          className={`flex-1 py-2 text-xs font-medium rounded-lg flex items-center justify-center transition-colors shadow-sm
            ${isOnline 
              ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200' 
              : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed hidden'
            }
          `}
        >
          <MonitorPlay className="w-3.5 h-3.5 mr-1.5" />
          Live View
        </button>
      </div>
    </div>
  );
}

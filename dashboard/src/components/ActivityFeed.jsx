import { Globe, BookOpen, Facebook, LayoutGrid, Link as LinkIcon } from 'lucide-react';
import useStudentStore from '../store/studentStore';

export default function ActivityFeed() {
  const activityFeed = useStudentStore(state => state.activityFeed);
  const students = useStudentStore(state => state.students);

  const getClassificationStyles = (type) => {
    switch (type) {
      case 'EDUCATIONAL': return { bg: 'bg-green-100', text: 'text-green-700', icon: <BookOpen className="w-3 h-3" /> };
      case 'SOCIAL_MEDIA': return { bg: 'bg-red-100', text: 'text-red-700', icon: <Facebook className="w-3 h-3" /> };
      case 'PRODUCTIVITY': return { bg: 'bg-blue-100', text: 'text-blue-700', icon: <LayoutGrid className="w-3 h-3" /> };
      default: return { bg: 'bg-slate-100', text: 'text-slate-600', icon: <Globe className="w-3 h-3" /> };
    }
  };

  const getStudentName = (id) => {
    const student = students.find(s => s.studentId === id);
    return student ? student.name : 'Unknown Student';
  };

  const timeAgo = (dateStr) => {
    const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.floor(seconds / 60)}m ago`;
  };

  if (activityFeed.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 space-y-3">
        <Globe className="w-10 h-10 opacity-20" />
        <p className="text-sm">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full custom-scrollbar pr-2 space-y-3">
      {activityFeed.map((event, i) => {
        const styles = getClassificationStyles(event.classification);
        return (
          <div key={i} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
            {/* Student Initials */}
            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
              {getStudentName(event.studentId).substring(0,2).toUpperCase()}
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-slate-900 truncate pr-2">
                  {getStudentName(event.studentId)}
                </span>
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  {timeAgo(event.timestamp || event.serverTimestamp)}
                </span>
              </div>
              
              <div className="text-sm text-slate-700 truncate font-medium">
                {event.title || 'Untitled Page'}
              </div>
              
              <div className="flex items-center mt-1.5 space-x-2">
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase ${styles.bg} ${styles.text}`}>
                  <span className="mr-1">{styles.icon}</span>
                  {event.classification}
                </span>
                <span className="text-xs text-slate-500 truncate flex items-center max-w-[200px]" title={event.url}>
                  <LinkIcon className="w-2.5 h-2.5 mr-1 flex-shrink-0" />
                  {event.url ? new URL(event.url).hostname.replace('www.', '') : ''}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  );
}

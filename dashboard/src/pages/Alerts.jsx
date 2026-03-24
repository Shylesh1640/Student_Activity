import { useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { ShieldAlert, ShieldCheck, Filter, Search, Camera } from 'lucide-react';
import useAlertStore from '../store/alertStore';
import useStudentStore from '../store/studentStore';

export default function Alerts() {
  const alerts = useAlertStore(state => state.alerts);
  const acknowledgeAlert = useAlertStore(state => state.acknowledgeAlert);
  const acknowledgeAll = useAlertStore(state => state.acknowledgeAll);
  const students = useStudentStore(state => state.students);

  const [filter, setFilter] = useState('ALL'); // ALL, UNACKNOWLEDGED, ACKNOWLEDGED
  const [typeFilter, setTypeFilter] = useState('ALL'); // ALL, SOCIAL_MEDIA, CAMERA_PERMISSION
  const [search, setSearch] = useState('');
  const [isAcknowledgingAll, setIsAcknowledgingAll] = useState(false);

  const getStudentName = (id) => {
    const s = students.find(st => st.studentId === id);
    return s ? s.name : id;
  };

  const filteredAlerts = alerts
    .filter(a => {
      if (filter === 'UNACKNOWLEDGED') return !a.isAcknowledged;
      if (filter === 'ACKNOWLEDGED') return a.isAcknowledged;
      return true;
    })
    .filter(a => {
      if (typeFilter === 'SOCIAL_MEDIA') return a.alertType === 'SOCIAL_MEDIA';
      if (typeFilter === 'CAMERA_PERMISSION') return a.alertType === 'CAMERA_PERMISSION';
      return true;
    })
    .filter(a => 
      getStudentName(a.studentId).toLowerCase().includes(search.toLowerCase()) || 
      a.title?.toLowerCase().includes(search.toLowerCase()) ||
      a.url?.toLowerCase().includes(search.toLowerCase()) ||
      a.details?.toLowerCase().includes(search.toLowerCase())
    );

  const handleAcknowledge = async (id) => {
    try {
      await axios.post(`${import.meta.env.VITE_SERVER_URL || "http://localhost:3000"}/api/admin/alerts/${id}/acknowledge`, {}, { withCredentials: true });
      acknowledgeAlert(id, 'admin@school.edu');
    } catch {
      console.error('Failed to acknowledge alert');
    }
  };

  const handleAcknowledgeAll = async () => {
    if (!window.confirm('Are you sure you want to resolve all active alerts?')) return;
    setIsAcknowledgingAll(true);
    try {
      await axios.post(`${import.meta.env.VITE_SERVER_URL || "http://localhost:3000"}/api/admin/alerts/acknowledge-all`, {}, { withCredentials: true });
      acknowledgeAll(null, 'admin@school.edu');
    } catch {
      console.error('Failed to mass acknowledge alerts');
    } finally {
      setIsAcknowledgingAll(false);
    }
  };

  const unackCount = alerts.filter(a => !a.isAcknowledged).length;

  /**
   * Render the "Content" column based on alertType
   */
  const renderAlertContent = (alert) => {
    if (alert.alertType === 'CAMERA_PERMISSION') {
      return (
        <div>
          <div className="flex items-center text-sm text-amber-700 font-medium mb-1">
            <Camera className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
            Camera permission denied by student
          </div>
          {alert.details && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded px-2 py-1 inline-block">
              {alert.details}
            </p>
          )}
        </div>
      );
    }

    // Default: SOCIAL_MEDIA
    return (
      <div>
        <div className="text-sm text-slate-900 font-medium mb-1">{alert.title || 'Unknown Page'}</div>
        <a href={alert.url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline truncate max-w-sm block">
          {alert.url}
        </a>
      </div>
    );
  };

  /**
   * Render alert type badge
   */
  const renderAlertTypeBadge = (alertType) => {
    if (alertType === 'CAMERA_PERMISSION') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
          <Camera className="w-3 h-3 mr-1" />
          Camera
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
        <ShieldAlert className="w-3 h-3 mr-1" />
        Social
      </span>
    );
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center">
            <ShieldAlert className="w-6 h-6 mr-2 text-red-600" />
            Alert Center
          </h1>
          <p className="text-sm text-slate-500 mt-1">Review blocklist violations and system warnings.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search alerts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 w-64 shadow-sm"
            />
          </div>

          {/* Alert type filter */}
          <div className="bg-white border border-slate-200 rounded-lg p-1 shadow-sm flex items-center">
            {['ALL', 'SOCIAL_MEDIA', 'CAMERA_PERMISSION'].map((f) => (
              <button
                key={f}
                onClick={() => setTypeFilter(f)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  typeFilter === f 
                    ? 'bg-slate-100 text-slate-800 shadow-sm border border-slate-200/50' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                {f === 'ALL' ? 'All Types' : f === 'SOCIAL_MEDIA' ? 'Social' : 'Camera'}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="bg-white border border-slate-200 rounded-lg p-1 shadow-sm flex items-center">
            {['ALL', 'UNACKNOWLEDGED', 'ACKNOWLEDGED'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  filter === f 
                    ? 'bg-slate-100 text-slate-800 shadow-sm border border-slate-200/50' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                {f === 'UNACKNOWLEDGED' ? 'Active' : f === 'ACKNOWLEDGED' ? 'Resolved' : 'All'}
              </button>
            ))}
          </div>

          {unackCount > 0 && (
            <button
              onClick={handleAcknowledgeAll}
              disabled={isAcknowledgingAll}
              className="ml-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
            >
              Resolve All ({unackCount})
            </button>
          )}
        </div>
      </div>

      <div className="card flex-1 flex flex-col overflow-hidden">
        <div className="overflow-x-auto flex-1">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Content</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {filteredAlerts.map(alert => (
                <tr key={alert._id} className={!alert.isAcknowledged ? (alert.alertType === 'CAMERA_PERMISSION' ? 'bg-amber-50/20' : 'bg-red-50/20') : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {!alert.isAcknowledged ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Resolved
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {renderAlertTypeBadge(alert.alertType)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    <div>{format(new Date(alert.timestamp), 'MMM d, yyyy')}</div>
                    <div className="text-xs text-slate-400">{format(new Date(alert.timestamp), 'h:mm a')}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900">{getStudentName(alert.studentId)}</div>
                  </td>
                  <td className="px-6 py-4">
                    {renderAlertContent(alert)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {!alert.isAcknowledged ? (
                      <button 
                        onClick={() => handleAcknowledge(alert._id)}
                        className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded text-xs transition-colors"
                      >
                        Acknowledge
                      </button>
                    ) : (
                      <span className="text-slate-400 text-xs flex items-center justify-end">
                        <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                        By {alert.acknowledgedBy}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredAlerts.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                    <Filter className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    No alerts found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import { useEffect } from 'react';
import axios from 'axios';
import { Users, Wifi, AlertTriangle, FileText, ShieldCheck } from 'lucide-react';
import useStudentStore from '../store/studentStore';
import useAlertStore from '../store/alertStore';
import ActivityFeed from '../components/ActivityFeed';
import AlertCard from '../components/AlertCard';

export default function Dashboard() {
  const students = useStudentStore(state => state.students);
  const onlineCount = useStudentStore(state => state.onlineCount);
  const setStudents = useStudentStore(state => state.setStudents);
  
  const alerts = useAlertStore(state => state.alerts);
  const setAlerts = useAlertStore(state => state.setAlerts);
  const unacknowledgedCount = useAlertStore(state => state.unacknowledgedCount);
  const acknowledgeAlert = useAlertStore(state => state.acknowledgeAlert);

  useEffect(() => {
    // Initial data fetch
    const fetchData = async () => {
      try {
        const [studentsRes, alertsRes] = await Promise.all([
          axios.get(`http://${window.location.hostname}:3000/api/admin/students`, { withCredentials: true }),
          axios.get(`http://${window.location.hostname}:3000/api/admin/alerts?acknowledged=false`, { withCredentials: true })
        ]);
        
        setStudents(studentsRes.data);
        setAlerts(alertsRes.data);
      } catch {
        console.error('Failed to load dashboard data');
      }
    };
    fetchData();
  }, [setStudents, setAlerts]);

  const handleAcknowledge = async (id) => {
    try {
      await axios.post(`http://${window.location.hostname}:3000/api/admin/alerts/${id}/acknowledge`, {}, { withCredentials: true });
      acknowledgeAlert(id, 'admin@school.edu');
    } catch {
      console.error('Failed to acknowledge alert');
    }
  };

  const statCards = [
    { label: 'Total Enrolled', value: students.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Online Now', value: onlineCount, icon: Wifi, color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'Active Alerts', value: unacknowledgedCount, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100' },
    { label: 'Reports Today', value: 0, icon: FileText, color: 'text-purple-600', bg: 'bg-purple-100' },
  ];

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">System Overview</h1>
        <div className="text-sm font-medium text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => (
          <div key={idx} className="card p-5 flex items-center">
            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} mr-4`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        
        {/* Activity Feed Container (Span 7) */}
        <div className="col-span-1 lg:col-span-7 flex flex-col card h-[600px]">
          <div className="card-header bg-slate-50/50">
            <h2 className="card-title flex items-center">
              <span className="w-2 h-2 rounded-full bg-blue-500 mr-2 pulse-animation"></span>
              Live Activity Stream
            </h2>
          </div>
          <div className="card-body flex-1 overflow-hidden bg-white">
            <ActivityFeed />
          </div>
        </div>

        {/* Alerts Panel (Span 5) */}
        <div className="col-span-1 lg:col-span-5 flex flex-col card h-[600px] bg-slate-50/50">
          <div className="card-header bg-white">
            <h2 className="card-title flex items-center justify-between w-full text-red-600">
              <div className="flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Action Required
              </div>
              {unacknowledgedCount > 0 && (
                <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-bold">
                  {unacknowledgedCount} New
                </span>
              )}
            </h2>
          </div>
          
          <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-4">
            {alerts.filter(a => !a.isAcknowledged).length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                <ShieldCheck className="w-12 h-12 mb-3 text-green-500" />
                <p>All clear! No active alerts.</p>
              </div>
            ) : (
              alerts
                .filter(a => !a.isAcknowledged)
                .map(alert => (
                  <AlertCard 
                    key={alert._id} 
                    alert={alert} 
                    onAcknowledge={handleAcknowledge} 
                  />
                ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

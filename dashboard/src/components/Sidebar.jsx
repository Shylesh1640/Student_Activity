import { NavLink, useNavigate } from 'react-router-dom';

import { 
  LayoutDashboard as IconDashboard,
  Users as IconUsers,
  Bell as IconBell,
  FileText as IconFile,
  Settings as IconSettings,
  LogOut as IconLogOut,
  ShieldAlert,
  CalendarDays as IconCalendar
} from 'lucide-react';
import useAlertStore from '../store/alertStore';
import toast from 'react-hot-toast';

export default function Sidebar() {
  const navigate = useNavigate();
  const unacknowledgedCount = useAlertStore(state => state.unacknowledgedCount);

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('adminUsername');
    toast.success('Logged out successfully');
    navigate('/login');
    // Force reload to clear socket connections and state
    setTimeout(() => window.location.reload(), 500);
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: IconDashboard },
    { path: '/students', label: 'Students', icon: IconUsers },
    { 
      path: '/alerts', 
      label: 'Alerts', 
      icon: IconBell, 
      badge: unacknowledgedCount > 0 ? unacknowledgedCount : null 
    },
    { path: '/reports', label: 'Reports', icon: IconFile },
    { path: '/routine', label: 'Routine', icon: IconCalendar },
    { path: '/settings', label: 'Settings', icon: IconSettings }
  ];

  return (
    <div className="w-64 h-screen bg-[#1E293B] text-slate-300 flex flex-col flex-shrink-0 relative z-20">
      {/* Brand */}
      <div className="h-16 flex items-center px-6 border-b border-slate-700/50">
        <ShieldAlert className="w-6 h-6 text-blue-500 mr-3" />
        <span className="text-white font-semibold tracking-wide">ActivityMonitor</span>
      </div>

      {/* Nav Links */}
      <div className="flex-1 py-6 px-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
              ${isActive 
                ? 'bg-blue-600 text-white' 
                : 'hover:bg-slate-800 hover:text-white'
              }
            `}
          >
            <item.icon className="w-5 h-5 mr-3 flex-shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </div>

      {/* User / Footer */}
      <div className="p-4 border-t border-slate-700/50">
        <button 
          onClick={handleLogout}
          className="flex items-center w-full px-3 py-2 text-sm font-medium text-slate-400 rounded-lg hover:text-white hover:bg-slate-800 transition-colors"
        >
          <IconLogOut className="w-5 h-5 mr-3" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

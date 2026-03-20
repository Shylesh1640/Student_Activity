import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useSocket } from '../hooks/useSocket';
import { Toaster } from 'react-hot-toast';

export default function Layout() {
  // Check if we are authenticated
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  
  // Initialize socket connection for the entire dashboard
  useSocket();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 border-l border-slate-200 shadow-[inset_1px_0_0_0_rgba(0,0,0,0.02)]">
        <div className="p-6 md:p-8 max-w-7xl mx-auto h-full">
          <Outlet />
        </div>
      </main>
      <Toaster />
    </div>
  );
}

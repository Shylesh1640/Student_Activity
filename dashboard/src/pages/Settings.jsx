import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Settings as SettingsIcon, Shield, Loader2 } from 'lucide-react';

export default function Settings() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return toast.error("New passwords don't match");
    }

    setIsUpdating(true);
    try {
      const { data } = await axios.post(
        `http://${window.location.hostname}:3000/api/admin/change-password`,
        { oldPassword, newPassword },
        { withCredentials: true }
      );

      if (data.success) {
        toast.success(data.message);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update password');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center space-x-3 mb-8">
        <div className="p-2 bg-slate-100 rounded-lg">
          <SettingsIcon className="w-6 h-6 text-slate-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Account Settings</h1>
          <p className="text-sm text-slate-500">Manage your admin profile and security preferences.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center space-x-3">
          <Shield className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-slate-800">Change Admin Password</h2>
        </div>
        
        <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
          <div className="max-w-md">
            <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
            <input
              type="password"
              required
              value={oldPassword}
              onChange={e => setOldPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          <div className="max-w-md">
            <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          <div className="max-w-md">
            <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isUpdating}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {isUpdating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Update Password
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}

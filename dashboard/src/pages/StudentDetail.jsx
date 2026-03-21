// This file requires 3 tabs: Live View, Activity Log, Reports
import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useSocket } from '../hooks/useSocket';
import { useWebRTC } from '../hooks/useWebRTC';
import useStudentStore from '../store/studentStore';
import { MonitorPlay, Camera, Square, Download, FileText, Globe, Clock, AlertTriangle, Save, Trash2, User, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function StudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'live';
  
  const student = useStudentStore(state => state.students.find(s => s.studentId === id));
  const updateStudentStore = useStudentStore(state => state.updateStudentData);
  const removeStudentStore = useStudentStore(state => state.removeStudent);
  
  // Local state for management
  const [editedName, setEditedName] = useState('');
  const [editedNotes, setEditedNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Need raw socket for the hook
  const socket = useSocket(); 
  
  // WebRTC hooks
  const screenRTC = useWebRTC(id, socket, 'SCREEN');
  const cameraRTC = useWebRTC(id, socket, 'CAMERA');

  // States for tabs
  const [logs, setLogs] = useState([]);
  const [reports, setReports] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  
  // Change tab function
  const setTab = (tab) => setSearchParams({ tab });

  // Initialize local state when student is loaded
  useEffect(() => {
    if (student) {
      setEditedName(student.name);
      setEditedNotes(student.notes || '');
    }
  }, [student]);

  // Fetch logs when tab is 'activity'
  useEffect(() => {
    if (activeTab === 'activity') {
      setIsLoadingLogs(true);
      axios.get(`http://${window.location.hostname}:3000/api/admin/students/${id}/logs`, { withCredentials: true })
        .then(res => {
          setLogs(res.data);
        })
        .finally(() => setIsLoadingLogs(false));
    }
  }, [activeTab, id]);

  // Fetch reports when tab is 'reports'
  useEffect(() => {
    if (activeTab === 'reports') {
      axios.get(`http://${window.location.hostname}:3000/api/admin/students/${id}/reports`, { withCredentials: true })
        .then(res => {
          setReports(res.data);
        });
    }
  }, [activeTab, id]);

  const generateReport = async () => {
    try {
      const { data } = await axios.post(`http://${window.location.hostname}:3000/api/admin/students/${id}/report`, {}, { withCredentials: true });
      setReports([data, ...reports]); // The response is the report object itself in the controller
    } catch (err) {
      console.error('Failed to generate report', err);
    }
  };

  const handleSaveStudent = async () => {
    try {
      setIsSaving(true);
      await axios.patch(`http://${window.location.hostname}:3000/api/admin/students/${id}`, {
        name: editedName,
        notes: editedNotes
      }, { withCredentials: true });
      
      updateStudentStore(id, { name: editedName, notes: editedNotes });
      alert('Student details updated successfully');
    } catch (err) {
      console.error('Failed to update student', err);
      alert('Failed to update student details');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (confirm(`Are you sure you want to PERMANENTLY delete student ${student.name} and ALL their activity data? This cannot be undone.`)) {
      try {
        setIsDeleting(true);
        await axios.delete(`http://${window.location.hostname}:3000/api/admin/students/${id}`, { withCredentials: true });
        removeStudentStore(id);
        navigate('/students');
      } catch (err) {
        console.error('Failed to delete student', err);
        alert('Failed to delete student account');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  if (!student) return <div className="p-8 text-center text-slate-500">Student not found or loading...</div>;

  return (
    <div className="h-full flex flex-col pt-2">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{student.name}</h1>
          <p className="text-sm text-slate-500 mt-1 flex items-center">
            ID: {student.studentId} • 
            <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${student.isOnline ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
              {student.isOnline ? 'ONLINE NOW' : 'OFFLINE'}
            </span>
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-6 border-b border-slate-200 mb-6 px-2">
        {['live', 'activity', 'reports', 'manage'].map(tab => (
          <button
            key={tab}
            onClick={() => setTab(tab)}
            className={`pb-3 text-sm font-semibold capitalize transition-all border-b-2 px-1 ${
              activeTab === tab 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab === 'live' ? 'Live View' : tab === 'activity' ? 'Activity Log' : tab === 'reports' ? 'Reports' : 'Manage Account'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        
        {/* LIVE VIEW TAB */}
        {activeTab === 'live' && (
          <div className="space-y-6">
            {!student.isOnline && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 flex items-center text-sm">
                <AlertTriangle className="w-5 h-5 mr-3 flex-shrink-0" />
                This student is currently offline. Live view and recent activity will not update until they connect.
              </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Screen Share Panel */}
              <div className="card overflow-hidden bg-slate-50 flex flex-col">
                <div className="card-header bg-white">
                  <h3 className="card-title flex items-center"><MonitorPlay className="w-4 h-4 mr-2"/> Screen</h3>
                  {screenRTC.isScreenSharing ? (
                    <button onClick={screenRTC.stopStream} className="text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-lg flex items-center font-bold">
                      <Square className="w-3 h-3 mr-1" /> Stop
                    </button>
                  ) : (
                    <button onClick={screenRTC.requestScreen} disabled={!student.isOnline || screenRTC.isConnecting} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg flex items-center cursor-pointer disabled:opacity-50 font-bold tracking-wide">
                      {screenRTC.isConnecting ? '...' : 'Request'}
                    </button>
                  )}
                </div>
                <div className="aspect-video bg-black relative flex items-center justify-center">
                  <video 
                    ref={screenRTC.remoteVideoRef} 
                    autoPlay 
                    playsInline 
                    muted
                    className={`w-full h-full object-contain ${!screenRTC.isScreenSharing || screenRTC.lastFrame ? 'hidden' : ''}`} 
                  />
                  {screenRTC.lastFrame && (
                    <img 
                      src={screenRTC.lastFrame} 
                      className="w-full h-full object-contain"
                      alt="Screen Stream"
                    />
                  )}
                  {!screenRTC.isScreenSharing && !screenRTC.lastFrame && (
                    <span className="text-white/40 text-sm font-medium">Screen feed inactive</span>
                  )}
                </div>
              </div>

              {/* Camera Panel */}
              <div className="card overflow-hidden bg-slate-50 flex flex-col">
                <div className="card-header bg-white">
                  <h3 className="card-title flex items-center"><Camera className="w-4 h-4 mr-2"/> Camera</h3>
                  <span className={`text-xs px-3 py-1.5 rounded-lg font-bold tracking-wide ${cameraRTC.isCameraSharing ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {cameraRTC.isCameraSharing ? 'Live' : 'Waiting'}
                  </span>
                </div>
                <div className="aspect-video bg-black relative flex items-center justify-center">
                  <video 
                    ref={cameraRTC.remoteVideoRef} 
                    autoPlay 
                    playsInline 
                    muted
                    className={`w-full h-full object-contain ${!cameraRTC.isCameraSharing || cameraRTC.lastFrame ? 'hidden' : ''}`} 
                  />
                  {cameraRTC.lastFrame && (
                    <img 
                      src={cameraRTC.lastFrame} 
                      className="w-full h-full object-contain"
                      alt="Camera Stream"
                    />
                  )}
                  {!cameraRTC.isCameraSharing && !cameraRTC.lastFrame && (
                    <span className="text-white/40 text-sm font-medium">Camera feed inactive</span>
                  )}
                </div>
                <div className="px-4 py-3 bg-white border-t border-slate-200 text-xs">
                  <div className="text-slate-500">
                    Camera status: <span className="font-semibold text-slate-700">{cameraRTC.cameraStatus || 'unknown'}</span>
                  </div>
                  {cameraRTC.error && (
                    <div className="text-red-600 mt-1">{cameraRTC.error}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Current Active Tab Info */}
            <div className="card p-5 border-l-4 border-l-blue-500">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Current Focus Window</h4>
              <p className="text-lg font-medium text-slate-900 truncate">
                {student.activeTabTitle || 'No active tab reported'}
              </p>
              <p className="text-sm text-blue-600 truncate">
                {student.activeTabUrl || 'Waiting for activity...'}
              </p>
            </div>
          </div>
        )}

        {/* ACTIVITY LOG TAB */}
        {activeTab === 'activity' && (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Title / URL</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {logs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 text-slate-800`}>
                          {log.classification || log.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-900">{log.title || '-'}</div>
                        <div className="text-sm text-slate-500 truncate max-w-lg">{log.url || '-'}</div>
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && !isLoadingLogs && (
                    <tr>
                      <td colSpan="3" className="px-6 py-8 text-center text-slate-400">No activity recorded for this period.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REPORTS TAB */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button 
                onClick={generateReport}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center transition-colors"
              >
                <FileText className="w-4 h-4 mr-2" />
                Generate New Report
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reports.map(report => (
                <div key={report._id} className="card p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <FileText className="w-8 h-8 text-blue-500 bg-blue-50 p-1.5 rounded-lg" />
                      <span className="text-xs font-semibold text-slate-400">
                        {new Date(report.generatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 mb-1">Report: {report.date}</h3>
                    <p className="text-xs text-slate-500 mb-4 space-y-1">
                      <div className="flex justify-between"><span>Tab Switches:</span> <span className="font-semibold">{report.totalTabSwitches}</span></div>
                      <div className="flex justify-between"><span>Searches:</span> <span className="font-semibold">{report.searchCount || 0}</span></div>
                      <div className="flex justify-between"><span>Exited Browser:</span> <span className="font-semibold">{report.tabBlurs || 0}</span></div>
                      <div className="flex justify-between"><span>Copy/Paste:</span> <span className="font-semibold">{(report.copyCount || 0) + (report.pasteCount || 0)}</span></div>
                    </p>
                  </div>
                  <a 
                    href={`http://${window.location.hostname}:3000/api/admin/reports/download/${report._id}`}
                    className="w-full text-center bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-2 rounded border border-slate-200 transition-colors flex justify-center items-center text-sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </a>
                </div>
              ))}
              {reports.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-400">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No reports generated yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MANAGE TAB */}
        {activeTab === 'manage' && (
          <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Student Info Editing */}
            <div className="card p-6">
              <div className="flex items-center mb-6">
                <Settings className="w-5 h-5 text-slate-400 mr-2" />
                <h3 className="text-lg font-bold text-slate-900">Student Configuration</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="Student Name"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Administrative Notes</label>
                  <textarea 
                    value={editedNotes}
                    onChange={(e) => setEditedNotes(e.target.value)}
                    rows="5"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                    placeholder="Add notes about student performance, behavior, or other details..."
                  />
                </div>
                
                <div className="pt-2">
                  <button 
                    onClick={handleSaveStudent}
                    disabled={isSaving}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-2.5 rounded-lg flex justify-center items-center transition-all shadow-lg shadow-blue-200"
                  >
                    {isSaving ? (
                      <span className="inline-block animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full mr-2" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    {isSaving ? 'Saving Changes...' : 'Save Configuration'}
                  </button>
                </div>
              </div>
            </div>

            {/* Account Info Card */}
            <div className="card p-6 bg-slate-50 border-dashed">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Account Metadata</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-400 font-medium">Username</p>
                  <p className="text-sm font-bold text-slate-800">{student.username}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-400 font-medium">Registered Since</p>
                  <p className="text-sm font-bold text-slate-800">{new Date(student.registeredAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="card p-6 border-red-100 bg-red-50/30">
              <div className="flex items-center mb-1">
                <Trash2 className="w-5 h-5 text-red-600 mr-2" />
                <h3 className="text-lg font-bold text-red-600">Danger Zone</h3>
              </div>
              <p className="text-sm text-red-500/80 mb-6">
                Deleting this account will remove all historical activity logs, reports, and alerts permanently.
              </p>
              
              <button 
                onClick={handleDeleteStudent}
                disabled={isDeleting}
                className="bg-white hover:bg-red-50 text-red-600 border border-red-200 font-bold py-2.5 px-6 rounded-lg flex items-center transition-all"
              >
                {isDeleting ? (
                  <span className="inline-block animate-spin h-4 w-4 border-2 border-red-600/30 border-t-red-600 rounded-full mr-2" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Delete Student Account
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

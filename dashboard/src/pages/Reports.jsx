import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FileText, Download, Users, Loader2 } from 'lucide-react';
import useStudentStore from '../store/studentStore';

export default function Reports() {
  const students = useStudentStore(state => state.students);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [dateRange, setDateRange] = useState('today'); // today, yesterday, week
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!selectedStudent) {
      toast.error('Please select a student first');
      return;
    }

    setIsGenerating(true);
    try {
      let start = new Date();
      start.setHours(0,0,0,0);
      let end = new Date();
      
      if (dateRange === 'yesterday') {
        start.setDate(start.getDate() - 1);
        end = new Date(start);
        end.setHours(23,59,59,999);
      } else if (dateRange === 'week') {
        start.setDate(start.getDate() - 7);
      }

      const { data } = await axios.post(
        `http://${window.location.hostname}:3000/api/admin/students/${selectedStudent}/report`,
        { startDate: start, endDate: end },
        { withCredentials: true }
      );

      toast.success('Report generated successfully!');
      
      // Automatically trigger download
      if (data.downloadUrl) {
        window.open(`http://${window.location.hostname}:3000${data.downloadUrl}`, '_blank');
      }

    } catch (err) {
      toast.error('Failed to generate report');
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col space-y-6 pt-4">
      
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center">
          <FileText className="w-6 h-6 mr-2 text-purple-600" />
          Analytics & Reports
        </h1>
        <p className="text-sm text-slate-500 mt-1">Generate comprehensive PDF reports of student browsing activity.</p>
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-6">Generate New Report</h3>
        
        <div className="space-y-6">
          {/* Student Select */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Select Student</label>
            <div className="relative">
              <Users className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="block w-full pl-10 pr-4 py-2.5 text-base border-slate-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm border shadow-sm"
              >
                <option value="" disabled>Choose a student...</option>
                {students.map(s => (
                  <option key={s.studentId} value={s.studentId}>{s.name} ({s.studentId.substring(0,8)})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Range Select */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Time Period</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'week', label: 'Past 7 Days' }
              ].map(opt => (
                <div
                  key={opt.id}
                  onClick={() => setDateRange(opt.id)}
                  className={`border rounded-lg p-3 text-center cursor-pointer transition-colors ${
                    dateRange === opt.id 
                      ? 'bg-blue-50 border-blue-500 text-blue-700 font-semibold' 
                      : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
                  }`}
                >
                  <span className="text-sm">{opt.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-sm text-slate-500">
              PDF includes summary stats, timeline, and social media detections.
            </span>
            <button
              onClick={handleGenerate}
              disabled={!selectedStudent || isGenerating}
              className="inline-flex items-center px-6 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            >
              {isGenerating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
              ) : (
                <><Download className="w-4 h-4 mr-2" /> Generate PDF</>
              )}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}

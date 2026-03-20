import { useState, useMemo } from 'react';
import { Search, Filter, Users as UsersIcon, Plus, X, Loader2 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import useStudentStore from '../store/studentStore';
import useAlertStore from '../store/alertStore';
import StudentCard from '../components/StudentCard';

export default function Students() {
  const students = useStudentStore(state => state.students);
  const alerts = useAlertStore(state => state.alerts);
  const [filter, setFilter] = useState('ALL'); // ALL, ONLINE, OFFLINE, ALERTS
  const [search, setSearch] = useState('');

  // Add Student state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newStudent, setNewStudent] = useState({ name: '', username: '', password: '' });
  const [isCreating, setIsCreating] = useState(false);

  const filteredStudents = useMemo(() => {
    return students
      .filter(s => {
        if (filter === 'ONLINE') return s.isOnline;
        if (filter === 'OFFLINE') return !s.isOnline;
        if (filter === 'ALERTS') {
          return alerts.some(a => a.studentId === s.studentId && !a.isAcknowledged);
        }
        return true;
      })
      .filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.studentId.includes(search));
  }, [students, filter, search, alerts]);

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const { data } = await axios.post(`http://${window.location.hostname}:3000/api/admin/students`, newStudent, { withCredentials: true });
      if (data.success) {
        toast.success(`Created student ${data.name}`);
        setIsModalOpen(false);
        setNewStudent({ name: '', username: '', password: '' });
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create student');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6 relative">
      
      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center">
            <UsersIcon className="w-6 h-6 mr-2 text-blue-600" />
            Student Directory
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage and monitor {students.length} enrolled students.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Add Student Button */}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Student
          </button>

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search students..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 w-64 shadow-sm"
            />
          </div>

          {/* Filter */}
          <div className="bg-white border border-slate-200 rounded-lg p-1 shadow-sm flex items-center">
            {['ALL', 'ONLINE', 'OFFLINE', 'ALERTS'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  filter === f 
                    ? 'bg-slate-100 text-slate-800 shadow-sm border border-slate-200/50' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                {f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto pb-6">
        {filteredStudents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredStudents.map(student => (
              <StudentCard key={student.studentId} student={student} />
            ))}
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 mt-4">
            <Filter className="w-12 h-12 mb-3 text-slate-300" />
            <p className="font-medium text-slate-600">No students match your criteria.</p>
            <button 
              onClick={() => { setFilter('ALL'); setSearch(''); }}
              className="mt-3 text-sm text-blue-600 hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Add Student Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">Create Student Account</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateStudent} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newStudent.name}
                  onChange={e => setNewStudent({...newStudent, name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Jane Doe"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={newStudent.username}
                  onChange={e => setNewStudent({...newStudent, username: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="jane.doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={newStudent.password}
                  onChange={e => setNewStudent({...newStudent, password: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}


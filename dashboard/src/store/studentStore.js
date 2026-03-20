import { create } from 'zustand';

const useStudentStore = create((set) => ({
  students: [],
  onlineCount: 0,
  activityFeed: [], // Last 50 events
  
  setStudents: (students) => set({ 
    students,
    onlineCount: students.filter(s => s.isOnline).length
  }),
  
  updateStudentStatus: (studentId, isOnline) => set((state) => {
    const newStudents = state.students.map(s => 
      s.studentId === studentId 
        ? { ...s, isOnline, lastSeen: new Date().toISOString() } 
        : s
    );
    return {
      students: newStudents,
      onlineCount: newStudents.filter(s => s.isOnline).length
    };
  }),

  addActivity: (activity) => set((state) => {
    const newFeed = [activity, ...state.activityFeed].slice(0, 50);
    return { activityFeed: newFeed };
  }),

  updateStudentFromStatus: (studentId, statusData) => set((state) => {
    const newStudents = state.students.map(s => {
      if (s.studentId === studentId) {
        return {
          ...s,
          isOnline: true,
          lastSeen: statusData.timestamp,
          activeTabUrl: statusData.activeTabUrl,
          activeTabTitle: statusData.activeTabTitle,
          idleState: statusData.idleState
        };
      }
      return s;
    });
    return { students: newStudents };
  }),

  updateStudentData: (studentId, updatedData) => set((state) => {
    const newStudents = state.students.map(s => 
      s.studentId === studentId ? { ...s, ...updatedData } : s
    );
    return { students: newStudents };
  }),

  removeStudent: (studentId) => set((state) => {
    const newStudents = state.students.filter(s => s.studentId !== studentId);
    return { 
      students: newStudents,
      onlineCount: newStudents.filter(s => s.isOnline).length
    };
  })
}));

export default useStudentStore;

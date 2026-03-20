import { create } from 'zustand';

const useAlertStore = create((set) => ({
  alerts: [],
  unacknowledgedCount: 0,
  
  setAlerts: (alerts) => set({ 
    alerts,
    unacknowledgedCount: alerts.filter(a => !a.isAcknowledged).length
  }),
  
  addAlert: (alert) => set((state) => {
    // Prevent duplicate adds if already in store
    if (state.alerts.some(a => a._id === alert._id)) return state;

    const newAlerts = [alert, ...state.alerts];
    return {
      alerts: newAlerts,
      unacknowledgedCount: newAlerts.filter(a => !a.isAcknowledged).length
    };
  }),
  
  acknowledgeAlert: (alertId, adminEmail) => set((state) => {
    const newAlerts = state.alerts.map(a => 
      a._id === alertId 
        ? { ...a, isAcknowledged: true, acknowledgedBy: adminEmail } 
        : a
    );
    return {
      alerts: newAlerts,
      unacknowledgedCount: newAlerts.filter(a => !a.isAcknowledged).length
    };
  }),

  acknowledgeAll: (studentId = null, adminEmail) => set((state) => {
    const newAlerts = state.alerts.map(a => {
      if (!a.isAcknowledged && (!studentId || a.studentId === studentId)) {
        return { ...a, isAcknowledged: true, acknowledgedBy: adminEmail };
      }
      return a;
    });
    return {
      alerts: newAlerts,
      unacknowledgedCount: newAlerts.filter(a => !a.isAcknowledged).length
    };
  })
}));

export default useAlertStore;

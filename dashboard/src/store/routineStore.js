import { create } from 'zustand';

const useRoutineStore = create((set, get) => ({
  events: [],
  loading: false,
  error: null,

  setEvents: (events) => set({ events, loading: false, error: null }),

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),

  addEvent: (event) => set((state) => ({
    events: [...state.events, event]
  })),

  updateEvent: (id, updatedData) => set((state) => ({
    events: state.events.map(e => e._id === id ? { ...e, ...updatedData } : e)
  })),

  removeEvent: (id) => set((state) => ({
    events: state.events.filter(e => e._id !== id)
  })),

  // Computed helpers
  getEventsForDay: (day) => get().events.filter(e => e.day === day),

  getStats: () => {
    const events = get().events;
    const totalEvents = events.length;
    const totalHours = events.reduce((sum, e) => sum + (e.endH - e.startH), 0);
    const counts = Array(7).fill(0);
    events.forEach(e => counts[e.day]++);
    const maxIdx = counts.indexOf(Math.max(...counts));
    const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const busiestDay = totalEvents > 0 ? DAYS_SHORT[maxIdx] : '—';
    return { totalEvents, totalHours, busiestDay };
  }
}));

export default useRoutineStore;

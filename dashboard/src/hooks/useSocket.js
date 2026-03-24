import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import useStudentStore from '../store/studentStore';
import useAlertStore from '../store/alertStore';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || `http://${window.location.hostname}:3000`;

let globalSocket = null;
let socketInitialized = false;

function createSocket(handlers, onReady) {
  if (globalSocket) {
    onReady(globalSocket);
    if (globalSocket.connected) return;
  }

  globalSocket = io(SERVER_URL, {
    query: { role: 'admin' },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity
  });

  globalSocket.on('connect', () => {
    console.log('[Socket] Connected to server');
    onReady(globalSocket);
  });

  globalSocket.on('STUDENT_ONLINE', (data) => {
    handlers.updateStudentStatus(data.studentId, true);
    toast.success(`Student ${data.studentId} is online`, { icon: '🟢', position: 'bottom-right' });
  });

  globalSocket.on('STUDENT_OFFLINE', (data) => {
    handlers.updateStudentStatus(data.studentId, false);
    toast('Student went offline', { icon: '⚪', position: 'bottom-right' });
  });

  globalSocket.on('STUDENT_STATUS', (data) => {
    handlers.updateStudentFromStatus(data.studentId, data);
  });

  globalSocket.on('TAB_ACTIVITY', (data) => {
    handlers.addActivity(data);
  });

  globalSocket.on('HISTORY_SNAPSHOT', (data) => {
    handlers.addActivity(data);
  });

  globalSocket.on('SOCIAL_MEDIA_ALERT', (data) => {
    if (data.alert) {
      handlers.addAlert(data.alert);
      toast.error(`Social Media Detected: ${new URL(data.alert.url).hostname}`, {
        duration: 5000,
        position: 'top-right'
      });

      const audio = new Audio('/alert.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    }
  });

  globalSocket.on('disconnect', () => {
    console.log('[Socket] Disconnected');
  });

  globalSocket.on('error', (err) => {
    console.error('[Socket] Error:', err);
  });
}

export function useSocket() {
  const updateStudentStatus = useStudentStore(state => state.updateStudentStatus);
  const addActivity = useStudentStore(state => state.addActivity);
  const updateStudentFromStatus = useStudentStore(state => state.updateStudentFromStatus);
  const addAlert = useAlertStore(state => state.addAlert);
  const [socketInstance, setSocketInstance] = useState(globalSocket);

  const handlersRef = useRef({ updateStudentStatus, addActivity, updateStudentFromStatus, addAlert });

  useEffect(() => {
    handlersRef.current = { updateStudentStatus, addActivity, updateStudentFromStatus, addAlert };

    if (!socketInitialized) {
      socketInitialized = true;
      createSocket(handlersRef.current, setSocketInstance);
    } else if (globalSocket) {
      setSocketInstance(globalSocket);
    }

    return () => {};
  }, [updateStudentStatus, addActivity, updateStudentFromStatus, addAlert]);

  return socketInstance;
}

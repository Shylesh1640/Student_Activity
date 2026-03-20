import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const STUN_SERVER = 'stun:stun.l.google.com:19302';

export function useWebRTC(studentId, socket, targetMode) {
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isCameraSharing, setIsCameraSharing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastFrame, setLastFrame] = useState(null);
  const [error, setError] = useState(null);
  
  const peerConnectionRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const currentModeRef = useRef(targetMode); // 'SCREEN' or 'CAMERA'

  const cleanup = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    setIsScreenSharing(false);
    setIsCameraSharing(false);
    setIsConnecting(false);
    setLastFrame(null);
  }, []);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: STUN_SERVER }] });
    peerConnectionRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate && socket && socket.connected) {
        socket.emit('ADMIN_MESSAGE', {
          type: 'WEBRTC_ICE_CANDIDATE',
          studentId,
          candidate: event.candidate.toJSON()
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('[RTC] Received remote track', event.track.kind);
      if (remoteVideoRef.current) {
        const stream = event.streams && event.streams[0] ? event.streams[0] : new MediaStream([event.track]);
        remoteVideoRef.current.srcObject = stream;
        remoteVideoRef.current.play().catch(console.error);
        
        setIsConnecting(false);
        if (currentModeRef.current === 'SCREEN') setIsScreenSharing(true);
        if (currentModeRef.current === 'CAMERA') setIsCameraSharing(true);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[RTC] ICE connection state:', pc.iceConnectionState);
      if (['disconnected', 'failed', 'closed'].includes(pc.iceConnectionState)) {
        // We don't cleanup immediately because we might have Socket.io frames
        console.log('[RTC] WebRTC disconnected, continuing with frames if available');
      }
    };
  }, [socket, studentId]);

  // Handle incoming signaling messages and frames
  useEffect(() => {
    if (!socket) return;

    const onAdminMessage = async (data) => {
      if (data.studentId !== studentId) return;

      if (data.type === 'WEBRTC_OFFER') {
        console.log('[RTC] Received WebRTC Offer');
        try {
          if (!peerConnectionRef.current) return;
          
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);
          
          socket.emit('ADMIN_MESSAGE', {
            type: 'WEBRTC_ANSWER',
            studentId,
            answer: peerConnectionRef.current.localDescription.toJSON()
          });
        } catch (err) {
          console.error('[RTC] WebRTC handle offer error:', err);
        }
      } else if (data.type === 'WEBRTC_ICE_CANDIDATE') {
        if (peerConnectionRef.current && data.candidate) {
          peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate))
            .catch(e => console.error('[RTC] Add ICE error', e));
        }
      }
    };

    const onStreamFrame = (data) => {
      if (data.studentId !== studentId) return;
      if (data.mode !== targetMode) return;
      
      setLastFrame(data.frame);
      setIsConnecting(false);
      
      // Automatically detect and show active stream
      if (data.mode === 'SCREEN') setIsScreenSharing(true);
      if (data.mode === 'CAMERA') setIsCameraSharing(true);
    };

    // Join the student watch room to receive frames
    socket.emit('JOIN_STUDENT_WATCH', { studentId });

    socket.on('SERVER_MESSAGE', onAdminMessage);
    socket.on('STREAM_FRAME', onStreamFrame);

    return () => {
      socket.emit('LEAVE_STUDENT_WATCH', { studentId });
      socket.off('SERVER_MESSAGE', onAdminMessage);
      socket.off('STREAM_FRAME', onStreamFrame);
    };
  }, [studentId, socket, targetMode]);

  const sendCommand = async (command) => {
    try {
      await axios.post(`http://${window.location.hostname}:3000/api/admin/command`, {
        studentId,
        command
      }, { withCredentials: true });
    } catch {
      toast.error('Failed to send command');
      cleanup();
    }
  };

  const requestScreen = async () => {
    cleanup();
    setIsConnecting(true);
    currentModeRef.current = 'SCREEN';
    createPeerConnection();
    await sendCommand('REQUEST_SCREEN');
  };

  const requestCamera = async () => {
    cleanup();
    setIsConnecting(true);
    currentModeRef.current = 'CAMERA';
    createPeerConnection();
    await sendCommand('REQUEST_CAMERA');
  };

  const stopStream = async () => {
    await sendCommand('STOP_STREAM');
    cleanup();
  };

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return {
    remoteVideoRef,
    isScreenSharing,
    isCameraSharing,
    isConnecting,
    lastFrame,
    error,
    requestScreen,
    requestCamera,
    stopStream
  };
}

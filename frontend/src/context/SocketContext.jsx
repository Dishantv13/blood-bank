import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user, adminUser, bloodBank } = useAuth();

  // Determine if the user is logged in at all
  const currentUser = user || adminUser || bloodBank;

  const connectSocket = useCallback(() => {
    // Get Base URL from environment (Extract host only for Socket.io)
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
    
    // Robust URL parsing: Strip everything after the host/port
    const socketUrl = apiUrl.split('/api')[0]; 


  
    const newSocket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
      retryAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    // Connection Event Handlers
    newSocket.on('connect', () => {
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('⚠️ Real-time: Disconnected -', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.error('❌ Real-time: Connection Error -', err.message);
      // If auth fails repeatedly, it might mean the session is expired
      if (err.message.includes('Authentication error')) {
        newSocket.disconnect();
      }
    });

    // Global Notification Listener (Production Grade)
    newSocket.on('notification', (data) => {
      // Show a professional toast for all incoming real-time notifications
      toast.info(data.message || 'New notification received', {
        position: 'top-right',
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: 'colored',
        icon: '🔔'
      });
    });

    setSocket(newSocket);
    return newSocket;
  }, []);

  const socketRef = useRef(null);

  useEffect(() => {
    // 1. If user is logged out, ensure we are disconnected
    if (!currentUser) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // 2. If already connected, don't start a duplicate connection
    if (socketRef.current?.connected) {
      return;
    }

    // 3. Connect (Singleton pattern)
    const activeSocket = connectSocket();
    socketRef.current = activeSocket;

    // Cleanup: Disconnect when component unmounts
    return () => {
      // Note: We don't disconnect on every re-render anymore, 
      // only if the user actually changes or the provider unmounts.
    };
  }, [currentUser, connectSocket]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

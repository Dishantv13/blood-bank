import React, { useState, useEffect } from 'react';
import { useGetNotificationsQuery, useMarkAsReadMutation, useMarkAllAsReadMutation, useDeleteNotificationMutation } from '../store/notificationApi';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import EmptyState from './EmptyState';

const NotificationCenter = ({ isOpen, onClose }) => {
  const { isAuthenticated } = useAuth();
  const { data: notificationsRes, isLoading, refetch } = useGetNotificationsQuery(undefined, {
    skip: !isAuthenticated,
    pollingInterval: 30000 // Fallback polling
  });
  
  const [markAsRead] = useMarkAsReadMutation();
  const [markAllAsRead] = useMarkAllAsReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();

  const notifications = notificationsRes?.data || [];

  // SSE setup
  useEffect(() => {
    if (!isAuthenticated) return;

    const streamUrl = `/api/notifications/stream`;
    const eventSource = new EventSource(streamUrl, { withCredentials: true });

    eventSource.addEventListener('notification', (event) => {
      const newNotification = JSON.parse(event.data);
      console.log('New notification received:', newNotification);
      refetch(); // Use RTK Query refetch to update list
    });

    eventSource.onerror = (err) => {
      console.error('SSE connection error:', err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [isAuthenticated, refetch]);

  if (!isOpen) return null;

  return (
    <>
      <div className="notification-overlay" onClick={onClose}></div>
      <div className={`notification-drawer ${isOpen ? 'open' : ''}`}>
        <div className="notification-drawer-header">
          <div className="header-title">
            <h3>Notifications</h3>
            {notifications.length > 0 && (
              <span className="count-badge">{notifications.filter(n => !n.isRead).length} Unread</span>
            )}
          </div>
          <div className="header-actions">
            {notifications.some(n => !n.isRead) && (
              <button className="text-btn" onClick={() => markAllAsRead()}>Mark all as read</button>
            )}
            <button className="close-btn" onClick={onClose}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        <div className="notification-drawer-content">
          {isLoading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <EmptyState 
              title="No notifications yet" 
              description="Stay tuned! We'll notify you about blood requests, event updates, and more."
              variant="list"
            />
          ) : (
            <div className="notification-items">
              {notifications.map((notif) => (
                <div 
                  key={notif._id} 
                  className={`notification-card ${notif.isRead ? 'read' : 'unread'}`}
                  onClick={() => !notif.isRead && markAsRead(notif._id)}
                >
                  <div className={`type-indicator ${notif.type}`}></div>
                  <div className="card-body">
                    <div className="card-header">
                      <span className="notif-title">{notif.title}</span>
                      <span className="notif-time">{new Date(notif.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="notif-message">{notif.message}</p>
                    {notif.actionUrl && (
                      <Link to={notif.actionUrl} className="action-link" onClick={onClose}>
                        View Details
                      </Link>
                    )}
                  </div>
                  <button 
                    className="delete-btn" 
                    onClick={(e) => { e.stopPropagation(); deleteNotification(notif._id); }}
                    title="Delete notification"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .notification-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          z-index: 2000;
          animation: fadeIn 0.3s ease;
        }

        .notification-drawer {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: 400px;
          background: var(--card-bg);
          box-shadow: -10px 0 30px rgba(0, 0, 0, 0.2);
          z-index: 2001;
          display: flex;
          flex-direction: column;
          animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @media (max-width: 450px) {
          .notification-drawer { width: 100%; }
        }

        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }

        .notification-drawer-header {
          padding: 24px;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .header-title h3 { margin: 0; font-size: 1.25rem; font-weight: 700; color: var(--text-main); }
        .count-badge { font-size: 0.75rem; background: #ef4444; color: white; padding: 2px 8px; border-radius: 20px; margin-top: 4px; display: inline-block; }

        .header-actions { display: flex; align-items: center; gap: 12px; }
        .text-btn { background: none; border: none; color: #3b82f6; font-size: 0.85rem; font-weight: 600; cursor: pointer; padding: 0; }
        .text-btn:hover { text-decoration: underline; }
        .close-btn { background: var(--input-bg); border: none; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-secondary); transition: all 0.2s; }
        .close-btn:hover { background: #fee2e2; color: #ef4444; }

        .notification-drawer-content { flex: 1; overflow-y: auto; padding: 16px; }

        .notification-items { display: flex; flex-direction: column; gap: 12px; }

        .notification-card {
          padding: 16px;
          background: var(--input-bg);
          border-radius: 12px;
          position: relative;
          display: flex;
          gap: 12px;
          transition: all 0.2s ease;
          cursor: pointer;
          border: 1px solid transparent;
        }

        .notification-card:hover { transform: translateY(-2px); border-color: var(--border-color); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .notification-card.unread { background: var(--card-bg); border-color: #3b82f644; }
        .notification-card.unread::before { content: ''; position: absolute; top: 12px; right: 12px; width: 8px; height: 8px; background: #3b82f6; border-radius: 50%; }

        .type-indicator { width: 4px; height: 40px; border-radius: 4px; flex-shrink: 0; }
        .type-indicator.request { background: #ef4444; }
        .type-indicator.donation { background: #10b981; }
        .type-indicator.event { background: #f59e0b; }
        .type-indicator.system { background: #6b7280; }

        .card-body { flex: 1; min-width: 0; }
        .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; }
        .notif-title { font-weight: 700; font-size: 0.95rem; color: var(--text-main); }
        .notif-time { font-size: 0.75rem; color: var(--text-secondary); white-space: nowrap; }
        .notif-message { font-size: 0.85rem; color: var(--text-secondary); margin: 0; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        
        .action-link { display: inline-block; margin-top: 8px; font-size: 0.85rem; font-weight: 600; color: #3b82f6; text-decoration: none; }
        .action-link:hover { text-decoration: underline; }

        .delete-btn { position: absolute; bottom: 8px; right: 8px; border: none; background: none; color: #9ca3af; cursor: pointer; padding: 4px; border-radius: 4px; opacity: 0; transition: opacity 0.2s; }
        .notification-card:hover .delete-btn { opacity: 1; }
        .delete-btn:hover { background: #fee2e2; color: #ef4444; }

        .loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-secondary); }
        .spinner { width: 30px; height: 30px; border: 3px solid var(--border-color); border-top-color: #ef4444; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 12px; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
};

export default NotificationCenter;

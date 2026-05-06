import React, { useState, useEffect, useRef } from "react";
import { useSocket } from "../context/SocketContext";
import { useAuth } from "../context/AuthContext";
import {
  useGetChatHistoryQuery,
  useMarkChatAsReadMutation,
} from "../store/chatApi";
import "../components.css/ChatWindow.css";

const ChatWindow = ({ requestId, recipientId, recipientModel = "User" }) => {
  const [message, setMessage] = useState("");
  const [localMessages, setLocalMessages] = useState([]);
  const { socket, isConnected } = useSocket();
  const { user, bloodBank } = useAuth();
  const messagesEndRef = useRef(null);

  const currentUserId = user?._id || bloodBank?._id;

  // Fetch history
  const { data: history, isLoading } = useGetChatHistoryQuery(requestId);
  const [markAsRead] = useMarkChatAsReadMutation();

  // Initialize local messages with history
  useEffect(() => {
    if (history?.data) {
      setLocalMessages(history.data);
    }
  }, [history]);

  // Handle incoming messages via Socket
  useEffect(() => {
    if (!socket) return;

    // Join the chat room
    socket.emit("chat:join", { requestId });

    const handleReceiveMessage = (newMessage) => {
      if (newMessage.requestId === requestId) {
        setLocalMessages((prev) => [...prev, newMessage]);
        // Auto mark as read if user is the recipient
        if (newMessage.recipient === currentUserId) {
          markAsRead(requestId);
        }
      }
    };

    socket.on("chat:receive", handleReceiveMessage);

    return () => {
      socket.off("chat:receive", handleReceiveMessage);
      socket.emit("chat:leave", { requestId });
    };
  }, [socket, requestId, currentUserId, markAsRead]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim() || !socket) return;

    const payload = {
      requestId,
      recipientId,
      recipientModel,
      message: message.trim(),
    };

    socket.emit("chat:message", payload);
    setMessage("");
  };

  if (isLoading)
    return (
      <div className="chat-container loading">Loading conversation...</div>
    );

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h3>
          <span>💬</span> Live Chat
        </h3>
        <div className="connection-status">
          <span
            className={`status-dot ${isConnected ? "status-online" : "status-offline"}`}
          ></span>
          {isConnected ? "Online" : "Connecting..."}
        </div>
      </div>

      <div className="chat-messages">
        {localMessages.length === 0 ? (
          <div className="empty-chat">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          localMessages.map((msg, index) => {
            const isMe =
              msg.sender === currentUserId || msg.sender?._id === currentUserId;
            return (
              <div
                key={msg._id || index}
                className={`message-bubble ${isMe ? "message-sent" : "message-received"}`}
              >
                <div className="message-text">{msg.message}</div>
                <div className="message-info">
                  {!isMe && (
                    <span className="message-sender">
                      {msg.sender?.name || "User"}
                    </span>
                  )}
                  <span className="message-time">
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <form onSubmit={handleSendMessage} className="chat-form">
          <input
            type="text"
            className="chat-input"
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={!isConnected}
          />
          <button
            type="submit"
            className="send-button"
            disabled={!message.trim() || !isConnected}
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;

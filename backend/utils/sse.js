import { getRedisClient, getRedisSubClient } from '../config/redis.js';

const clients = new Map(); // userId -> response object
const SSE_CHANNEL = 'bloodbank:sse_events';

// Initializes Redis Pub/Sub listener for cross-instance notifications.
const initPubSub = async () => {
  const sub = await getRedisSubClient();
  if (!sub) return;

  try {
    await sub.subscribe(SSE_CHANNEL, (message) => {
      try {
        const { target, eventName, data } = JSON.parse(message);
        
        if (target === 'broadcast') {
          clients.forEach((res) => {
            res.write(`event: ${eventName}\n`);
            res.write(`data: ${JSON.stringify(data)}\n\n`);
          });
        } else if (target) {
          const res = clients.get(target.toString());
          if (res) {
            res.write(`event: ${eventName}\n`);
            res.write(`data: ${JSON.stringify(data)}\n\n`);
          }
        }
      } catch (err) {
        console.error('[SSE] PubSub message error:', err.message);
      }
    });
    console.log(`[SSE] Subscribed to Redis channel: ${SSE_CHANNEL}`);
  } catch (err) {
    console.error('[SSE] Failed to subscribe to Redis:', err.message);
  }
};

// Start the listener
initPubSub().catch(err => console.error('[SSE] PubSub init failed:', err));

export const registerClient = (userId, res) => {
  if (!userId) return;
  
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*' // Usually handled by CORS middleware but safe to keep here
  });

  const keepAlive = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30000);

  const clientId = userId.toString();
  clients.set(clientId, res);
  
  console.log(`SSE Client connected: ${clientId} (Total: ${clients.size})`);

  res.on('close', () => {
    clearInterval(keepAlive);
    clients.delete(clientId);
    console.log(`SSE Client disconnected: ${clientId}`);
  });
};

// Sends an event to a specific user across all server instances via Redis.
export const sendLiveEvent = async (userId, eventName, data) => {
  if (!userId) return false;
  
  try {
    const redis = await getRedisClient();
    if (!redis) {
        // Fallback to local if Redis is down
        const res = clients.get(userId.toString());
        if (res) {
            res.write(`event: ${eventName}\n`);
            res.write(`data: ${JSON.stringify(data)}\n\n`);
            return true;
        }
        return false;
    }

    await redis.publish(SSE_CHANNEL, JSON.stringify({
      target: userId.toString(),
      eventName,
      data
    }));
    return true;
  } catch (err) {
    console.error('[SSE] Notification publish failed:', err.message);
    return false;
  }
};

// Broadcasts an event to ALL connected users across ALL instances.
export const broadcastEvent = async (eventName, data) => {
  try {
    const redis = await getRedisClient();
    if (!redis) {
       clients.forEach((res) => {
         res.write(`event: ${eventName}\n`);
         res.write(`data: ${JSON.stringify(data)}\n\n`);
       });
       return;
    }

    await redis.publish(SSE_CHANNEL, JSON.stringify({
      target: 'broadcast',
      eventName,
      data
    }));
  } catch (err) {
    console.error('[SSE] Broadcast publish failed:', err.message);
  }
};

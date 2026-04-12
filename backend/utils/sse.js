const clients = new Map(); // userId -> response object

export const registerClient = (userId, res) => {
  if (!userId) return;
  
  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  // Keep connection alive with a heartbeat every 30 seconds
  const keepAlive = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30000);

  // Store client connection
  clients.set(userId.toString(), res);
  
  console.log(`SSE Client connected: ${userId}`);

  // Clean up on disconnect
  res.on('close', () => {
    clearInterval(keepAlive);
    clients.delete(userId.toString());
    console.log(`SSE Client disconnected: ${userId}`);
  });
};

export const sendLiveEvent = (userId, eventName, data) => {
  if (!userId) return;
  
  const client = clients.get(userId.toString());
  if (client) {
    client.write(`event: ${eventName}\n`);
    client.write(`data: ${JSON.stringify(data)}\n\n`);
    return true;
  }
  return false;
};

export const broadcastEvent = (eventName, data) => {
  clients.forEach((client, userId) => {
    client.write(`event: ${eventName}\n`);
    client.write(`data: ${JSON.stringify(data)}\n\n`);
  });
};

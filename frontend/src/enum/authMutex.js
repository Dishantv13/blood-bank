const refreshPromises = new Map();
export const withRefreshMutex = async (role, refreshFn) => {
  const existingPromise = refreshPromises.get(role);
  if (existingPromise) {
    return existingPromise;
  }

  const refreshPromise = (async () => {
    try {
      return await refreshFn();
    } finally {
      if (refreshPromises.get(role) === refreshPromise) {
        refreshPromises.delete(role);
      }
    }
  })();

  refreshPromises.set(role, refreshPromise);
  return refreshPromise;
};

const authChannel =
  typeof window !== "undefined"
    ? new BroadcastChannel("blood_bank_auth_sync")
    : null;

export const syncAuthAction = (role, action, data = null) => {
  if (authChannel) {
    authChannel.postMessage({ role, action, data });
  }
};

export const onAuthSync = (handler) => {
  if (authChannel) {
    authChannel.onmessage = (event) => handler(event.data);
  }
};

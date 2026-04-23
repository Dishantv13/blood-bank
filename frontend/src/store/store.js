import { configureStore } from '@reduxjs/toolkit';
import { apiSlice } from './apiSlice';

export const store = configureStore({
  reducer: {
    [apiSlice.reducerPath]: apiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'api/executeMutation/fulfilled', 
          'api/executeQuery/fulfilled',
          'api/executeMutation/rejected'
        ],
        ignoredActionPaths: [
          'meta.arg', 
          'payload', 
          'meta.baseQueryMeta.request',
          'meta.baseQueryMeta.response'
        ],
        ignoredPaths: [
          `${apiSlice.reducerPath}.mutations`,
          `${apiSlice.reducerPath}.queries`
        ],
      },
    }).concat(apiSlice.middleware),
});

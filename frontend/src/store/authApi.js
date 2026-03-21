import { apiSlice } from './apiSlice';
import { AUTH_API_URLS } from '../enum/apiUrl';

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({
        url: AUTH_API_URLS.LOGIN,
        method: 'POST',
        body: credentials,
      }),
    }),
    register: builder.mutation({
      query: (userData) => ({
        url: AUTH_API_URLS.REGISTER,
        method: 'POST',
        body: userData,
      }),
    }),
    googleLogin: builder.mutation({
      query: (googleData) => ({
        url: AUTH_API_URLS.GOOGLE_LOGIN,
        method: 'POST',
        body: googleData,
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGoogleLoginMutation,
} = authApi;

import { apiSlice } from './apiSlice';
import { AUTH_API_URLS } from '../enum/apiUrl';

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    adminLogin: builder.mutation({
      query: (credentials) => ({
        url: AUTH_API_URLS.ADMIN_LOGIN,
        method: 'POST',
        body: credentials,
      }),
    }),
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
    logout: builder.mutation({
      query: () => ({
        url: AUTH_API_URLS.LOGOUT,
        method: 'POST',
      }),
    }),
    adminLogout: builder.mutation({
      query: () => ({
        url: AUTH_API_URLS.ADMIN_LOGOUT,
        method: 'POST',
      }),
    }),
    getUserSession: builder.query({
      async queryFn(_arg, _api, _extraOptions, baseQuery) {
        const currentPath = typeof window !== 'undefined'
          ? window.location.pathname.toLowerCase()
          : '';
        const isNonUserRoute =
          currentPath.startsWith('/admin') ||
          currentPath.startsWith('/blood-bank') ||
          currentPath.startsWith('/bloodbank');

        if (isNonUserRoute) {
          return { data: null };
        }

        return baseQuery(AUTH_API_URLS.SESSION);
      },
    }),
    getAdminSession: builder.query({
      async queryFn(_arg, _api, _extraOptions, baseQuery) {
        const currentPath = typeof window !== 'undefined'
          ? window.location.pathname.toLowerCase()
          : '';
        if (!currentPath.startsWith('/admin')) {
          return { data: null };
        }

        return baseQuery(AUTH_API_URLS.ADMIN_SESSION);
      },
    }),
    getUserCsrfToken: builder.query({
      query: () => AUTH_API_URLS.CSRF_TOKEN,
    }),
    getAdminCsrfToken: builder.query({
      query: () => AUTH_API_URLS.ADMIN_CSRF_TOKEN,
    }),
  }),
  overrideExisting: false,
});

export const {
  useAdminLoginMutation,
  useLoginMutation,
  useRegisterMutation,
  useGoogleLoginMutation,
  useLogoutMutation,
  useAdminLogoutMutation,
  useLazyGetUserSessionQuery,
  useLazyGetAdminSessionQuery,
  useLazyGetUserCsrfTokenQuery,
  useLazyGetAdminCsrfTokenQuery,
} = authApi;

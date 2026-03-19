import { apiSlice } from './apiSlice';
import { TAGS, tagById, tagList, tagListWithIds } from './tagType';

export const userApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getProfile: builder.query({
      query: () => '/users/profile',
      providesTags: tagList(TAGS.USER),
    }),
    
    updateProfile: builder.mutation({
      query: (data) => ({
        url: '/users/profile',
        method: 'PUT',
        body: data,
      }),
      // Invalidating USER tag triggers a refetch of getProfile
      invalidatesTags: tagList(TAGS.USER),
    }),
    
    updateDonorInfo: builder.mutation({
      query: (data) => ({
        url: '/users/donor-info',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: tagList(TAGS.USER), // forces dashboard to re-verify profile/donor completion
    }),
    
    getDonors: builder.query({
      query: (params) => ({
        url: '/users/donors',
        params,
      }),
      providesTags: (result) => tagListWithIds(TAGS.USER, result?.data),
    }),
    
    toggleMode: builder.mutation({
      query: (modeOrObj) => ({
        url: '/users/toggle-mode',
        method: 'PUT',
        body: typeof modeOrObj === 'string' ? { mode: modeOrObj } : modeOrObj,
      }),
      invalidatesTags: tagList(TAGS.USER), // trigger refetches that depend on active mode
    }),
    
    getDashboardStats: builder.query({
      query: () => '/users/dashboard/stats',
      providesTags: tagList(TAGS.USER),
    }),
    
    forgotPassword: builder.mutation({
      query: (data) => ({
        url: '/api/auth/forgot-password',
        method: 'POST',
        body: data,
      }),
    }),
    resetPassword: builder.mutation({
      query: ({ token, ...data }) => ({
        url: `/api/auth/reset-password/${token}`,
        method: 'POST',
        body: data,
      }),
    }),
    verifyResetToken: builder.mutation({
      query: (token) => ({
        url: '/api/auth/verify-reset-token',
        method: 'POST',
        body: { token },
      }),
    }),
    changeUserPassword: builder.mutation({
      query: (data) => ({
        url: '/api/auth/change-password',
        method: 'POST',
        body: data,
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetProfileQuery,
  useUpdateProfileMutation,
  useUpdateDonorInfoMutation,
  useGetDonorsQuery,
  useToggleModeMutation,
  useGetDashboardStatsQuery,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useVerifyResetTokenMutation,
  useChangeUserPasswordMutation,
} = userApi;

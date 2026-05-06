import { apiSlice } from "./apiSlice";
import { TAGS, tagList, tagListWithIds } from "../enum/tagType";
import { USER_API_URLS } from "../enum/apiUrl";

export const userApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getProfile: builder.query({
      query: () => USER_API_URLS.GET_PROFILE,
      providesTags: tagList(TAGS.USER),
    }),

    updateProfile: builder.mutation({
      query: (data) => ({
        url: USER_API_URLS.UPDATE_PROFILE,
        method: "PUT",
        body: data,
      }),
      // Invalidating USER tag triggers a refetch of getProfile
      invalidatesTags: tagList(TAGS.USER),
    }),

    updateDonorInfo: builder.mutation({
      query: (data) => ({
        url: USER_API_URLS.UPDATE_DONOR_INFO,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: tagList(TAGS.USER),
    }),

    getDonors: builder.query({
      query: (params) => ({
        url: USER_API_URLS.GET_DONORS,
        params,
      }),
      providesTags: (result) => tagListWithIds(TAGS.USER, result?.data),
    }),

    toggleMode: builder.mutation({
      query: (modeOrObj) => ({
        url: USER_API_URLS.TOGGLE_MODE,
        method: "PUT",
        body: typeof modeOrObj === "string" ? { mode: modeOrObj } : modeOrObj,
      }),
      invalidatesTags: tagList(TAGS.USER), // trigger refetches that depend on active mode
    }),

    getDashboardStats: builder.query({
      query: () => USER_API_URLS.GET_DASHBOARD_STATS,
      providesTags: tagList(TAGS.USER),
    }),

    forgotPassword: builder.mutation({
      query: (data) => ({
        url: USER_API_URLS.FORGOT_PASSWORD,
        method: "POST",
        body: data,
      }),
    }),
    resetPassword: builder.mutation({
      query: ({ token, ...data }) => ({
        url: USER_API_URLS.RESET_PASSWORD(token),
        method: "POST",
        body: data,
      }),
    }),
    verifyResetToken: builder.mutation({
      query: (token) => ({
        url: USER_API_URLS.VERIFY_RESET_TOKEN,
        method: "POST",
        body: { token },
      }),
    }),
    changeUserPassword: builder.mutation({
      query: (data) => ({
        url: USER_API_URLS.CHANGE_PASSWORD,
        method: "POST",
        body: data,
      }),
    }),
    uploadPhoto: builder.mutation({
      query: (data) => ({
        url: USER_API_URLS.UPLOAD_PHOTO,
        method: "POST",
        body: data,
      }),
      invalidatesTags: tagList(TAGS.USER),
    }),
    verifyAadhar: builder.mutation({
      query: (data) => ({
        url: USER_API_URLS.VERIFY_AADHAAR,
        method: "POST",
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
  useUploadPhotoMutation,
  useVerifyAadharMutation,
} = userApi;

import { apiSlice } from './apiSlice';
import { TAGS, tagById, tagList, tagListWithIds } from './tagType';

export const bloodBankApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Public/User facing endpoints
    getAllBloodBanks: builder.query({
      query: (params) => ({
        url: '/bloodbanks',
        params,
      }),
      providesTags: (result) => tagListWithIds(TAGS.BLOOD_BANK, result?.data),
    }),
    getBloodBankById: builder.query({
      query: (id) => `/bloodbanks/${id}`,
      providesTags: (result, error, id) => tagById(TAGS.BLOOD_BANK, id),
    }),
    createBloodBank: builder.mutation({
      query: (data) => ({
        url: '/bloodbanks',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: tagList(TAGS.BLOOD_BANK),
    }),

    // Blood Bank Portal specific endpoints
    loginBloodBank: builder.mutation({
      query: (credentials) => ({
        url: '/blood-banks/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    registerBloodBank: builder.mutation({
      query: (data) => ({
        url: '/blood-banks/register',
        method: 'POST',
        body: data,
      }),
    }),
    getBloodBankDashboard: builder.query({
      query: () => '/bloodbank/dashboard',
      providesTags: tagList(TAGS.DASHBOARD),
    }),
    getBloodBankProfile: builder.query({
      query: () => '/bloodbank/settings/profile',
      providesTags: tagList(TAGS.USER), // bb user profile
    }),
    updateBloodBankProfile: builder.mutation({
      query: (data) => ({
        url: '/bloodbank/settings/profile',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: tagList(TAGS.USER),
    }),
    changeBloodBankPassword: builder.mutation({
      query: (data) => ({
        url: '/bloodbank/settings/password',
        method: 'PUT',
        body: data,
      }),
    }),
    forgotBloodBankPassword: builder.mutation({
      query: (data) => ({
        url: '/blood-banks/forgot-password',
        method: 'POST',
        body: data,
      }),
    }),
    resetBloodBankPassword: builder.mutation({
      query: ({ token, ...data }) => ({
        url: `/blood-banks/reset-password/${token}`,
        method: 'POST',
        body: data,
      }),
    }),
    verifyBloodBankResetToken: builder.mutation({
      query: (token) => ({
        url: '/api/blood-banks/verify-reset-token',
        method: 'POST',
        body: { token },
      }),
    }),
    getBloodBankInventory: builder.query({
      query: () => '/bloodbank/settings/inventory',
      providesTags: tagList(TAGS.INVENTORY_ITEM),
    }),
    updateBloodBankInventory: builder.mutation({
      query: (data) => ({
        url: '/bloodbank/settings/inventory',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error) => [
        ...tagList(TAGS.INVENTORY_ITEM),
        ...tagList(TAGS.BLOOD_BANK),
        ...tagList(TAGS.DASHBOARD)
      ],
    }),
    updateSpecificBloodGroup: builder.mutation({
      query: ({ bloodGroup, units }) => ({
        url: `/bloodbank/settings/inventory/${bloodGroup}`,
        method: 'PATCH',
        body: { units },
      }),
      invalidatesTags: tagList(TAGS.INVENTORY_ITEM),
    }),
    uploadBloodBankPhoto: builder.mutation({
      query: (data) => ({
        url: '/bloodbank/settings/photo',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: tagList(TAGS.USER),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetAllBloodBanksQuery,
  useGetBloodBankByIdQuery,
  useCreateBloodBankMutation,
  useLoginBloodBankMutation,
  useRegisterBloodBankMutation,
  useGetBloodBankDashboardQuery,
  useGetBloodBankProfileQuery,
  useUpdateBloodBankProfileMutation,
  useChangeBloodBankPasswordMutation,
  useGetBloodBankInventoryQuery,
  useUpdateBloodBankInventoryMutation,
  useUpdateSpecificBloodGroupMutation,
  useUploadBloodBankPhotoMutation,
  useForgotBloodBankPasswordMutation,
  useResetBloodBankPasswordMutation,
  useVerifyBloodBankResetTokenMutation,
} = bloodBankApi;

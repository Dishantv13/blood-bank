import { apiSlice } from './apiSlice';
import { TAGS, tagById, tagList, tagListWithIds } from '../enum/tagType';
import { BLOODBANK_API_URLS } from '../enum/apiUrl';

export const bloodBankApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Public/User facing endpoints
    getAllBloodBanks: builder.query({
      query: (params) => ({
        url: BLOODBANK_API_URLS.GET_ALL_BLOOD_BANKS,
        params,
      }),
      providesTags: (result) => tagListWithIds(TAGS.BLOOD_BANK, result?.data),
    }),
    getBloodBankById: builder.query({
      query: (id) => BLOODBANK_API_URLS.GET_BLOOD_BANK_BY_ID(id),
      providesTags: (result, error, id) => tagById(TAGS.BLOOD_BANK, id),
    }),
    createBloodBank: builder.mutation({
      query: (data) => ({
        url: BLOODBANK_API_URLS.CREATE_BLOOD_BANK,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: tagList(TAGS.BLOOD_BANK),
    }),

    // Blood Bank Portal specific endpoints
    loginBloodBank: builder.mutation({
      query: (credentials) => ({
        url: BLOODBANK_API_URLS.LOGIN_BLOOD_BANK,
        method: 'POST',
        body: credentials,
      }),
    }),
    registerBloodBank: builder.mutation({
      query: (data) => ({
        url: BLOODBANK_API_URLS.REGISTER_BLOOD_BANK,
        method: 'POST',
        body: data,
      }),
    }),
    getBloodBankDashboard: builder.query({
      query: () => BLOODBANK_API_URLS.GET_DASHBOARD,
      providesTags: tagList(TAGS.DASHBOARD),
    }),
    getBloodBankProfile: builder.query({
      query: () => BLOODBANK_API_URLS.GET_PROFILE,
      providesTags: tagList(TAGS.USER), // bb user profile
    }),
    updateBloodBankProfile: builder.mutation({
      query: (data) => ({
        url: BLOODBANK_API_URLS.UPDATE_PROFILE,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: tagList(TAGS.USER),
    }),
    changeBloodBankPassword: builder.mutation({
      query: (data) => ({
        url: BLOODBANK_API_URLS.CHANGE_PASSWORD,
        method: 'PUT',
        body: data,
      }),
    }),
    forgotBloodBankPassword: builder.mutation({
      query: (data) => ({
        url: BLOODBANK_API_URLS.FORGOT_PASSWORD,
        method: 'POST',
        body: data,
      }),
    }),
    resetBloodBankPassword: builder.mutation({
      query: ({ token, ...data }) => ({
        url: BLOODBANK_API_URLS.RESET_PASSWORD(token),
        method: 'POST',
        body: data,
      }),
    }),
    verifyBloodBankResetToken: builder.mutation({
      query: (token) => ({
        url: BLOODBANK_API_URLS.VERIFY_RESET_TOKEN,
        method: 'POST',
        body: { token },
      }),
    }),
    getBloodBankInventory: builder.query({
      query: () => BLOODBANK_API_URLS.GET_INVENTORY,
      providesTags: tagList(TAGS.INVENTORY_ITEM),
    }),
    updateBloodBankInventory: builder.mutation({
      query: (data) => ({
        url: BLOODBANK_API_URLS.UPDATE_INVENTORY,
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
        url: BLOODBANK_API_URLS.UPDATE_BLOOD_GROUP(bloodGroup),
        method: 'PATCH',
        body: { units },
      }),
      invalidatesTags: tagList(TAGS.INVENTORY_ITEM),
    }),
    uploadBloodBankPhoto: builder.mutation({
      query: (data) => ({
        url: BLOODBANK_API_URLS.UPLOAD_PHOTO,
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

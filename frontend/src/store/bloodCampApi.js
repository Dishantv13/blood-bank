import { apiSlice } from './apiSlice';
import { TAGS, tagById, tagList, tagListWithIds } from '../enum/tagType';
import { BLOOD_CAMP_API_URLS } from '../enum/apiUrl';

export const bloodCampApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Standard User Endpoints
    getAllCamps: builder.query({
      query: (params) => ({
        url: BLOOD_CAMP_API_URLS.GET_ALL_CAMPS,
        params,
      }),
      providesTags: (result) => tagListWithIds(TAGS.BLOOD_CAMP, result?.data),
    }),
    getCampById: builder.query({
      query: (id) => BLOOD_CAMP_API_URLS.GET_CAMP_BY_ID(id),
      providesTags: (result, error, id) => tagById(TAGS.BLOOD_CAMP, id),
    }),
    registerForCamp: builder.mutation({
      query: ({ id, data }) => ({
        url: BLOOD_CAMP_API_URLS.REGISTER_FOR_CAMP(id),
        method: 'POST',
        body: data, // expecting timeSlot etc
      }),
      invalidatesTags: (result, error, { id }) => tagById(TAGS.BLOOD_CAMP, id),
    }),

    // Blood Bank Portal Endpoints
    getBloodBankCamps: builder.query({
      query: () => BLOOD_CAMP_API_URLS.GET_BLOOD_BANK_CAMPS,
      providesTags: (result) => tagListWithIds(TAGS.BLOOD_CAMP, result?.data),
    }),
    getCampRegistrations: builder.query({
      query: (campId) => BLOOD_CAMP_API_URLS.GET_CAMP_REGISTRATIONS(campId),
      providesTags: (result, error, campId) => [{ type: TAGS.BLOOD_CAMP, id: `${campId}_regs` }],
    }),
    createCamp: builder.mutation({
      query: (data) => ({
        url: BLOOD_CAMP_API_URLS.CREATE_CAMP,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: tagList(TAGS.BLOOD_CAMP),
    }),
    updateCamp: builder.mutation({
      query: ({ id, ...data }) => ({
        url: BLOOD_CAMP_API_URLS.UPDATE_CAMP(id),
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => tagById(TAGS.BLOOD_CAMP, id),
    }),
    deleteCamp: builder.mutation({
      query: (id) => ({
        url: BLOOD_CAMP_API_URLS.DELETE_CAMP(id),
        method: 'DELETE',
      }),
      invalidatesTags: tagList(TAGS.BLOOD_CAMP),
    }),
    deleteCampRegistration: builder.mutation({
      query: ({ campId, donorId }) => ({
        url: BLOOD_CAMP_API_URLS.DELETE_CAMP_REGISTRATION(campId, donorId),
        method: 'DELETE',
      }),
      // Invalidate the specific camp's registration list
      invalidatesTags: (result, error, { campId }) => [{ type: TAGS.BLOOD_CAMP, id: `${campId}_regs` }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetAllCampsQuery,
  useGetCampByIdQuery,
  useRegisterForCampMutation,
  // BB portal
  useGetBloodBankCampsQuery,
  useGetCampRegistrationsQuery,
  useLazyGetCampRegistrationsQuery,
  useCreateCampMutation,
  useUpdateCampMutation,
  useDeleteCampMutation,
  useDeleteCampRegistrationMutation,
} = bloodCampApi;

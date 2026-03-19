import { apiSlice } from './apiSlice';
import { TAGS, tagById, tagList, tagListWithIds } from './tagType';

export const bloodCampApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Standard User Endpoints
    getAllCamps: builder.query({
      query: (params) => ({
        url: '/blood-camps',
        params,
      }),
      providesTags: (result) => tagListWithIds(TAGS.BLOOD_CAMP, result?.data),
    }),
    getCampById: builder.query({
      query: (id) => `/blood-camps/${id}`,
      providesTags: (result, error, id) => tagById(TAGS.BLOOD_CAMP, id),
    }),
    registerForCamp: builder.mutation({
      query: ({ id, data }) => ({
        url: `/blood-camps/${id}/register`,
        method: 'POST',
        body: data, // expecting timeSlot etc
      }),
      invalidatesTags: (result, error, { id }) => tagById(TAGS.BLOOD_CAMP, id),
    }),

    // Blood Bank Portal Endpoints
    getBloodBankCamps: builder.query({
      query: () => '/bloodbank/camps',
      providesTags: (result) => tagListWithIds(TAGS.BLOOD_CAMP, result?.data),
    }),
    getCampRegistrations: builder.query({
      query: (campId) => `/bloodbank/camps/${campId}/registrations`,
      providesTags: (result, error, campId) => [{ type: TAGS.BLOOD_CAMP, id: `${campId}_regs` }],
    }),
    createCamp: builder.mutation({
      query: (data) => ({
        url: '/blood-camps',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: tagList(TAGS.BLOOD_CAMP),
    }),
    updateCamp: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/blood-camps/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => tagById(TAGS.BLOOD_CAMP, id),
    }),
    deleteCamp: builder.mutation({
      query: (id) => ({
        url: `/blood-camps/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: tagList(TAGS.BLOOD_CAMP),
    }),
    deleteCampRegistration: builder.mutation({
      query: ({ campId, donorId }) => ({
        url: `/bloodbank/camps/${campId}/registrations/${donorId}`,
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

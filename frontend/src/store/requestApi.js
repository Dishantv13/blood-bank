import { apiSlice } from './apiSlice';
import { TAGS, tagById, tagList, tagListWithIds } from './tagType';

export const requestApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Standard User endpoints
    getAllRequests: builder.query({
      query: (params) => ({
        url: '/requests',
        params,
      }),
      providesTags: (result) => tagListWithIds(TAGS.REQUEST, result?.data?.requests || result?.data),
    }),
    getMyRequests: builder.query({
      query: () => '/requests/my-requests',
      providesTags: (result) => tagListWithIds(TAGS.REQUEST, result?.data),
    }),
    createRequest: builder.mutation({
      query: (data) => ({
        url: '/requests',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: tagList(TAGS.REQUEST),
    }),
    updateRequest: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/requests/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        tagById(TAGS.REQUEST, id),
        ...tagList(TAGS.REQUEST),
      ],
    }),
    updateRequestStatusUser: builder.mutation({
      query: ({ id, status }) => ({
        url: `/requests/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: (result, error, { id }) => [
        tagById(TAGS.REQUEST, id),
        ...tagList(TAGS.REQUEST),
      ],
    }),

    // Blood Bank Portal endpoints
    getBloodBankRequests: builder.query({
      query: (params) => ({
        url: '/bloodbank/requests',
        params,
      }),
      providesTags: (result) => tagListWithIds(TAGS.REQUEST, result?.data?.requests || result?.data),
    }),
    getBloodBankApprovedRequests: builder.query({
      query: (params) => ({
        url: '/bloodbank/requests/approved',
        params,
      }),
      providesTags: tagList(TAGS.REQUEST), // general tag, list drops ID for pagination usually
    }),
    getBloodBankRequestById: builder.query({
      query: (id) => `/bloodbank/requests/${id}`,
      providesTags: (result, error, id) => tagById(TAGS.REQUEST, id),
    }),
    createInterBankRequest: builder.mutation({
      query: (data) => ({
        url: '/bloodbank/requests/inter-bank',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: tagList(TAGS.REQUEST),
    }),
    approveRequest: builder.mutation({
      query: ({ id, data }) => ({
        url: `/bloodbank/requests/${id}/approve`,
        method: 'POST',
        body: data,
      }),
      // Approving implies inventory changes too, so we invalidate both
      invalidatesTags: (result, error, { id }) => [
        ...tagById(TAGS.REQUEST, id),
        ...tagList(TAGS.INVENTORY_ITEM)
      ],
    }),
    rejectRequest: builder.mutation({
      query: ({ id, data }) => ({
        url: `/bloodbank/requests/${id}/reject`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        tagById(TAGS.REQUEST, id),
        ...tagList(TAGS.REQUEST),
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetAllRequestsQuery,
  useGetMyRequestsQuery,
  useCreateRequestMutation,
  useUpdateRequestMutation,
  useUpdateRequestStatusUserMutation,
  // BB portal
  useGetBloodBankRequestsQuery,
  useGetBloodBankApprovedRequestsQuery,
  useGetBloodBankRequestByIdQuery,
  useCreateInterBankRequestMutation,
  useApproveRequestMutation,
  useRejectRequestMutation,
} = requestApi;

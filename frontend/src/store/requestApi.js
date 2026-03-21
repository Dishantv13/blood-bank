import { apiSlice } from './apiSlice';
import { TAGS, tagById, tagList, tagListWithIds } from '../enum/tagType';
import { REQUEST_API_URLS } from '../enum/apiUrl';

export const requestApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Standard User endpoints
    getAllRequests: builder.query({
      query: (params) => ({
        url: REQUEST_API_URLS.GET_ALL_REQUESTS,
        params,
      }),
      providesTags: (result) => tagListWithIds(TAGS.REQUEST, result?.data?.requests || result?.data),
    }),
    getMyRequests: builder.query({
      query: () => REQUEST_API_URLS.GET_MY_REQUESTS,
      providesTags: (result) => tagListWithIds(TAGS.REQUEST, result?.data),
    }),
    createRequest: builder.mutation({
      query: (data) => ({
        url: REQUEST_API_URLS.CREATE_REQUEST,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: tagList(TAGS.REQUEST),
    }),
    updateRequest: builder.mutation({
      query: ({ id, ...data }) => ({
        url: REQUEST_API_URLS.UPDATE_REQUEST(id),
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
        url: REQUEST_API_URLS.UPDATE_REQUEST_STATUS_USER(id),
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
        url: REQUEST_API_URLS.GET_BLOOD_BANK_REQUESTS,
        params,
      }),
      providesTags: (result) => tagListWithIds(TAGS.REQUEST, result?.data?.requests || result?.data),
    }),
    getBloodBankApprovedRequests: builder.query({
      query: (params) => ({
        url: REQUEST_API_URLS.GET_BLOOD_BANK_APPROVED_REQUESTS,
        params,
      }),
      providesTags: tagList(TAGS.REQUEST), // general tag, list drops ID for pagination usually
    }),
    getBloodBankRequestById: builder.query({
      query: (id) => REQUEST_API_URLS.GET_BLOOD_BANK_REQUEST_BY_ID(id),
      providesTags: (result, error, id) => tagById(TAGS.REQUEST, id),
    }),
    createInterBankRequest: builder.mutation({
      query: (data) => ({
        url: REQUEST_API_URLS.CREATE_INTER_BANK_REQUEST,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: tagList(TAGS.REQUEST),
    }),
    approveRequest: builder.mutation({
      query: ({ id, data }) => ({
        url: REQUEST_API_URLS.APPROVE_REQUEST(id),
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
        url: REQUEST_API_URLS.REJECT_REQUEST(id),
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

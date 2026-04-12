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
      providesTags: (result) => tagListWithIds(TAGS.REQUEST, result?.requests || result?.data),
    }),
    getMyRequests: builder.query({
      query: () => REQUEST_API_URLS.GET_MY_REQUESTS,
      providesTags: (result) => tagListWithIds(TAGS.REQUEST, result?.data),
    }),
    getRequestById: builder.query({
      query: (id) => REQUEST_API_URLS.GET_REQUEST_BY_ID(id),
      providesTags: (result, error, id) => tagById(TAGS.REQUEST, id),
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
        ...tagById(TAGS.REQUEST, id),
        ...tagList(TAGS.REQUEST),
      ],
    }),
    updateRequestStatus: builder.mutation({
      query: ({ id, status, note }) => ({
        url: REQUEST_API_URLS.UPDATE_REQUEST_STATUS(id),
        method: 'PATCH',
        body: { status, note },
      }),
      invalidatesTags: (result, error, { id }) => [
        ...tagById(TAGS.REQUEST, id),
        ...tagList(TAGS.REQUEST),
      ],
    }),
    fulfillRequest: builder.mutation({
      query: ({ id, ...data }) => ({
        url: REQUEST_API_URLS.FULFILL_REQUEST(id),
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        ...tagById(TAGS.REQUEST, id),
        ...tagList(TAGS.REQUEST),
      ],
    }),

    // Blood Bank Portal specific
    getBloodBankRequests: builder.query({
      query: (params) => ({
        url: REQUEST_API_URLS.GET_BLOOD_BANK_REQUESTS,
        params,
      }),
      providesTags: (result) => tagListWithIds(TAGS.REQUEST, result?.requests || result?.data),
    }),
    createInterBankRequest: builder.mutation({
      query: (data) => ({
        url: REQUEST_API_URLS.CREATE_INTER_BANK_REQUEST,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: tagList(TAGS.REQUEST),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetAllRequestsQuery,
  useGetMyRequestsQuery,
  useGetRequestByIdQuery,
  useCreateRequestMutation,
  useUpdateRequestMutation,
  useUpdateRequestStatusMutation,
  useFulfillRequestMutation,
  // BB portal
  useGetBloodBankRequestsQuery,
  useCreateInterBankRequestMutation,
} = requestApi;

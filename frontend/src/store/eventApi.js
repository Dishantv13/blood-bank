import { apiSlice } from './apiSlice';
import { TAGS, tagById, tagList, tagListWithIds } from '../enum/tagType';
import { EVENT_API_URLS } from '../enum/apiUrl';

export const eventApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Standard User Endpoints
    getAllEvents: builder.query({
      query: (params) => ({
        url: EVENT_API_URLS.GET_ALL_EVENTS,
        params,
      }),
      providesTags: (result) => tagListWithIds(TAGS.EVENT, result?.data),
    }),
    registerForEvent: builder.mutation({
      query: (id) => ({
        url: EVENT_API_URLS.REGISTER_FOR_EVENT(id),
        method: 'POST',
      }),
      // Invalidating EVENT refreshes the registered attendee count
      invalidatesTags: (result, error, id) => tagById(TAGS.EVENT, id),
    }),

    // Blood Bank Portal Endpoints
    getBloodBankEvents: builder.query({
      query: () => EVENT_API_URLS.GET_BLOOD_BANK_EVENTS,
      providesTags: (result) => tagListWithIds(TAGS.EVENT, result?.events || result?.data),
    }),
    getEventRegistrations: builder.query({
      query: (arg) => {
        const eventId = typeof arg === 'string' ? arg : arg?.eventId;
        const params = typeof arg === 'object' ? { page: arg?.page, limit: arg?.limit } : undefined;
        return {
          url: EVENT_API_URLS.GET_EVENT_REGISTRATIONS(eventId),
          params,
        };
      },
      providesTags: (result, error, arg) => {
        const eventId = typeof arg === 'string' ? arg : arg?.eventId;
        return [{ type: TAGS.EVENT, id: `${eventId}_regs` }];
      },
    }),
    createEvent: builder.mutation({
      query: (data) => ({
        url: EVENT_API_URLS.CREATE_EVENT,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: tagList(TAGS.EVENT),
    }),
    updateEvent: builder.mutation({
      query: ({ id, ...data }) => ({
        url: EVENT_API_URLS.UPDATE_EVENT(id),
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => tagById(TAGS.EVENT, id),
    }),
    deleteEvent: builder.mutation({
      query: (id) => ({
        url: EVENT_API_URLS.DELETE_EVENT(id),
        method: 'DELETE',
      }),
      invalidatesTags: tagList(TAGS.EVENT),
    }),
    exportEventRegistrations: builder.mutation({
      query: (id) => ({
        url: EVENT_API_URLS.EXPORT_EVENT_REGISTRATIONS(id),
        method: 'GET',
        responseHandler: (response) => response.arrayBuffer(),
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetAllEventsQuery,
  useRegisterForEventMutation,
  // BB portal
  useGetBloodBankEventsQuery,
  useGetEventRegistrationsQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  useDeleteEventMutation,
  useExportEventRegistrationsMutation,
} = eventApi;

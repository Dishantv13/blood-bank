import { apiSlice } from './apiSlice';
import { TAGS, tagById, tagList, tagListWithIds } from './tagType';

export const eventApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Standard User Endpoints
    getAllEvents: builder.query({
      query: (params) => ({
        url: '/events',
        params,
      }),
      providesTags: (result) => tagListWithIds(TAGS.EVENT, result?.data),
    }),
    registerForEvent: builder.mutation({
      query: (id) => ({
        url: `/events/${id}/register`,
        method: 'POST',
      }),
      // Invalidating EVENT refreshes the registered attendee count
      invalidatesTags: (result, error, id) => tagById(TAGS.EVENT, id),
    }),

    // Blood Bank Portal Endpoints
    getBloodBankEvents: builder.query({
      query: () => '/bloodbank/events',
      providesTags: (result) => tagListWithIds(TAGS.EVENT, result?.data),
    }),
    getEventRegistrations: builder.query({
      query: (eventId) => `/bloodbank/events/${eventId}/registrations`,
      providesTags: (result, error, eventId) => [{ type: TAGS.EVENT, id: `${eventId}_regs` }],
    }),
    createEvent: builder.mutation({
      query: (data) => ({
        url: '/bloodbank/events',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: tagList(TAGS.EVENT),
    }),
    updateEvent: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/bloodbank/events/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => tagById(TAGS.EVENT, id),
    }),
    deleteEvent: builder.mutation({
      query: (id) => ({
        url: `/bloodbank/events/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: tagList(TAGS.EVENT),
    }),
    exportEventRegistrations: builder.mutation({
      query: (id) => ({
        url: `/bloodbank/events/${id}/export-registrations`,
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

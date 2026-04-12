import { apiSlice } from './apiSlice';
import { TAGS } from '../enum/tagType';

export const notificationApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query({
      query: (params) => ({
        url: '/notifications',
        params
      }),
      providesTags: [TAGS.NOTIFICATION || 'Notification']
    }),
    getUnreadCount: builder.query({
      query: () => '/notifications/unread-count',
      providesTags: [TAGS.NOTIFICATION || 'Notification']
    }),
    markAsRead: builder.mutation({
      query: (id) => ({
        url: `/notifications/${id}/read`,
        method: 'PATCH'
      }),
      invalidatesTags: [TAGS.NOTIFICATION || 'Notification']
    }),
    markAllAsRead: builder.mutation({
      query: () => ({
        url: '/notifications/read-all',
        method: 'PATCH'
      }),
      invalidatesTags: [TAGS.NOTIFICATION || 'Notification']
    }),
    deleteNotification: builder.mutation({
      query: (id) => ({
        url: `/notifications/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: [TAGS.NOTIFICATION || 'Notification']
    })
  })
});

export const {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation
} = notificationApi;

import { apiSlice } from "./apiSlice";
import { TAGS } from "../enum/tagType";
import { NOTIFICATION_API_URLS } from "../enum/apiUrl";

export const notificationApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query({
      query: (params) => ({
        url: NOTIFICATION_API_URLS.GET_NOTIFICATIONS,
        params,
      }),
      providesTags: [TAGS.NOTIFICATION || "Notification"],
    }),
    getUnreadCount: builder.query({
      query: () => NOTIFICATION_API_URLS.GET_UNREAD_COUNT,
      providesTags: [TAGS.NOTIFICATION || "Notification"],
    }),
    markAsRead: builder.mutation({
      query: (id) => ({
        url: NOTIFICATION_API_URLS.MARK_AS_READ(id),
        method: "PATCH",
      }),
      invalidatesTags: [TAGS.NOTIFICATION || "Notification"],
    }),
    markAllAsRead: builder.mutation({
      query: () => ({
        url: NOTIFICATION_API_URLS.MARK_ALL_AS_READ,
        method: "PATCH",
      }),
      invalidatesTags: [TAGS.NOTIFICATION || "Notification"],
    }),
    deleteNotification: builder.mutation({
      query: (id) => ({
        url: NOTIFICATION_API_URLS.DELETE_NOTIFICATION(id),
        method: "DELETE",
      }),
      invalidatesTags: [TAGS.NOTIFICATION || "Notification"],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
} = notificationApi;

import { apiSlice } from "./apiSlice";
import { TAGS } from "../enum/tagType";

export const chatApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getChatHistory: builder.query({
      query: (requestId) => `/chat/${requestId}`,
      providesTags: (result, error, requestId) => [
        { type: TAGS.CHAT, id: requestId },
      ],
    }),
    markChatAsRead: builder.mutation({
      query: (requestId) => ({
        url: `/chat/${requestId}/read`,
        method: "PATCH",
      }),
      invalidatesTags: (result, error, requestId) => [
        { type: TAGS.CHAT, id: requestId },
      ],
    }),
  }),
});

export const { useGetChatHistoryQuery, useMarkChatAsReadMutation } = chatApi;

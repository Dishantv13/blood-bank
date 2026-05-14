import { apiSlice } from "./apiSlice";
import { TAGS } from "../enum/tagType";
import { CHAT_API_URLS } from "../enum/apiUrl";

export const chatApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getChatHistory: builder.query({
      query: (requestId) => CHAT_API_URLS.GET_CHAT_HISTORY(requestId),
      providesTags: (result, error, requestId) => [
        { type: TAGS.CHAT, id: requestId },
      ],
    }),
    markChatAsRead: builder.mutation({
      query: (requestId) => ({
        url: CHAT_API_URLS.MARK_CHAT_AS_READ(requestId),
        method: "PATCH",
      }),
      invalidatesTags: (result, error, requestId) => [
        { type: TAGS.CHAT, id: requestId },
      ],
    }),
  }),
});

export const { useGetChatHistoryQuery, useMarkChatAsReadMutation } = chatApi;

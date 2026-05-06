import { apiSlice } from "./apiSlice.js";
import { ADMIN_URLS } from "../enum/apiUrl.js";
import { TAGS, tagList, tagById } from "../enum/tagType.js";

export const adminApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Dashboard Stats
    getAdminDashboardStats: builder.query({
      query: () => ADMIN_URLS.DASHBOARD.STATS,
      providesTags: tagList(TAGS.ADMIN_STATS),
    }),

    // Users
    getAdminUsers: builder.query({
      query: ({ page = 1, limit = 10, status, bloodType, search } = {}) => {
        const params = new URLSearchParams();
        params.append("page", page);
        params.append("limit", limit);
        if (status) params.append("status", status);
        if (bloodType) params.append("bloodType", bloodType);
        if (search) params.append("search", search);
        return `${ADMIN_URLS.USERS.BASE}?${params.toString()}`;
      },
      providesTags: tagList(TAGS.ADMIN_USER),
    }),

    getAdminUserById: builder.query({
      query: (userId) => ADMIN_URLS.USERS.BY_ID(userId),
      providesTags: (result, error, userId) => tagById(TAGS.ADMIN_USER, userId),
    }),

    updateAdminUserStatus: builder.mutation({
      query: ({ userId, status }) => ({
        url: ADMIN_URLS.USERS.UPDATE_STATUS(userId),
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: (result, error, { userId }) => [
        ...tagList(TAGS.ADMIN_USER),
        ...tagById(TAGS.ADMIN_USER, userId),
      ],
    }),

    // Blood Banks
    getAdminBloodBanks: builder.query({
      query: ({ page = 1, limit = 10, status, search } = {}) => {
        const params = new URLSearchParams();
        params.append("page", page);
        params.append("limit", limit);
        if (status) params.append("status", status);
        if (search) params.append("search", search);
        return `${ADMIN_URLS.BLOODBANKS.BASE}?${params.toString()}`;
      },
      providesTags: tagList(TAGS.ADMIN_BLOOD_BANK),
    }),

    getAdminBloodBankById: builder.query({
      query: (bankId) => ADMIN_URLS.BLOODBANKS.BY_ID(bankId),
      providesTags: (result, error, bankId) =>
        tagById(TAGS.ADMIN_BLOOD_BANK, bankId),
    }),

    updateAdminBloodBankStatus: builder.mutation({
      query: ({ bankId, status, rejectionReason }) => ({
        url: ADMIN_URLS.BLOODBANKS.UPDATE_STATUS(bankId),
        method: "PATCH",
        body: { status, rejectionReason },
      }),
      invalidatesTags: (result, error, { bankId }) => [
        ...tagList(TAGS.ADMIN_BLOOD_BANK),
        ...tagById(TAGS.ADMIN_BLOOD_BANK, bankId),
      ],
    }),

    // Camps
    getAdminCamps: builder.query({
      query: ({ page = 1, limit = 10, status, search, bloodBankId } = {}) => {
        const params = new URLSearchParams();
        params.append("page", page);
        params.append("limit", limit);
        if (status) params.append("status", status);
        if (search) params.append("search", search);
        if (bloodBankId) params.append("bloodBankId", bloodBankId);
        return `${ADMIN_URLS.CAMPS.BASE}?${params.toString()}`;
      },
      providesTags: tagList(TAGS.ADMIN_CAMP),
    }),

    getAdminCampsByBloodBank: builder.query({
      query: ({ bankId, page = 1, limit = 10, status, search } = {}) => {
        const params = new URLSearchParams();
        params.append("page", page);
        params.append("limit", limit);
        if (status) params.append("status", status);
        if (search) params.append("search", search);
        return `${ADMIN_URLS.CAMPS.BY_BLOODBANK(bankId)}?${params.toString()}`;
      },
      providesTags: tagList(TAGS.ADMIN_CAMP),
    }),

    getAdminCampById: builder.query({
      query: (campId) => ADMIN_URLS.CAMPS.BY_ID(campId),
      providesTags: (result, error, campId) => tagById(TAGS.ADMIN_CAMP, campId),
    }),

    updateAdminCampStatus: builder.mutation({
      query: ({ campId, status }) => ({
        url: ADMIN_URLS.CAMPS.UPDATE_STATUS(campId),
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: (result, error, { campId }) => [
        ...tagList(TAGS.ADMIN_CAMP),
        ...tagById(TAGS.ADMIN_CAMP, campId),
      ],
    }),

    // Events
    getAdminEvents: builder.query({
      query: ({ page = 1, limit = 10, status, search, bloodBankId } = {}) => {
        const params = new URLSearchParams();
        params.append("page", page);
        params.append("limit", limit);
        if (status) params.append("status", status);
        if (search) params.append("search", search);
        if (bloodBankId) params.append("bloodBankId", bloodBankId);
        return `${ADMIN_URLS.EVENTS.BASE}?${params.toString()}`;
      },
      providesTags: tagList(TAGS.ADMIN_EVENT),
    }),

    getAdminEventsByBloodBank: builder.query({
      query: ({ bankId, page = 1, limit = 10, status, search } = {}) => {
        const params = new URLSearchParams();
        params.append("page", page);
        params.append("limit", limit);
        if (status) params.append("status", status);
        if (search) params.append("search", search);
        return `${ADMIN_URLS.EVENTS.BY_BLOODBANK(bankId)}?${params.toString()}`;
      },
      providesTags: tagList(TAGS.ADMIN_EVENT),
    }),

    getAdminEventById: builder.query({
      query: (eventId) => ADMIN_URLS.EVENTS.BY_ID(eventId),
      providesTags: (result, error, eventId) =>
        tagById(TAGS.ADMIN_EVENT, eventId),
    }),

    updateAdminEventStatus: builder.mutation({
      query: ({ eventId, status }) => ({
        url: ADMIN_URLS.EVENTS.UPDATE_STATUS(eventId),
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: (result, error, { eventId }) => [
        ...tagList(TAGS.ADMIN_EVENT),
        ...tagById(TAGS.ADMIN_EVENT, eventId),
      ],
    }),

    // Requests
    getAdminRequests: builder.query({
      query: ({
        page = 1,
        limit = 10,
        status,
        bloodType,
        urgency,
        search,
        userId,
      } = {}) => {
        const params = new URLSearchParams();
        params.append("page", page);
        params.append("limit", limit);
        if (status) params.append("status", status);
        if (bloodType) params.append("bloodType", bloodType);
        if (urgency) params.append("urgency", urgency);
        if (search) params.append("search", search);
        if (userId) params.append("userId", userId);
        return `${ADMIN_URLS.REQUESTS.BASE}?${params.toString()}`;
      },
      providesTags: tagList(TAGS.ADMIN_REQUEST),
    }),

    getAdminRequestById: builder.query({
      query: (requestId) => ADMIN_URLS.REQUESTS.BY_ID(requestId),
      providesTags: (result, error, requestId) =>
        tagById(TAGS.ADMIN_REQUEST, requestId),
    }),

    updateAdminRequestStatus: builder.mutation({
      query: ({ requestId, status }) => ({
        url: ADMIN_URLS.REQUESTS.UPDATE_STATUS(requestId),
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: (result, error, { requestId }) => [
        ...tagList(TAGS.ADMIN_REQUEST),
        ...tagById(TAGS.ADMIN_REQUEST, requestId),
      ],
    }),

    // Donations
    getAdminDonations: builder.query({
      query: ({
        page = 1,
        limit = 10,
        status,
        bloodType,
        search,
        userId,
      } = {}) => {
        const params = new URLSearchParams();
        params.append("page", page);
        params.append("limit", limit);
        if (status) params.append("status", status);
        if (bloodType) params.append("bloodType", bloodType);
        if (search) params.append("search", search);
        if (userId) params.append("userId", userId);
        return `${ADMIN_URLS.DONATIONS.BASE}?${params.toString()}`;
      },
      providesTags: tagList(TAGS.ADMIN_DONATION),
    }),

    getAdminDonationById: builder.query({
      query: (donationId) => ADMIN_URLS.DONATIONS.BY_ID(donationId),
      providesTags: (result, error, donationId) =>
        tagById(TAGS.ADMIN_DONATION, donationId),
    }),

    updateAdminDonationStatus: builder.mutation({
      query: ({ donationId, status }) => ({
        url: ADMIN_URLS.DONATIONS.UPDATE_STATUS(donationId),
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: (result, error, { donationId }) => [
        ...tagList(TAGS.ADMIN_DONATION),
        ...tagById(TAGS.ADMIN_DONATION, donationId),
      ],
    }),

    // Inventory
    getAdminInventoryOverview: builder.query({
      query: ({ page = 1, limit = 10, bloodType, search } = {}) => {
        const params = new URLSearchParams();
        params.append("page", page);
        params.append("limit", limit);
        if (bloodType) params.append("bloodType", bloodType);
        if (search) params.append("search", search);
        return `${ADMIN_URLS.INVENTORY.BASE}?${params.toString()}`;
      },
      providesTags: tagList(TAGS.ADMIN_INVENTORY),
    }),

    getAdminInventoryById: builder.query({
      query: (inventoryId) => ADMIN_URLS.INVENTORY.BY_ID(inventoryId),
      providesTags: (result, error, inventoryId) =>
        tagById(TAGS.ADMIN_INVENTORY, inventoryId),
    }),

    // Export
    exportUsersXlsx: builder.query({
      query: () => ({
        url: ADMIN_URLS.EXPORT.USERS_XLSX,
        responseHandler: "blob",
      }),
    }),

    exportUsersCSV: builder.query({
      query: () => ({
        url: ADMIN_URLS.EXPORT.USERS_CSV,
        responseHandler: "blob",
      }),
    }),

    exportRequestsXlsx: builder.query({
      query: () => ({
        url: ADMIN_URLS.EXPORT.REQUESTS_XLSX,
        responseHandler: "blob",
      }),
    }),

    exportRequestsCSV: builder.query({
      query: () => ({
        url: ADMIN_URLS.EXPORT.REQUESTS_CSV,
        responseHandler: "blob",
      }),
    }),

    exportBloodBanksXlsx: builder.query({
      query: () => ({
        url: ADMIN_URLS.EXPORT.BLOODBANKS_XLSX,
        responseHandler: "blob",
      }),
    }),

    exportBloodBanksCSV: builder.query({
      query: () => ({
        url: ADMIN_URLS.EXPORT.BLOODBANKS_CSV,
        responseHandler: "blob",
      }),
    }),

    exportCampsXlsx: builder.query({
      query: () => ({
        url: ADMIN_URLS.EXPORT.CAMPS_XLSX,
        responseHandler: "blob",
      }),
    }),

    exportCampsCSV: builder.query({
      query: () => ({
        url: ADMIN_URLS.EXPORT.CAMPS_CSV,
        responseHandler: "blob",
      }),
    }),

    exportEventsXlsx: builder.query({
      query: () => ({
        url: ADMIN_URLS.EXPORT.EVENTS_XLSX,
        responseHandler: "blob",
      }),
    }),

    exportEventsCSV: builder.query({
      query: () => ({
        url: ADMIN_URLS.EXPORT.EVENTS_CSV,
        responseHandler: "blob",
      }),
    }),

    exportAllDataXlsx: builder.query({
      query: () => ({
        url: ADMIN_URLS.EXPORT.ALL_DATA_XLSX,
        responseHandler: "blob",
      }),
    }),

    exportAllDataCSV: builder.query({
      query: () => ({
        url: ADMIN_URLS.EXPORT.ALL_DATA_CSV,
        responseHandler: "blob",
      }),
    }),
  }),
});

const {
  useGetAdminDashboardStatsQuery,
  useGetAdminUsersQuery,
  useGetAdminUserByIdQuery,
  useUpdateAdminUserStatusMutation,
  useGetAdminBloodBanksQuery,
  useGetAdminBloodBankByIdQuery,
  useUpdateAdminBloodBankStatusMutation,
  useGetAdminCampsQuery,
  useGetAdminCampsByBloodBankQuery,
  useGetAdminCampByIdQuery,
  useUpdateAdminCampStatusMutation,
  useGetAdminEventsQuery,
  useGetAdminEventsByBloodBankQuery,
  useGetAdminEventByIdQuery,
  useUpdateAdminEventStatusMutation,
  useGetAdminRequestsQuery,
  useGetAdminRequestByIdQuery,
  useUpdateAdminRequestStatusMutation,
  useGetAdminDonationsQuery,
  useGetAdminDonationByIdQuery,
  useUpdateAdminDonationStatusMutation,
  useGetAdminInventoryOverviewQuery,
  useGetAdminInventoryByIdQuery,
  useExportUsersXlsxQuery,
  useExportUsersCSVQuery,
  useExportRequestsXlsxQuery,
  useExportRequestsCSVQuery,
  useExportBloodBanksXlsxQuery,
  useExportBloodBanksCSVQuery,
  useExportCampsXlsxQuery,
  useExportCampsCSVQuery,
  useExportEventsXlsxQuery,
  useExportEventsCSVQuery,
  useExportAllDataXlsxQuery,
  useExportAllDataCSVQuery,
} = adminApi;

export {
  // Backward-compatible hook names used by admin pages
  useGetAdminDashboardStatsQuery as useGetDashboardStatsQuery,
  useGetAdminUsersQuery as useGetAllUsersQuery,
  useGetAdminUserByIdQuery as useGetUserByIdQuery,
  useUpdateAdminUserStatusMutation as useUpdateUserStatusMutation,
  useGetAdminBloodBanksQuery as useGetAllBloodBanksQuery,
  useGetAdminBloodBankByIdQuery as useGetBloodBankByIdQuery,
  useUpdateAdminBloodBankStatusMutation as useUpdateBloodBankStatusMutation,
  useGetAdminCampsQuery as useGetAllCampsQuery,
  useGetAdminCampsByBloodBankQuery as useGetCampsByBloodBankQuery,
  useGetAdminCampByIdQuery as useGetCampByIdQuery,
  useUpdateAdminCampStatusMutation as useUpdateCampStatusMutation,
  useGetAdminEventsQuery as useGetAllEventsQuery,
  useGetAdminEventsByBloodBankQuery as useGetEventsByBloodBankQuery,
  useGetAdminEventByIdQuery as useGetEventByIdQuery,
  useUpdateAdminEventStatusMutation as useUpdateEventStatusMutation,
  useGetAdminRequestsQuery as useGetAllRequestsQuery,
  useGetAdminRequestByIdQuery as useGetRequestByIdQuery,
  useUpdateAdminRequestStatusMutation as useUpdateRequestStatusMutation,
  useGetAdminDonationsQuery as useGetAllDonationsQuery,
  useGetAdminDonationByIdQuery as useGetDonationByIdQuery,
  useUpdateAdminDonationStatusMutation as useUpdateDonationStatusMutation,
  useGetAdminInventoryOverviewQuery as useGetInventoryOverviewQuery,
  useGetAdminInventoryByIdQuery as useGetInventoryByIdQuery,
  useExportUsersXlsxQuery,
  useExportUsersCSVQuery,
  useExportRequestsXlsxQuery,
  useExportRequestsCSVQuery,
  useExportBloodBanksXlsxQuery,
  useExportBloodBanksCSVQuery,
  useExportCampsXlsxQuery,
  useExportCampsCSVQuery,
  useExportEventsXlsxQuery,
  useExportEventsCSVQuery,
  useExportAllDataXlsxQuery,
  useExportAllDataCSVQuery,
};

import { apiSlice } from './apiSlice';
import { TAGS, tagById, tagList, tagListWithIds } from './tagType';

export const donationApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // For Donors
    requestDonation: builder.mutation({
      query: (data) => ({
        url: '/donations/request',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: tagList(TAGS.DONATION),
    }),
    getMyDonations: builder.query({
      query: () => '/donations/my',
      providesTags: (result) => tagListWithIds(TAGS.DONATION, result),
    }),

    // For Blood Banks
    getBloodBankDonations: builder.query({
      query: () => '/donations/bank',
      providesTags: (result) => tagListWithIds(TAGS.DONATION, result),
    }),
    recordDonation: builder.mutation({
      query: ({ donationId, volumeDonated }) => ({
        url: `/donations/bank/${donationId}/record`,
        method: 'PUT',
        body: { volumeDonated },
      }),
      // Invalidate both the specific donation AND the full list so tabs/counts update
      invalidatesTags: (result, error, { donationId }) => [
        tagById(TAGS.DONATION, donationId),
        ...tagList(TAGS.DONATION),
      ],
    }),
    updateDonationStatus: builder.mutation({
      query: ({ donationId, status }) => ({
        url: `/donations/bank/${donationId}/status`,
        method: 'PUT',
        body: { status },
      }),
      // Invalidate both the item and the list so pending/completed tabs re-render
      invalidatesTags: (result, error, { donationId }) => [
        tagById(TAGS.DONATION, donationId),
        ...tagList(TAGS.DONATION),
      ],
    }),
    createDonation: builder.mutation({
      query: (data) => ({
        url: '/donations/bank/create',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: tagList(TAGS.DONATION),
    }),
  }),
  overrideExisting: false,
});

export const {
  useRequestDonationMutation,
  useGetMyDonationsQuery,
  useGetBloodBankDonationsQuery,
  useRecordDonationMutation,
  useUpdateDonationStatusMutation,
  useCreateDonationMutation,
} = donationApi;

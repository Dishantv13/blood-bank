import { apiSlice } from "./apiSlice";
import { TAGS, tagById, tagList, tagListWithIds } from "../enum/tagType";
import { DONATION_API_URLS } from "../enum/apiUrl";

export const donationApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // For Donors
    requestDonation: builder.mutation({
      query: (data) => ({
        url: DONATION_API_URLS.REQUEST_DONATION,
        method: "POST",
        body: data,
      }),
      invalidatesTags: tagList(TAGS.DONATION),
    }),
    getMyDonations: builder.query({
      query: (params) => ({
        url: DONATION_API_URLS.GET_MY_DONATIONS,
        params,
      }),
      providesTags: (result) => tagListWithIds(TAGS.DONATION, result?.data),
    }),

    // For Blood Banks
    getBloodBankDonations: builder.query({
      query: (params) => ({
        url: DONATION_API_URLS.GET_BLOOD_BANK_DONATIONS,
        params,
      }),
      providesTags: (result) => tagListWithIds(TAGS.DONATION, result),
    }),
    recordDonation: builder.mutation({
      query: ({ donationId, volumeDonated }) => ({
        url: DONATION_API_URLS.RECORD_DONATION(donationId),
        method: "PUT",
        body: { volumeDonated },
      }),
      // Invalidate both the specific donation AND the full list so tabs/counts update
      invalidatesTags: (result, error, { donationId }) => [
        ...tagById(TAGS.DONATION, donationId),
        ...tagList(TAGS.DONATION),
      ],
    }),
    updateDonationStatus: builder.mutation({
      query: ({ donationId, status }) => ({
        url: DONATION_API_URLS.UPDATE_DONATION_STATUS(donationId),
        method: "PUT",
        body: { status },
      }),
      // Invalidate both the item and the list so pending/completed tabs re-render
      invalidatesTags: (result, error, { donationId }) => [
        ...tagById(TAGS.DONATION, donationId),
        ...tagList(TAGS.DONATION),
      ],
    }),
    createDonation: builder.mutation({
      query: (data) => ({
        url: DONATION_API_URLS.CREATE_DONATION,
        method: "POST",
        body: data,
      }),
      invalidatesTags: tagList(TAGS.DONATION),
    }),
    verifyCertificate: builder.query({
      query: (code) => DONATION_API_URLS.VERIFY_CERTIFICATE(code),
    }),
    downloadCertificate: builder.mutation({
      query: (donationId) => ({
        url: DONATION_API_URLS.DOWNLOAD_CERTIFICATE(donationId),
        responseHandler: (response) => response.blob(),
      }),
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
  useVerifyCertificateQuery,
  useDownloadCertificateMutation,
} = donationApi;

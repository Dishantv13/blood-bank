import { apiSlice } from "./apiSlice";
import { SEARCH_API_URLS } from "../enum/apiUrl";

export const searchApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    searchBloodAvailability: builder.query({
      query: ({ lat, lng, bloodGroup, radius, type }) => ({
        url: SEARCH_API_URLS.SEARCH_AVAILABILITY,
        params: { lat, lng, bloodGroup, radius, type },
      }),
    }),
  }),
  overrideExisting: false,
});

export const { useSearchBloodAvailabilityQuery } = searchApi;

import { apiSlice } from './apiSlice';
import { BLOOD_UNIT_API_URLS } from '../enum/apiUrl';
import { TAGS, tagListWithIds } from '../enum/tagType';

export const bloodUnitApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getBloodUnitInventory: builder.query({
      query: (params) => ({
        url: BLOOD_UNIT_API_URLS.GET_INVENTORY,
        method: 'GET',
        params,
      }),
      providesTags: (result) => tagListWithIds(TAGS.BLOOD_UNIT, result?.units || result),
    }),

    getExpiringBloodUnits: builder.query({
      query: (params) => ({
        url: BLOOD_UNIT_API_URLS.GET_EXPIRING,
        method: 'GET',
        params,
      }),
      providesTags: (result) => tagListWithIds(TAGS.BLOOD_UNIT, result?.units || result),
    }),

    updateScreeningStatus: builder.mutation({
      query: ({ unitId, results }) => ({
        url: BLOOD_UNIT_API_URLS.UPDATE_SCREENING(unitId),
        method: 'PATCH',
        body: { results },
      }),
      invalidatesTags: (result, error, { unitId }) => [
        { type: TAGS.BLOOD_UNIT, id: unitId },
        { type: TAGS.DASHBOARD, id: 'LIST' }
      ],
    }),

    refineBloodUnit: builder.mutation({
      query: ({ unitId, method }) => ({
        url: BLOOD_UNIT_API_URLS.REFINE_UNIT(unitId),
        method: 'POST',
        body: { method },
      }),
      invalidatesTags: [
        { type: TAGS.BLOOD_UNIT, id: 'LIST' },
        { type: TAGS.DASHBOARD, id: 'LIST' }
      ],
    }),

    addColdChainLog: builder.mutation({
      query: ({ unitId, logData }) => ({
        url: BLOOD_UNIT_API_URLS.ADD_COLD_CHAIN(unitId),
        method: 'POST',
        body: logData,
      }),
      invalidatesTags: (result, error, { unitId }) => [
        { type: TAGS.BLOOD_UNIT, id: unitId }
      ],
    }),

    splitBloodUnit: builder.mutation({
      query: ({ unitId, components }) => ({
        url: BLOOD_UNIT_API_URLS.SPLIT_UNIT(unitId),
        method: 'POST',
        body: { components },
      }),
      invalidatesTags: [
        { type: TAGS.BLOOD_UNIT, id: 'LIST' },
        { type: TAGS.DASHBOARD, id: 'LIST' }
      ],
    }),
  }),
});

export const {
  useGetBloodUnitInventoryQuery,
  useGetExpiringBloodUnitsQuery,
  useUpdateScreeningStatusMutation,
  useRefineBloodUnitMutation,
  useAddColdChainLogMutation,
  useSplitBloodUnitMutation,
} = bloodUnitApi;

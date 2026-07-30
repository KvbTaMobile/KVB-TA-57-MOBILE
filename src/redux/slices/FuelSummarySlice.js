// import { createSlice } from '@reduxjs/toolkit';

// const initialState = {
//   data: [],
//   count: 0,
// };

// const fuelSummarySlice = createSlice({
//   name: 'fuelSummary',
//   initialState,
//   reducers: {
//     setFuelData: (state, action) => {
//       state.data = action.payload.data;
//       state.count = action.payload.count;
//     },
//   },
// });

// export const { setFuelData } = fuelSummarySlice.actions;
// export default fuelSummarySlice.reducer;


// fuelSummarySlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  data: [],
  count: 0,
  pageNo: 1,
  hasNext: true,
  hasPrevious: false,
  refreshing: false,
};

const fuelSummarySlice = createSlice({
  name: 'fuelSummary',
  initialState,
  reducers: {
    setFuelData: (state, action) => {
      const { data, count, hasNext, hasPrevious, isRefresh } = action.payload;

      if (isRefresh) {
        state.data = data;
      } else {
        // Combine old and new data
        const combined = [...state.data, ...data];

        // Deduplicate by tour_id
        const uniqueData = [];
        const seenIds = new Set();

        for (const item of combined) {
          if (!seenIds.has(item.tour_id)) {
            seenIds.add(item.tour_id);
            uniqueData.push(item);
          }
        }
        

        state.data = uniqueData;
      }

      state.count = count;
      state.hasNext = hasNext;
      state.hasPrevious = hasPrevious;
      state.refreshing = false;
    },
    setPageNo: (state, action) => {
      state.pageNo = action.payload;
    },
    setRefreshing: (state, action) => {
      state.refreshing = action.payload;
    },
    resetFuelData: (state) => {
      Object.assign(state, initialState);
    }
  },
});


export const { setFuelData, setPageNo, setRefreshing, resetFuelData } = fuelSummarySlice.actions;
export default fuelSummarySlice.reducer;

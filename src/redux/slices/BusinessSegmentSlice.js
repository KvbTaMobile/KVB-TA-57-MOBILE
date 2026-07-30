import { createSlice } from '@reduxjs/toolkit';

// In BusinessSegmentSlice.js

const initialState = {
    segments: [],
    searchQuery: '',
    selectedSegment: null,
    page: 1,
  };
  
  const businessSegmentSlice = createSlice({
    name: 'businessSegment',
    initialState,
    reducers: {
      resetSegments: (state) => {
        state.segments = [];
        state.page = 1;
        state.hasNextPage = true;
      },
      appendSegments: (state, action) => {
        const newSegments = action.payload.filter(
          (newSeg) => !state.segments.some((seg) => seg.id === newSeg.id)
        );
        state.segments = [...state.segments, ...newSegments];
      },
      
      setSearchQuery: (state, action) => {
        state.searchQuery = action.payload;
        // reset page & segments on search query change
        state.segments = [];
        state.page = 1;
        state.hasNextPage = true;
      },
      setSelectedSegment: (state, action) => {
        state.selectedSegment = action.payload;
      },
      setPage: (state, action) => {
        state.page = action.payload;
      },
      setHasNextPage: (state, action) => {
        state.hasNextPage = action.payload;
      },
    },
  });
  
  export const {
    resetSegments,
    appendSegments,
    setSearchQuery,
    setSelectedSegment,
    setPage,
    setHasNextPage,
  } = businessSegmentSlice.actions;
  
  export default businessSegmentSlice.reducer;
  
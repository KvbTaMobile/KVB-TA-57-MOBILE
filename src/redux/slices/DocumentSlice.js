import { createSlice } from "@reduxjs/toolkit";

const document = createSlice({
  name: "document",
  initialState: {
    documentArray: [],
    documentDetail: null,

    timeLineArray: [],
    timeLineDetail: null,
  },
  reducers: {
    setDocumentArray: (state, action) => {
      state.documentArray = action.payload.data;
    },
    clearDocumentArray: (state, action) => {
      state.documentArray = [];
    },
    setDocumentDetail: (state, action) => {
      state.documentDetail = action.payload.data;
    },
    setTimeLineArray: (state, action) => {
      state.timeLineArray = action.payload.data;
    },
    clearTimeLineArray: (state, action) => {
      state.timeLineArray = [];
    },
    setTimeLineDetail: (state, action) => {
      state.timeLineDetail = action.payload.data;
    },
  },
});

export const {
  setDocumentArray,
  clearDocumentArray,
  setDocumentDetail,
  setTimeLineArray,
  clearTimeLineArray,
  setTimeLineDetail,
} = document.actions;
export default document.reducer;

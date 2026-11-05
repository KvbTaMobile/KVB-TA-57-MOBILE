import { createSlice } from "@reduxjs/toolkit";

const getTourStatusText = (id) => {
  switch (id) {
    case 1:
    case 2:
      return "Tour Request Submitted To Approver";
    case 3:
      return "Tour Request Approved";
    case 4:
      return "Tour Request Rejected";
    case 5:
      return "Tour Request Returned From Approver";
    case 6:
      return "Tour Request Forwarded";
    case 7:
      return "Tour Cancel Requested";
    case 8:
      return "Tour Cancel Approved";
    default:
      return "Unknown Status";
  }
};

const getTourApproverStatusText = (tour_status, apptype) => {
  if (apptype === "TOUR" || apptype === "tour") {
    switch (tour_status) {
      case "PENDING":
        return "PENDING";
      case "APPROVED":
        return "APPROVED";
      case "REJECTED":
        return "REJECTED";
      case "RETURNED":
        return "RETURNED";
      case "FORWARDED":
        return "FORWARDED";
      default:
        return "UNKNOWN TOUR STATUS";
    }
  } else if (apptype === "TourCancel") {
    switch (tour_status) {
      case "PENDING":
        return "TRAVEL CANCEL PENDING";
      case "APPROVED":
        return "TRAVEL CANCEL APPROVED";
      case "REJECTED":
        return "TRAVEL CANCEL REJECTED";
      case "RETURNED":
        return "TRAVEL CANCEL RETURNED";
      case "FORWARDED":
        return "TRAVEL CANCEL FORWARDED";
      default:
        return "UNKNOWN CANCEL STATUS";
    }
  } else {
    return "UNKNOWN APPLICATION TYPE";
  }
};

const getAdvanceStatusText = (id) => {
  switch (id) {
    case 1:
      return "Tour Advance Submitted";
    case 2:
      return "Tour Advance Submitted To Approver";
    case 3:
      return "Tour Advance Approved";
    case 4:
      return "Tour Advance Rejected";
    case 5:
      return "Tour Advance Returned From Approver";
    case 15:
      return "Tour Advance Cancel Submitted";
    default:
      return "Unknown Status";
  }
};

const TravelMaker = createSlice({
  name: "TravelMaker",
  initialState: {
    travelMakerSummaryArray: [],
    totalCount: 0,
    travelApproverSummaryArray: [],
    travelCancelMakerSummaryArray: [],
    travelCancelApproverSummaryArray: [],
    adminSummaryArray: [],
    advanceMakerSummaryArray: [],
    advanceApproverSummaryArray: [],
  },
  reducers: {
    setTravelMakerSummaryArray: (state, action) => {
      const travelArray = action.payload.data.map((item) => ({
        ...item,
        tour_status_text: getTourStatusText(item.tour_status_id),
        from: item.tour_status_id === 3 ? "CANCEL_MAKER" : "MAKER",
      }));
      state.travelMakerSummaryArray = [
        ...state.travelMakerSummaryArray,
        ...travelArray,
      ];
      state.totalCount = action.payload.count || 0;
    },

    setTravelApproverSummaryArray: (state, action) => {
      const travelArray = action.payload.data.map((item) => ({
        ...item,
        tour_status_text: getTourApproverStatusText(item.tour_status, item.apptype),
        from: "CHECKER",
      }));
      state.travelApproverSummaryArray = [
        ...state.travelApproverSummaryArray,
        ...travelArray,
      ];
      state.totalCount = action.payload.count || 0;
    },

    setTravelCancelMakerSummaryArray: (state, action) => {
      const travelArray = action.payload.data.map((item) => ({
        ...item,
        tour_status_text: item.tour_cancel_status,
        from: "CANCEL_MAKER",
      }));
      state.travelCancelMakerSummaryArray = [
        ...state.travelCancelMakerSummaryArray,
        ...travelArray,
      ];
      state.totalCount = action.payload.count || 0;
    },

    setTravelCancelApproverSummaryArray: (state, action) => {
      const travelArray = action.payload.data.map((item) => ({
        ...item,
        tour_status_text: item.tour_cancel_status,
        from: "CANCEL_CHECKER",
      }));
      state.travelCancelApproverSummaryArray = [
        ...state.travelCancelApproverSummaryArray,
        ...travelArray,
      ];
      state.totalCount = action.payload.count || 0;
    },

    setAdvanceMakerSummaryArray: (state, action) => {
      const advanceArray = action.payload.data.map((item) => ({
        ...item,
        tour_status_text: getAdvanceStatusText(item.advance_status_id),
        from: "ADVANCE_MAKER",
      }));
      state.advanceMakerSummaryArray = [
        ...state.advanceMakerSummaryArray,
        ...advanceArray,
      ];
      state.totalCount = action.payload.count || 0;
    },

   setAdvanceApproverSummaryArray: (state, action) => {
  const advanceArray = action.payload.data.map((item) => {
    // 🔑 Use item.advance_status_id or item.status (2) instead of item.tour_status ("APPROVED")
    const activeStatusId = item.advance_status_id ?? item.status;
    
    return {
      ...item,
      tour_status_text: getAdvanceStatusText(activeStatusId),
      from: "ADVANCE_CHECKER",
    };
  });
  
  state.advanceApproverSummaryArray = [
    ...state.advanceApproverSummaryArray,
    ...advanceArray,
  ];
  state.totalCount = action.payload.count || 0;
},

    clearTravelMakerSummaryArray: (state) => {
      state.travelMakerSummaryArray = [];
    },
    clearTravelApproverSummaryArray: (state) => {
      state.travelApproverSummaryArray = [];
    },
    clearTravelCancelMakerSummaryArray: (state) => {
      state.travelCancelMakerSummaryArray = [];
    },
    clearTravelCancelApproverSummaryArray: (state) => {
      state.travelCancelApproverSummaryArray = [];
    },
    clearAdvanceMakerSummaryArray: (state) => {
      state.advanceMakerSummaryArray = [];
    },
    clearAdvanceApproverSummaryArray: (state) => {
      state.advanceApproverSummaryArray = [];
    },
    setAdminSummaryArray: (state, action) => {
      const travelArray = action.payload.data.map((item) => ({
        ...item,
        tour_status_text: getTourApproverStatusText(item.tour_status, item.apptype),
        from: "ADMIN",
      }));
      state.adminSummaryArray = [
        ...state.adminSummaryArray,
        ...travelArray,
      ];
      state.totalCount = action.payload.count || 0;
    },
    clearAdminSummaryArray: (state) => {
      state.adminSummaryArray = [];
    },
  },
});

export const {
  setTravelMakerSummaryArray,
  clearTravelMakerSummaryArray,
  setTravelApproverSummaryArray,
  clearTravelApproverSummaryArray,
  setTravelCancelMakerSummaryArray,
  clearTravelCancelMakerSummaryArray,
  setTravelCancelApproverSummaryArray,
  clearTravelCancelApproverSummaryArray,
  setAdvanceMakerSummaryArray,
  clearAdvanceMakerSummaryArray,
  setAdvanceApproverSummaryArray,
  clearAdvanceApproverSummaryArray,
  setAdminSummaryArray,
  clearAdminSummaryArray,
} = TravelMaker.actions;

export default TravelMaker.reducer;
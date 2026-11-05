
// src/redux/rtk_query/apiSlice.js
import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithRefresh } from "./baseQueryWithRefresh";
import { Environment } from "../../environment/Environment";

/*
|--------------------------------------------------------------------------
| API SLICE
|--------------------------------------------------------------------------
*/

export const apiSlice = createApi({
  reducerPath: "api",

  baseQuery: baseQueryWithRefresh,

  tagTypes: [
    "Auth",
    "PaymentAction",
    "Task",
    "AttendanceFix",
    "Sprint",
    "AttendanceFixChange",
    "LeaveRequest",
    "Checkin",
    "FuelAllowance",
    "OdRequest",
    "AttendanceRequests",

    // Additional tags
    "HsnMaster",
    "MiscellaneousExpense",
    "IncidentalExpense",
    "CommonDropdown",
    "LodgingExpense",
    "TravelExpense",
    "DeputationSummary",
    "PackagingFreight",
  ],

  endpoints: (builder) => ({

    //======================================================================
    // USER SERVICE
    //======================================================================

    getPublicKey: builder.mutation({
      query: () => ({
        url: `${Environment.userServiceUrl}/usrserv/get_public_key`,
        method: "POST",
      }),
    }),

    login: builder.mutation({
      query: (data) => ({
        url: `${Environment.userServiceUrl}/usrserv/auth_token`,
        method: "POST",
        body: data,
      }),
    }),

    userModules: builder.query({
      query: () => ({
        url: `${Environment.userServiceUrl}/usrserv/user_modules`,
        method: "GET",
      }),
    }),

    logout: builder.mutation({
      query: () => ({
        url: `${Environment.userServiceUrl}/usrserv/logout`,
        method: "POST",
      }),
    }),

    getCaptacha: builder.query({
      query: () => ({
        url: `${Environment.userServiceUrl}/usrserv/generate_captcha`,
        method: "GET",
      }),
    }),

    getEntity: builder.query({
      query: () => ({
        url: `${Environment.userServiceUrl}/usrserv/get_entity`,
        method: "GET",
      }),
    }),

    pushNotification: builder.mutation({
      query: (data) => ({
        url: `${Environment.userServiceUrl}/usrserv/pushnotification`,
        method: "POST",
        body: data,
      }),
    }),

    searchEmployee: builder.query({
      query: ({ query = "", page = 1 }) => ({
        url: `${Environment.userServiceUrl}/usrserv/searchemployee`,
        method: "GET",
        params: {
          query,
          page,
        },
      }),
    }),

    EmployeeDetailsUpdate: builder.query({
      query: (emp_id) => ({
        url: `${Environment.userServiceUrl}/usrserv/employee/${emp_id}`,
        method: "GET",
      }),
    }),

    forgotPassword: builder.mutation({
      query: (data) => ({
        url: `${Environment.userServiceUrl}/usrserv/forgetpassword`,
        method: "POST",
        body: data,
      }),
    }),

    departmentDetailGet: builder.query({
      query: (emp_id) => ({
        url: `${Environment.userServiceUrl}/usrserv/department_details/${emp_id}`,
        method: "GET",
      }),
    }),

    branchList: builder.query({
      query: ({ name = "", query = "", page = 1 } = {}) => {
        let q = query || name || "";
        if (typeof q === "object") {
          q = q?.name || q?.code || "";
        }
        return {
          url: `${Environment.userServiceUrl}/usrserv/search_employeebranch`,
          method: "GET",
          params: {
            query: String(q || ""),
            page,
          },
        };
      },
    }),

    searchBranch: builder.query({
      query: ({ query = "", page = 1, display = "" } = {}) => ({
        url: `${Environment.userServiceUrl}/usrserv/search_branch`,
        method: "GET",
        params: {
          query,
          page,
          ...(display ? { display } : {}),
        },
      }),
    }),

    getEmployeeBranch: builder.query({
      query: (page = 1) => ({
        url: `${Environment.userServiceUrl}/usrserv/search_employeebranch`,
        method: "GET",
        params: {
          page,
        },
      }),
    }),

    employeeList: builder.query({
      query: (params_data = {}) => {
        const branch = params_data.branch ?? params_data.branchId ?? 0;
        const { branch: _b, branchId: _bi, ...queryParams } = params_data;

        const params = new URLSearchParams();

        Object.entries(queryParams).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            let strVal = "";
            if (typeof value === "object") {
              strVal = value.name || value.query || value.code || "";
            } else {
              strVal = String(value);
            }
            if (strVal !== "[object Object]") {
              params.append(key, strVal);
            } else {
              params.append(key, "");
            }
          }
        });

        return {
          url: `${Environment.userServiceUrl}/usrserv/branchwise_employee_get/${branch}?${params.toString()}`,
          method: "GET",
        };
      },
    }),

    EmpBranch: builder.query({
      query: (emp_id) => ({
        url: `${Environment.userServiceUrl}/usrserv/emp_empbranch/${emp_id}`,
        method: "GET",
      }),
    }),

    //======================================================================
    // TA SERVICE - TOUR
    //======================================================================

    travelMakerSummary: builder.query({
      query: (params_data = {}) => {
        const params = new URLSearchParams();

        Object.entries(params_data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });

        return {
          url: `${Environment.taServiceUrl}/taserv/tourdata?${params.toString()}`,
          method: "GET",
        };
      },
    }),

    empDetails: builder.query({
      query: (params_data = {}) => {
        const params = new URLSearchParams();

        Object.entries(params_data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });

        return {
          url: `${Environment.taServiceUrl}/taserv/emp_details_get?${params.toString()}`,
          method: "GET",
        };
      },
    }),

    tourReasonList: builder.query({
      query: ({ name = "", page = 1 } = {}) => ({
        url: `${Environment.taServiceUrl}/taserv/tourreason`,
        method: "GET",
        params: {
          name,
          page,
        },
      }),
    }),

    tourSubmit: builder.mutation({
      query: ({ data }) => ({
        url: `${Environment.taServiceUrl}/taserv/tour`,
        method: "POST",
        body: data,
      }),
    }),

    tourDataGet: builder.query({
      query: ({ tour_id } = {}) => {
        if (
          tour_id === undefined ||
          tour_id === null ||
          String(tour_id).trim() === ""
        ) {
          throw new Error("tourDataGet requires a valid tour_id");
        }

        return {
          url: `${Environment.taServiceUrl}/taserv/tourdata/${encodeURIComponent(
            String(tour_id)
          )}`,
          method: "GET",
        };
      },
    }),

    documentDataGet: builder.query({
      query: (id) => ({
        url: `${Environment.taServiceUrl}/taserv/fetch_documents/${id}`,
        method: "GET",
      }),
    }),

    tourApprove: builder.mutation({
      query: ({ data }) => ({
        url: `${Environment.taServiceUrl}/taserv/tourapprove`,
        method: "POST",
        body: data,
      }),
    }),

    tourReject: builder.mutation({
      query: ({ data }) => ({
        url: `${Environment.taServiceUrl}/taserv/tourreject`,
        method: "POST",
        body: data,
      }),
    }),

    tourReturn: builder.mutation({
      query: ({ data }) => ({
        url: `${Environment.taServiceUrl}/taserv/tourreturn`,
        method: "POST",
        body: data,
      }),
    }),

    tourForward: builder.mutation({
      query: ({ data }) => ({
        url: `${Environment.taServiceUrl}/taserv/tourforward`,
        method: "POST",
        body: data,
      }),
    }),

    tourCancel: builder.mutation({
      query: ({ data }) => ({
        url: `${Environment.taServiceUrl}/taserv/tourcancel`,
        method: "POST",
        body: data,
      }),
    }),

    holidayCheck: builder.mutation({
      query: (params_data = {}) => {
        const params = new URLSearchParams({
          onbehalf: "0",
          reason: "",
          tour_id: "0",
          ...params_data,
        });

        return {
          url: `${Environment.taServiceUrl}/taserv/tourdate_check?${params.toString()}`,
          method: "POST",
          body: {},
        };
      },
    }),

    commonDropDownGet: builder.query({
      query: (key) => ({
        url: `${Environment.taServiceUrl}/taserv/common_dropdown_get/${key}`,
        method: "GET",
      }),

      providesTags: (result, error, key) => [
        {
          type: "CommonDropdown",
          id: key,
        },
      ],
    }),

    agingDropdown: builder.query({
      query: ({ page = 1, data = "" } = {}) => ({
        url: `${Environment.taServiceUrl}/taserv/aging_dropdown?page=${page}&data=${data}`,
        method: "GET",
      }),
    }),

    //======================================================================
    // INCIDENTAL EXPENSE
    //======================================================================

    getIncidentalTravelMode: builder.query({
      query: () => ({
        url: `${Environment.taServiceUrl}/taserv/common_dropdown_get/incidental_travelmode`,
        method: "GET",
      }),

      transformResponse: (response) => response ?? [],
    }),

    getIncidentalExpense: builder.query({
      query: (tour_no) => ({
        url: `${Environment.taServiceUrl}/taserv/incidental/tour/${tour_no}`,
        method: "GET",
      }),
      providesTags: (result, error, tour_no) => [
        {
          type: "IncidentalExpense",
          id: tour_no,
        },
      ],
    }),

    incidentalLogic: builder.mutation({
      query: (payload) => ({
        url: `${Environment.taServiceUrl}/taserv/incidental/logic`,
        method: "POST",
        body: payload,
      }),
    }),

    incidentalCreate: builder.mutation({
      query: (payload) => ({
        url: `${Environment.taServiceUrl}/taserv/incidental`,
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["IncidentalExpense"],
    }),

    deleteIncidental: builder.mutation({
      query: (id) => ({
        url: `${Environment.taServiceUrl}/taserv/incidental/tour/${id}`,
        method: "POST",
        body: {},
      }),
      invalidatesTags: ["IncidentalExpense"],
    }),

    approveIncidental: builder.mutation({
      query: ({ tourId, payload }) => ({
        url: `${Environment.taServiceUrl}/taserv/expamount?tour_id=${tourId}&expense_id=3`,
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["IncidentalExpense"],
    }),

    searchHsn: builder.query({
      query: ({ query = "", page = 1 } = {}) => ({
        url: `${Environment.masterServiceUrl}/mstserv/search_hsn`,
        method: "GET",
        params: {
          query,
          page,
        },
      }),

      transformResponse: (response) => ({
        data: response?.data ?? [],
        pagination: response?.pagination ?? {
          has_next: false,
          has_previous: false,
          index: 1,
          limit: 10,
        },
      }),

      providesTags: ["HsnMaster"],
    }),

    fetchAttention: builder.query({
      query: () => ({
        url: `${Environment.taServiceUrl}/taserv/emp_details_get`,
        method: "GET",
      }),

      transformResponse: (response) => response ?? null,
    }),

    validateGstNo: builder.query({
      query: (gstNo) => ({
        url: `${Environment.mstServiceUrl}/mstserv/validate_gst`,
        method: "GET",
        params: {
          gstNo,
        },
      }),

      transformResponse: (response) => response?.data ?? null,
    }),

    fetchTourDetails: builder.query({
      query: (tourNo) => ({
        url: `${Environment.taServiceUrl}/taserv/eclaim_tour/${tourNo}`,
        method: "GET",
      }),

      transformResponse: (response) => response?.data ?? null,

      providesTags: (result, error, tourNo) => [
        {
          type: "IncidentalExpense",
          id: tourNo,
        },
      ],
    }),

    submitIncidentalExpense: builder.mutation({
      query: (formData) => ({
        url: `${Environment.taServiceUrl}/taserv/incidental_expense/submit`,
        method: "POST",
        body: formData,
      }),

      invalidatesTags: ["IncidentalExpense"],
    }),

    validateSupplierGst: builder.query({
      query: ({ value }) => ({
        url: `${Environment.vendorServiceUrl}/venserv/validate`,
        method: "GET",
        params: {
          type: "gst",
          value,
        },
      }),
    }),

    //======================================================================
    // MISCELLANEOUS EXPENSE
    //======================================================================

    getMiscellaneousTour: builder.query({
      query: (tourId) => ({
        url: `${Environment.taServiceUrl}/taserv/misc/tour/${tourId}`,
        method: "GET",
      }),

      providesTags: ["MiscellaneousExpense"],
    }),

    miscellaneousCreate: builder.mutation({
      query: (body) => ({
        url: `${Environment.taServiceUrl}/taserv/misc`,
        method: "POST",
        body,
      }),

      invalidatesTags: ["MiscellaneousExpense"],
    }),

    getMiscEligibleAmount: builder.mutation({
      query: (body) => ({
        url: `${Environment.taServiceUrl}/taserv/misc/eligible_amount`,
        method: "POST",
        body,
      }),
    }),

    getMiscTourExpense: builder.query({
      query: (tourId) => ({
        url: `${Environment.taServiceUrl}/taserv/misc/tour/${tourId}`,
        method: "GET",
      }),
      providesTags: (result, error, tourId) => [
        { type: "MiscellaneousExpense", id: tourId },
      ],
    }),

    miscCreate: builder.mutation({
      query: (payload) => ({
        url: `${Environment.taServiceUrl}/taserv/misc`,
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["MiscellaneousExpense"],
    }),

    miscDelete: builder.mutation({
      query: (id) => ({
        url: `${Environment.taServiceUrl}/taserv/misc/tour/${id}`,
        method: "POST",
        body: {},
      }),
      invalidatesTags: ["MiscellaneousExpense"],
    }),

    miscLogic: builder.mutation({
      query: (payload) => ({
        url: `${Environment.taServiceUrl}/taserv/misc/logic`,
        method: "POST",
        body: payload,
      }),
    }),

    miscApprove: builder.mutation({
      query: ({ tourId, payload }) => ({
        url: `${Environment.taServiceUrl}/taserv/expamount?tour_id=${tourId}&expense_id=6`,
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["MiscellaneousExpense"],
    }),

    // POST /usrserv/refreshtoken
    refreshToken: builder.mutation({
      query: () => ({
        url: `${Environment.userServiceUrl}/usrserv/refreshtoken`,
        method: "POST",
        body: {},
      }),
    }),

    // GET /taserv/common_dropdown_get/misc_reason
    getMiscReasonDropdown: builder.query({
      query: () => ({
        url: `${Environment.taServiceUrl}/taserv/common_dropdown_get/misc_reason`,
        method: "GET",
      }),
      transformResponse: (rows = []) =>
        rows.map((r) => ({
          id: r.id,
          label: r.name,
          value: r.value,
        })),
    }),

    // GET /taserv/common_dropdown_get/conv_center
    getConvCenterDropdown: builder.query({
      query: () => ({
        url: `${Environment.taServiceUrl}/taserv/common_dropdown_get/conv_center`,
        method: "GET",
      }),
      transformResponse: (rows = []) =>
        rows.map((r) => ({
          id: r.id,
          label: r.name,
          value: r.value,
        })),
    }),

    // GET /taserv/common_dropdown_get/misc_res
    getMiscResDropdown: builder.query({
      query: () => ({
        url: `${Environment.taServiceUrl}/taserv/common_dropdown_get/misc_res`,
        method: "GET",
      }),
      transformResponse: (rows = []) =>
        rows.map((r) => ({
          id: r.id,
          label: r.name,
          value: r.value,
        })),
    }),

    // GET /taserv/misc/tour/:tourId
    getTourMiscExpense: builder.query({
      query: (tourId) => ({
        url: `${Environment.taServiceUrl}/taserv/misc/tour/${tourId}`,
        method: "GET",
      }),
      transformResponse: (res) => res?.data ?? [],
      providesTags: (result, error, tourId) => [
        { type: "MiscellaneousExpense", id: tourId },
      ],
    }),

    // POST /taserv/misc/tour/:tourId
    saveTourMiscExpense: builder.mutation({
      query: ({ tourId, rows }) => ({
        url: `${Environment.taServiceUrl}/taserv/misc/tour/${tourId}`,
        method: "POST",
        body: { data: rows },
      }),
      invalidatesTags: (result, error, { tourId }) => [
        { type: "MiscellaneousExpense", id: tourId },
      ],
    }),

    //======================================================================
    // CLIENT / CITY
    //======================================================================

    clientListTa: builder.query({
      query: (params_data = {}) => {
        const params = new URLSearchParams();

        Object.entries(params_data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });

        return {
          url: `${Environment.taServiceUrl}/taserv/frequent_client?${params.toString()}`,
          method: "GET",
        };
      },
    }),

    cityList: builder.query({
      query: (params_data = {}) => {
        const params = new URLSearchParams();

        Object.entries(params_data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });

        return {
          url: `${Environment.taServiceUrl}/taserv/frequent_city?${params.toString()}`,
          method: "GET",
        };
      },
    }),

    insertCity: builder.query({
      query: ({ city_name = "", page = 1 } = {}) => ({
        url: `${Environment.taServiceUrl}/taserv/insert_ta_city`,
        method: "GET",
        params: {
          city_name,
          page,
        },
      }),
    }),

    deleteRequirement: builder.mutation({
      query: (params_data = {}) => {
        const params = new URLSearchParams();

        Object.entries(params_data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });

        return {
          url: `${Environment.taServiceUrl}/taserv/delete_travel_requirements?${params.toString()}`,
          method: "DELETE",
        };
      },
    }),

    //======================================================================
    // ADMIN / APPROVAL
    //======================================================================

    adminReserv: builder.mutation({
      query: ({ data }) => ({
        url: `${Environment.taServiceUrl}/taserv/admin_reserv`,
        method: "POST",
        body: data,
      }),
    }),

    reqReject: builder.mutation({
      query: ({ data }) => ({
        url: `${Environment.taServiceUrl}/taserv/requirement_reject`,
        method: "POST",
        body: data,
      }),
    }),

    onBehalfList: builder.query({
      query: (params_data = {}) => {
        const params = new URLSearchParams();

        Object.entries(params_data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });

        return {
          url: `${Environment.taServiceUrl}/taserv/onbehalf_emp_get?${params.toString()}`,
          method: "GET",
        };
      },
    }),

    travelApproveSummary: builder.query({
      query: (params_data = {}) => {
        const params = new URLSearchParams();

        Object.entries(params_data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });

        return {
          url: `${Environment.taServiceUrl}/taserv/tourapprove/${params_data?.type}?${params.toString()}`,
          method: "GET",
        };
      },
    }),

    ExpenseApprovalSummarry: builder.query({
      query: (params_data = {}) => {
        const params = new URLSearchParams();

        Object.entries(params_data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });

        return {
          url: `${Environment.taServiceUrl}/taserv/tourapprove/claim?${params.toString()}`,
          method: "GET",
        };
      },
    }),

    approverList: builder.query({
      query: ({
        name = "",
        page = 1,
        branch = 0,
        type = "tour",
      } = {}) => ({
        url: `${Environment.taServiceUrl}/taserv/branch_approver_get/${type}/branch/${branch}`,
        method: "GET",
        params: {
          name,
          page,
        },
      }),
    }),

    //======================================================================
    // EXPENSE SUMMARY
    //======================================================================

    getExpenseSummary: builder.query({
      query: (params_data = {}) => {
        const params = new URLSearchParams();

        Object.entries(params_data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });

        return {
          url: `${Environment.taServiceUrl}/taserv/expense_summary?${params.toString()}`,
          method: "GET",
        };
      },
    }),

    getExpenseDetails: builder.query({
      query: (tour_no) => ({
        url: `${Environment.taServiceUrl}/taserv/claimreq/tour/${tour_no}`,
        method: "GET",
      }),
    }),

    getApprovalFlow: builder.query({
      query: (tour_no) => ({
        url: `${Environment.taServiceUrl}/taserv/approval_flow_get`,
        method: "GET",
        params: {
          type: "all",
          tourid: tour_no,
        },
      }),
    }),

    getExpenseList: builder.query({
      query: () => ({
        url: `${Environment.taServiceUrl}/taserv/expenselist`,
        method: "GET",
      }),
    }),

    ExpenseDelete: builder.mutation({
      query: ({ tour_id, expid }) => ({
        url: `${Environment.taServiceUrl}/taserv/expense_delete/${tour_id}/tour/${expid}`,
        method: "POST",
        body: {},
      }),
    }),

    ExpenseSubmit: builder.mutation({
      query: (data) => ({
        url: `${Environment.taServiceUrl}/taserv/expense/submit`,
        method: "POST",
        body: data,
      }),
    }),

    //======================================================================
    // BUSINESS SEGMENT
    //======================================================================

    getBusinessSegments: builder.query({
      query: ({
        query = "",
        page = 1,
      } = {}) => ({
        url: `${Environment.userServiceUrl}/usrserv/employee_bs_data`,
        method: "GET",
        params: {
          query,
          page,
        },
      }),
    }),

    //======================================================================
    // CC SEGMENTS
    //======================================================================

    getCcSegments: builder.query({
      query: ({
        query = "",
        bs_id,
        page = 1,
      } = {}) => ({
        url: `${Environment.userServiceUrl}/usrserv/employee_cc_data/${bs_id || 0}`,
        method: "GET",
        params: {
          query,
          page,
        },
      }),
    }),

    ccSearch: builder.query({
      query: ({
        bs_id,
        query = "",
        page = 1,
      } = {}) => ({
        url: `${Environment.userServiceUrl}/usrserv/employee_cc_data/${bs_id || 0}`,
        method: "GET",
        params: {
          query,
          page,
        },
      }),
    }),

    //======================================================================
    // FUEL ALLOWANCE
    //======================================================================

    getFuelAllowanceSummary: builder.query({
      query: ({
        page = 1,
        claim_amount,
        month_year,
      } = {}) => ({
        url: `${Environment.taServiceUrl}/taserv/fuel_allowance_summary`,
        method: "GET",
        params: {
          page,
          ...(claim_amount ? { claim_amount } : {}),
          ...(month_year ? { month_year } : {}),
        },
      }),
    }),

    getEmployeeDetailsForFuel: builder.query({
      query: () => ({
        url: `${Environment.taServiceUrl}/taserv/emp_details_get`,
        method: "GET",
      }),
    }),

    modeOfTravel: builder.query({
      query: () => ({
        url: `${Environment.taServiceUrl}/taserv/common_dropdown_get/modeoftravel`,
        method: "GET",
      }),
    }),

    getEligibleAmount: builder.mutation({
      query: (payload) => ({
        url: `${Environment.taServiceUrl}/taserv/eligible_amount_fuel`,
        method: "POST",
        body: payload,
      }),
    }),

    fuelAllowanceCreate: builder.mutation({
      query: (formData) => ({
        url: `${Environment.taServiceUrl}/taserv/fuel_allowance_create`,
        method: "POST",
        body: formData,
      }),
    }),

    getDateRelaxation: builder.query({
      query: ({
        tour_no = "",
        page = 1,
      } = {}) => ({
        url: `${Environment.taServiceUrl}/taserv/date_relaxation`,
        method: "GET",
        params: {
          tour_no,
          page,
        },
      }),
    }),

    updateDateRelaxationStatus: builder.mutation({
      query: (body) => ({
        url: `${Environment.taServiceUrl}/taserv/date_relaxation`,
        method: "POST",
        body,
      }),
    }),

    getFuelAllowanceAll: builder.query({
      query: ({
        page = 1,
        status = 2,
      } = {}) => ({
        url: `${Environment.taServiceUrl}/taserv/fuel_allowance_summary`,
        method: "GET",
        params: {
          page,
          status,
        },
      }),

      providesTags: (result, error, { status = 2 } = {}) => [
        {
          type: "FuelAllowance",
          id: `STATUS-${status}`,
        },
      ],

      keepUnusedDataFor: 300,
    }),

    getFuelAllowanceDetails: builder.query({
      query: (tourId) => ({
        url: `${Environment.taServiceUrl}/taserv/fuel_allowance_details/${tourId}`,
        method: "GET",
      }),
    }),

    getFuelDocuments: builder.query({
      query: (tourId) => ({
        url: `${Environment.taServiceUrl}/taserv/fuel_document_get`,
        method: "GET",
        params: {
          tour_id: tourId,
          ref_type: 4,
        },
      }),
    }),

    fuelApproval: builder.mutation({
      query: (data) => ({
        url: `${Environment.taServiceUrl}/taserv/fuel_approve`,
        method: "POST",
        body: data,
      }),
    }),

    fuelReject: builder.mutation({
      query: (data) => ({
        url: `${Environment.taServiceUrl}/taserv/fuel_reject`,
        method: "POST",
        body: data,
      }),
    }),

    fuelReturn: builder.mutation({
      query: (data) => ({
        url: `${Environment.taServiceUrl}/taserv/fuel_return`,
        method: "POST",
        body: data,
      }),
    }),

    fuelApprovalFlow: builder.query({
      query: ({
        type,
        tour_id,
      }) => ({
        url: `${Environment.taServiceUrl}/taserv/fuel_approval_flow_get`,
        method: "GET",
        params: {
          type,
          tour_id,
        },
      }),
    }),

    fuelAllowanceUpload: builder.mutation({
      query: (data) => ({
        url: `${Environment.taServiceUrl}/taserv/fuelallowance_upload`,
        method: "POST",
        body: data,
      }),
    }),

    fuelAllowanceDownload: builder.query({
      query: () => ({
        url: `${Environment.taServiceUrl}/taserv/fuelallowance_download`,
        method: "GET",
      }),
    }),

    rmApproval: builder.mutation({
      query: ({
        tourId,
        comment,
      }) => ({
        url: `${Environment.taServiceUrl}/taserv/fuel_rm_skip/${tourId}`,
        method: "POST",
        body: {
          comment,
        },
      }),
    }),

    //======================================================================
    // CHAT
    //======================================================================

    getChatSummary: builder.query({
      query: ({
        page = 1,
      } = {}) => ({
        url: `${Environment.taServiceUrl}/taserv/chat_summary`,
        method: "GET",
        params: {
          page,
        },
      }),
    }),

    deleteChat: builder.mutation({
      query: (params_data = {}) => {
        const params = new URLSearchParams();

        Object.entries(params_data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });

        return {
          url: `${Environment.taServiceUrl}/taserv/delete_chat_box?${params.toString()}`,
          method: "DELETE",
        };
      },
    }),

    getChatBox: builder.query({
      query: ({
        tourid,
        page = 1,
      }) => ({
        url: `${Environment.taServiceUrl}/taserv/chat_box`,
        method: "GET",
        params: {
          tourid,
          page,
        },
      }),
    }),

    postChatBox: builder.mutation({
      query: ({
        tourid,
        approver_id,
        comment,
        type = 1,
      }) => ({
        url: `${Environment.taServiceUrl}/taserv/chat_box`,
        method: "POST",
        body: {
          request: tourid,
          ref_type: 1,
          approver_id,
          comment,
          type,
        },
      }),
    }),

    postChatBoxView: builder.mutation({
      query: ({
        tourid,
      }) => ({
        url: `${Environment.taServiceUrl}/taserv/chat_box_view`,
        method: "POST",
        params: {
          tourid,
        },
        body: {},
      }),
    }),

    adminSummary: builder.query({
      query: (params_data = {}) => {
        const params = new URLSearchParams();

        Object.entries(params_data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });

        return {
          url: `${Environment.taServiceUrl}/taserv/admin_summary?${params.toString()}`,
          method: "GET",
        };
      },
    }),

    //======================================================================
    // LODGING
    //======================================================================

    getLodging: builder.query({
      query: (tour_no) => ({
        url: `${Environment.taServiceUrl}/taserv/lodging/tour/${tour_no}`,
        method: "GET",
      }),
      providesTags: ["LodgingExpense"],
    }),

    lodgingCreate: builder.mutation({
      query: (payload) => ({
        url: `${Environment.taServiceUrl}/taserv/lodging`,
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["LodgingExpense"],
    }),

    LodgingEligibleAmt: builder.mutation({
      query: (payload) => ({
        url: `${Environment.taServiceUrl}/taserv/lodging/logic`,
        method: "POST",
        body: payload,
      }),
    }),

    lodgingApprove: builder.mutation({
      query: ({ tourId, payload }) => ({
        url: `${Environment.taServiceUrl}/taserv/expamount?tour_id=${tourId}&expense_id=5`,
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["LodgingExpense"],
    }),

    deleteLodging: builder.mutation({
      query: (id) => ({
        url: `${Environment.taServiceUrl}/taserv/lodging/tour/${id}`,
        method: "POST",
        body: {},
      }),
      invalidatesTags: ["LodgingExpense"],
    }),

    deleteLodgingDependent: builder.mutation({
      query: (params) => ({
        url: `${Environment.taServiceUrl}/taserv/dependent_delete?${params}`,
        method: "POST",
      }),
    }),

    getBankGstList: builder.query({
      query: ({ query = "", bankacc_gstno = "", page = 1 } = {}) => ({
        url: `${Environment.userServiceUrl}/usrserv/fetch_gstin_values`,
        method: "GET",
        params: {
          page,
          bankacc_gstno: bankacc_gstno || query || "",
        },
      }),
    }),

    //======================================================================
    // LOCAL CONVEYANCE
    //======================================================================

    getLocalConv: builder.query({
      query: (tour_no) => ({
        url: `${Environment.taServiceUrl}/taserv/localconv/tour/${tour_no}`,
        method: "GET",
      }),
    }),

    LocalConvCreate: builder.mutation({
      query: ({ data }) => ({
        url: `${Environment.taServiceUrl}/taserv/localconv`,
        method: "POST",
        body: {
          data,
        },
      }),
    }),

    LocalConvEligibleAmt: builder.mutation({
      query: (payload) => ({
        url: `${Environment.taServiceUrl}/taserv/localconv/logic`,
        method: "POST",
        body: payload,
      }),
    }),

    deleteLocalConv: builder.mutation({
      query: (id) => ({
        url: `${Environment.taServiceUrl}/taserv/localconv/tour/${id}`,
        method: "POST",
        body: {},
      }),
    }),

    //======================================================================
    // DAILY REIMBURSEMENT
    //======================================================================

    getDailyReimbursement: builder.query({
      query: (tour_no) => ({
        url: `${Environment.taServiceUrl}/taserv/dailydeim/tour/${tour_no}`,
        method: "GET",
      }),
    }),

    dailydeimLogic: builder.mutation({
      query: (payload) => ({
        url: `${Environment.taServiceUrl}/taserv/dailydeim/logic`,
        method: "POST",
        body: payload,
      }),
    }),

    dailydeimCreate: builder.mutation({
      query: ({ data }) => ({
        url: `${Environment.taServiceUrl}/taserv/dailydeim`,
        method: "POST",
        body: {
          data,
        },
      }),
    }),

    getAllowance: builder.query({
      query: ({ city = '', employeegrade = '', expensename = 'Daily Diem', page = 1 } = {}) => ({
        url: `${Environment.taServiceUrl}/taserv/allowance?city=${encodeURIComponent(city)}&employeegrade=${encodeURIComponent(employeegrade)}&expensename=${encodeURIComponent(expensename)}&page=${page}`,
        method: "GET",
      }),
    }),

    //======================================================================
    // ASSOCIATED EXPENSE
    //======================================================================

    getAssociatedExpense: builder.query({
      query: (tour_no) => ({
        url: `${Environment.taServiceUrl}/taserv/associate/tour/${tour_no}`,
        method: "GET",
      }),
    }),

    AssociateCreate: builder.mutation({
      query: (payload) => ({
        url: `${Environment.taServiceUrl}/taserv/associate`,
        method: "POST",
        body: payload,
      }),
    }),

    getIbaSummary: builder.query({
      query: (tourId) => ({
        url: `${Environment.taServiceUrl}/taserv/uservehicle_iba/tour/${tourId}`,
        method: "GET",
      }),
    }),

    ibaCreate: builder.mutation({
      query: (payload) => ({
        url: `${Environment.taServiceUrl}/taserv/uservehicle_iba`,
        method: "POST",
        body: payload,
      }),
    }),

    ibaEligibleAmt: builder.mutation({
      query: (payload) => ({
        url: `${Environment.taServiceUrl}/taserv/eligible_amount_iba`,
        method: "POST",
        body: payload,
      }),
    }),

    deleteIbaTrip: builder.mutation({
      query: (id) => ({
        url: `${Environment.taServiceUrl}/taserv/uservehicle_iba/tour/${id}`,
        method: "POST",
        body: {},
      }),
    }),

    ibaApprove: builder.mutation({
      query: ({ tourId, payload }) => ({
        url: `${Environment.taServiceUrl}/taserv/expamount?tour_id=${tourId}&expense_id=9`,
        method: "POST",
        body: payload,
      }),
    }),

    ibaSubmitApUser: builder.mutation({
      query: (payload) => ({
        url: `${Environment.taServiceUrl}/taserv/submit_apuser`,
        method: "POST",
        body: payload,
      }),
    }),

    getCommonDropdown: builder.query({
      query: (key) => ({
        url: `${Environment.taServiceUrl}/taserv/common_dropdown_get/${key}`,
        method: "GET",
      }),
    }),


    //======================================================================
    // TRAVEL EXPENSE
    //======================================================================

    travelSubmit: builder.mutation({
      query: (body) => ({
        url: `${Environment.taServiceUrl}/taserv/travel`,
        method: "POST",
        body: body?.data ? body : { data: body },
      }),
      invalidatesTags: ["TravelExpense"],
    }),

    getTravelExpense: builder.query({
      query: (tour_no) => ({
        url: `${Environment.taServiceUrl}/taserv/travel/tour/${tour_no}`,
        method: "GET",
      }),
      providesTags: ["TravelExpense"],
    }),

    approveTravelExpense: builder.mutation({
      query: ({ tourId, payload }) => ({
        url: `${Environment.taServiceUrl}/taserv/expamount?tour_id=${tourId}&expense_id=1`,
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["TravelExpense"],
    }),

    deleteTravelExpense: builder.mutation({
      query: (id) => ({
        url: `${Environment.taServiceUrl}/taserv/travel/tour/${id}`,
        method: "POST",
        body: {},
      }),
      invalidatesTags: ["TravelExpense"],
    }),

    //======================================================================
    // PACKAGING / FREIGHT
    //======================================================================

    getPackagingFreight: builder.query({
      query: (tour_no) => ({
        url: `${Environment.taServiceUrl}/taserv/packingmvg/tour/${tour_no}`,
        method: "GET",
      }),
    }),

    getPackingSummary: builder.query({
      query: ({ tourId, report = 0 }) => ({
        url: `${Environment.taServiceUrl}/taserv/packingmvg/tour/${tourId}${report ? "?report=1" : ""}`,
        method: "GET",
      }),
      providesTags: ["PackagingFreight"],
    }),

    packingCreate: builder.mutation({
      query: (body) => ({
        url: `${Environment.taServiceUrl}/taserv/packingmvg`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["PackagingFreight"],
    }),

    deletePacking: builder.mutation({
      query: (id) => ({
        url: `${Environment.taServiceUrl}/taserv/packingmvg/tour/${id}`,
        method: "POST",
        body: {},
      }),
      invalidatesTags: ["PackagingFreight"],
    }),

    packingEligibleAmt: builder.mutation({
      query: (body) => ({
        url: `${Environment.taServiceUrl}/taserv/packingmvg/logic`,
        method: "POST",
        body,
      }),
    }),

    packingApprove: builder.mutation({
      query: ({ tourId, payload }) => ({
        url: `${Environment.taServiceUrl}/taserv/expamount?tour_id=${tourId}&expense_id=7`,
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["PackagingFreight"],
    }),

    getPackingTwoWheelerDropdown: builder.query({
      query: () => ({
        url: `${Environment.taServiceUrl}/taserv/common_dropdown_get/packing_twowheeler`,
        method: "GET",
      }),
    }),

    getDecisionDropdown: builder.query({
      query: () => ({
        url: `${Environment.taServiceUrl}/taserv/common_dropdown_get/decision`,
        method: "GET",
      }),
    }),

    //======================================================================
    // LOCAL DEPUTATION
    //======================================================================

    getLocalDeputation: builder.query({
      query: (tour_no) => ({
        url: `${Environment.taServiceUrl}/taserv/localdeputation/tour/${tour_no}`,
        method: "GET",
      }),
    }),

    getTourGradeDetails: builder.query({
      query: (tourId) => ({
        url: `${Environment.taServiceUrl}/taserv/tourno_grade_get/${tourId}`,
        method: "GET",
      }),
    }),

    getDeputationSummary: builder.query({
      query: ({ tourId, report = 0 }) => ({
        url: `${Environment.taServiceUrl}/taserv/localdeputation/tour/${tourId}${report ? "?report=1" : ""}`,
        method: "GET",
      }),
      providesTags: ["DeputationSummary"],
    }),

    getDeputationCityList: builder.query({
      query: ({ city = "", employeeGrade = "", page = 1 } = {}) => ({
        url: `${Environment.taServiceUrl}/taserv/allowance`,
        method: "GET",
        params: {
          city,
          employeegrade: employeeGrade,
          expensename: "Local Deputation",
          page,
        },
      }),
      transformResponse: (response) => ({
        data: response?.data ?? [],
        pagination: response?.pagination ?? {
          has_next: false,
          has_previous: false,
          index: 1,
        },
      }),
    }),

    getDeputationEligible: builder.mutation({
      query: (body) => ({
        url: `${Environment.taServiceUrl}/taserv/localdeputation/logic`,
        method: "POST",
        body,
      }),
    }),

    localDeputationCreate: builder.mutation({
      query: (body) => ({
        url: `${Environment.taServiceUrl}/taserv/localdeputation`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["DeputationSummary"],
    }),

    deleteDeputation: builder.mutation({
      query: (id) => ({
        url: `${Environment.taServiceUrl}/taserv/localdeputation/tour/${id}`,
        method: "POST",
        body: {},
      }),
      invalidatesTags: ["DeputationSummary"],
    }),

    approveDeputation: builder.mutation({
      query: ({ tourId, payload }) => ({
        url: `${Environment.taServiceUrl}/taserv/expamount?tour_id=${tourId}&expense_id=8`,
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["DeputationSummary"],
    }),

    //======================================================================
    // MODE OF TRAVEL
    //======================================================================

    getmodeOfTravel: builder.query({
      query: () => ({
        url: `${Environment.taServiceUrl}/taserv/common_dropdown_get/mode_of_travel`,
        method: "GET",
      }),
    }),

    //======================================================================
    // EMPLOYEE BASE
    //======================================================================

    EmpBaseGet: builder.query({
      query: () => ({
        url: `${Environment.taServiceUrl}/taserv/employee_base_get`,
        method: "GET",
      }),
    }),

    //======================================================================
    // ADVANCE
    //======================================================================

    getAdvanceMakerSummary: builder.query({
      query: ({
        page = 1,
        val = "",
      } = {}) => ({
        url: `${Environment.taServiceUrl}/taserv/touradvance?page=${page}${val}`,
        method: "GET",
      }),
    }),

    getAdvanceEditDetails: builder.query({
      query: ({
        tour_no,
      }) => ({
        url: `${Environment.taServiceUrl}/taserv/touradvance/${tour_no}`,
        method: "GET",
      }),
    }),

    getAdvancemakerSummary: builder.query({
      query: ({
        page = 1,
        val = "",
      } = {}) => ({
        url: `${Environment.taServiceUrl}/taserv/advance_summary?page=${page}${val}`,
        method: "GET",
      }),
    }),

    getTourBsCcFetch: builder.query({
      query: ({
        reason,
      }) => ({
        url: `${Environment.taServiceUrl}/taserv/tour_bscc_fetch`,
        method: "GET",
        params: {
          reason,
        },
      }),
    }),

    getAdvanceApproverSummary: builder.query({
      query: ({
        status = 2,
        page = 1,
        val = "",
      } = {}) => ({
        url: `${Environment.taServiceUrl}/taserv/tourapprove/advance?status=${status}&page=${page}${val}`,
        method: "GET",
      }),
    }),

    //======================================================================
    // CANCEL
    //======================================================================

    getCancelMakerSummary: builder.query({
      query: ({
        type = "TourCancel",
        page = 1,
        val = "",
      } = {}) => ({
        url: `${Environment.taServiceUrl}/taserv/cancelled_data?type=${type}&page=${page}${val}`,
        method: "GET",
      }),
    }),

    getCancelApproverSummary: builder.query({
      query: ({
        type = "TourCancel",
        status = 2,
        page = 1,
        page_size = 10,
        val = "",
      } = {}) => ({
        url: `${Environment.taServiceUrl}/taserv/tourapprove/${type}?status=${status}&page=${page}&page_size=${page_size}${val}`,
        method: "GET",
      }),
    }),

    claimApprovalSummary: builder.query({
      query: (params_data = {}) => {
        const params = new URLSearchParams();
        Object.entries(params_data).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            params.append(key, String(value));
          }
        });
        return {
          url: `${Environment.taServiceUrl}/taserv/tourapprove/claim?${params.toString()}`,
          method: "GET",
        };
      },
    }),

    cancelDataGet: builder.query({
      query: (params = {}) => {
        const paramsData = new URLSearchParams();

        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            paramsData.append(key, String(value));
          }
        });

        return {
          url: `${Environment.taServiceUrl}/taserv/cancelled_data?${paramsData.toString()}`,
          method: "GET",
        };
      },
    }),

    listForCancelGet: builder.query({
      query: (params_data = {}) => {
        const params = new URLSearchParams();

        Object.entries(params_data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });

        return {
          url: `${Environment.taServiceUrl}/taserv/approved_data?${params.toString()}`,
          method: "GET",
        };
      },
    }),

    //======================================================================
    // ASSIGN APPROVER
    //======================================================================

    getAssignApproverSummary: builder.query({
      query: ({
        page = 1,
        branch_id = "",
        employee_id = "",
        val = "",
      } = {}) => {
        let queryString = `page=${page}`;
        if (branch_id) queryString += `&branch_id=${branch_id}`;
        if (employee_id) queryString += `&employee_id=${employee_id}`;
        if (val) queryString += val.startsWith("&") ? val : `&${val}`;
        return {
          url: `${Environment.taServiceUrl}/taserv/approverlist?${queryString}`,
          method: "GET",
        };
      },
    }),

    assignApprover: builder.mutation({
      query: (payload) => ({
        url: `${Environment.taServiceUrl}/taserv/approverlist`,
        method: "POST",
        body: payload,
      }),
    }),

    //======================================================================
    // ADVANCE RECOVERY
    //======================================================================

    getRecoverySummary: builder.mutation({
      query: (payload) => ({
        url: `${Environment.taServiceUrl}/taserv/recovery_summary`,
        method: "POST",
        body: payload,
      }),
    }),

    recoveryEdit: builder.mutation({
      query: (payload) => ({
        url: `${Environment.taServiceUrl}/taserv/recovery_jv_entry`,
        method: "POST",
        body: payload,
      }),
    }),

    recoveryJvEntry: builder.mutation({
      query: (payload) => ({
        url: `${Environment.taServiceUrl}/taserv/recovery_jv_entry`,
        method: "POST",
        body: payload,
      }),
    }),

    recoveryJvApprove: builder.mutation({
      query: (payload) => ({
        url: `${Environment.taServiceUrl}/taserv/recovery_jv_approve`,
        method: "POST",
        body: payload,
      }),
    }),

    //======================================================================
    // AP USER
    //======================================================================

    getApUserSummary: builder.query({
      query: ({
        page = 1,
        ...filters
      } = {}) => {
        const params = new URLSearchParams();

        params.append("page", String(page));

        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            params.append(key, String(value));
          }
        });

        return {
          url: `${Environment.taServiceUrl}/taserv/apuser_summary?${params.toString()}`,
          method: "GET",
        };
      },
    }),

    getSettlementStatusDropdown: builder.query({
      query: () => ({
        url: `${Environment.taServiceUrl}/taserv/settlement_status_drop_down`,
        method: "GET",
      }),
    }),

    getFailedTranStatusDropdown: builder.query({
      query: () => ({
        url: `${Environment.taServiceUrl}/ecfapserv/get_ecfstatus?failed_tran=true`,
        method: "GET",
      }),
    }),

    changeFailedTranStatus: builder.mutation({
      query: (data) => ({
        url: `${Environment.taServiceUrl}/ecfapserv/failed_tran_status_change`,
        method: "POST",
        body: data,
      }),
    }),

    repushFailedTran: builder.mutation({
      query: ({ id, status }) => ({
        url: `${Environment.taServiceUrl}/ecfapserv/failed_tran_repush?failed_type_status=${encodeURIComponent(status || "")}`,
        method: "POST",
        body: { invoice_header_id: id },
      }),
    }),

    getFailedViewEntry: builder.query({
      query: ({ crno, page = 1 }) => ({
        url: `${Environment.taServiceUrl}/entryserv/fetch_commonentrydetails/${encodeURIComponent(crno)}?page=${page}`,
        method: "GET",
      }),
    }),

    //======================================================================
    // TOUR REPORT
    //======================================================================

    tourReportGet: builder.query({
      query: (params_data = {}) => {
        const params = new URLSearchParams();

        const tourno = params_data.tourno ?? params_data.tour_no ?? "";
        const empid = params_data.empid ?? params_data.employee_id ?? "";
        const grade = params_data.grade ?? params_data.empgrade ?? "";
        const branchid = params_data.branchid ?? params_data.branch_id ?? "";
        const month = params_data.month ?? "";
        const crnno = params_data.crnno ?? params_data.crno ?? "";
        const pay_from_date = params_data.pay_from_date ?? params_data.payment_from_date ?? params_data.payfromdate ?? "";
        const pay_to_date = params_data.pay_to_date ?? params_data.payment_to_date ?? params_data.paytodate ?? "";
        const status = params_data.status ?? params_data.claimstatus_id ?? "";
        const page = params_data.page ?? 1;
        const form_date = params_data.form_date ?? params_data.from_date ?? params_data.fromdate ?? "";
        const to_date = params_data.to_date ?? params_data.todate ?? "";

        params.append("tourno", String(tourno));
        params.append("empid", String(empid));
        params.append("grade", String(grade));
        params.append("branchid", String(branchid));
        params.append("month", String(month));
        params.append("crnno", String(crnno));
        params.append("pay_from_date", String(pay_from_date));
        params.append("pay_to_date", String(pay_to_date));
        params.append("status", String(status));
        params.append("page", String(page));
        params.append("form_date", String(form_date));
        params.append("to_date", String(to_date));

        return {
          url: `${Environment.taServiceUrl}/taserv/report_tour_summary?${params.toString()}`,
          method: "GET",
        };
      },
    }),

    getTourReportSummary: builder.query({
      query: (params_data = {}) => {
        const params = new URLSearchParams();

        const tourno = params_data.tourno ?? params_data.tour_no ?? "";
        const empid = params_data.empid ?? params_data.employee_id ?? "";
        const grade = params_data.grade ?? params_data.empgrade ?? "";
        const branchid = params_data.branchid ?? params_data.branch_id ?? "";
        const month = params_data.month ?? "";
        const crnno = params_data.crnno ?? params_data.crno ?? "";
        const pay_from_date = params_data.pay_from_date ?? params_data.payment_from_date ?? params_data.payfromdate ?? "";
        const pay_to_date = params_data.pay_to_date ?? params_data.payment_to_date ?? params_data.paytodate ?? "";
        const status = params_data.status ?? params_data.claimstatus_id ?? "";
        const page = params_data.page ?? 1;
        const form_date = params_data.form_date ?? params_data.from_date ?? params_data.fromdate ?? "";
        const to_date = params_data.to_date ?? params_data.todate ?? "";

        params.append("tourno", String(tourno));
        params.append("empid", String(empid));
        params.append("grade", String(grade));
        params.append("branchid", String(branchid));
        params.append("month", String(month));
        params.append("crnno", String(crnno));
        params.append("pay_from_date", String(pay_from_date));
        params.append("pay_to_date", String(pay_to_date));
        params.append("status", String(status));
        params.append("page", String(page));
        params.append("form_date", String(form_date));
        params.append("to_date", String(to_date));

        return {
          url: `${Environment.taServiceUrl}/taserv/report_tour_summary?${params.toString()}`,
          method: "GET",
        };
      },
    }),

    reportStatusDropdown: builder.query({
      query: (page = 1) => ({
        url: `${Environment.taServiceUrl}/taserv/report_status_drop_down?page=${page}`,
        method: "GET",
      }),
    }),

    reportDownloadTourSummary: builder.query({
      query: (params_data = {}) => {
        const params = new URLSearchParams();
        const tourno = params_data.tourno ?? params_data.tour_no ?? "";
        const empbranch = params_data.empbranch ?? params_data.branchid ?? params_data.branch_id ?? "";
        const empid = params_data.empid ?? params_data.employee_id ?? "";
        const grade = params_data.grade ?? params_data.empgrade ?? "";
        const crnno = params_data.crnno ?? params_data.crno ?? "";
        const pay_from_date = params_data.pay_from_date ?? params_data.payment_from_date ?? "";
        const pay_to_date = params_data.pay_to_date ?? params_data.payment_to_date ?? "";
        const status = params_data.status ?? "";
        const from_date = params_data.from_date ?? params_data.form_date ?? "";
        const to_date = params_data.to_date ?? "";

        params.append("tourno", String(tourno));
        params.append("empbranch", String(empbranch));
        params.append("empid", String(empid));
        params.append("grade", String(grade));
        params.append("all_report", "1");
        params.append("crnno", String(crnno));
        params.append("pay_from_date", String(pay_from_date));
        params.append("pay_to_date", String(pay_to_date));
        params.append("status", String(status));
        params.append("from_date", String(from_date));
        params.append("to_date", String(to_date));

        return {
          url: `${Environment.taServiceUrl}/taserv/report_download_tour_summary?${params.toString()}`,
          method: "GET",
        };
      },
    }),

    reportDownloadProvisionSummary: builder.query({
      query: (params_data = {}) => {
        const params = new URLSearchParams();
        const tourno = params_data.tourno ?? params_data.tour_no ?? "";
        const from_date = params_data.from_date ?? params_data.form_date ?? "";
        const to_date = params_data.to_date ?? "";
        const month = params_data.month ?? "";
        const crnno = params_data.crnno ?? params_data.crno ?? "";
        const pay_from_date = params_data.pay_from_date ?? params_data.payment_from_date ?? "";
        const pay_to_date = params_data.pay_to_date ?? params_data.payment_to_date ?? "";
        const status = params_data.status ?? "";

        params.append("tourno", String(tourno));
        params.append("all_report", "1");
        params.append("from_date", String(from_date));
        params.append("to_date", String(to_date));
        params.append("month", String(month));
        params.append("crnno", String(crnno));
        params.append("pay_from_date", String(pay_from_date));
        params.append("pay_to_date", String(pay_to_date));
        params.append("status", String(status));

        return {
          url: `${Environment.taServiceUrl}/taserv/report_download_provision_summary?${params.toString()}`,
          method: "GET",
        };
      },
    }),

    provisionReportExcelDownload: builder.query({
      query: () => ({
        url: `${Environment.taServiceUrl}/taserv/provision_report_excel_download`,
        method: "GET",
      }),
    }),

    //======================================================================
    // BRANCHWISE PENDING REPORT
    //======================================================================

    getBranchwisePendingReport: builder.query({
      query: ({ empId = 0, page = 1 } = {}) => ({
        url: `${Environment.taServiceUrl}/taserv/branchwise_pending/${empId}?page=${page}`,
        method: "GET",
      }),
    }),

    //======================================================================
    // EMPLOYEE TOUR REPORT
    //======================================================================

    getEmpTourReport: builder.query({
      query: ({ tour_no = "", page = 1 } = {}) => {
        const params = new URLSearchParams();
        params.append("tour_id", String(tour_no));
        params.append("page", String(page));
        return {
          url: `${Environment.taServiceUrl}/taserv/report_tourid_summary?${params.toString()}`,
          method: "GET",
        };
      },
    }),

    downloadEmpTourReport: builder.query({
      query: ({ tour_no = "" } = {}) => ({
        url: `${Environment.taServiceUrl}/taserv/report_download_tourid?tour_id=${tour_no}`,
        method: "GET",
      }),
    }),

    //======================================================================
    // TA CONSOLIDATE / ECLAIM BILL CONSOLIDATE REPORT
    //======================================================================

    getConsolidateReport: builder.query({
      query: ({
        tour_no = "",
        crnno = "",
        branchid = "",
        employee_id = "",
        form_date = "",
        to_date = "",
        page = 1,
      } = {}) => {
        const params = new URLSearchParams();
        params.append("tour_no", String(tour_no));
        params.append("crnno", String(crnno));
        params.append("branchid", String(branchid));
        params.append("employee_id", String(employee_id));
        params.append("form_date", String(form_date));
        params.append("to_date", String(to_date));
        params.append("page", String(page));
        return {
          url: `${Environment.taServiceUrl}/taserv/consolidate_report?${params.toString()}`,
          method: "GET",
        };
      },
    }),

    downloadConsolidateReport: builder.query({
      query: ({
        tour_no = "",
        branch = "",
        employee_id = "",
        crnno = "",
        from_date = "",
        to_date = "",
      } = {}) => {
        const params = new URLSearchParams();
        params.append("tour_no", String(tour_no));
        params.append("branch", String(branch));
        params.append("employee_id", String(employee_id));
        params.append("crnno", String(crnno));
        if (from_date) params.append("from_date", String(from_date));
        if (to_date) params.append("to_date", String(to_date));
        return {
          url: `${Environment.taServiceUrl}/taserv/ta_consolidate_report_download?${params.toString()}`,
          method: "GET",
        };
      },
    }),

    //======================================================================
    // GST REPORT
    //======================================================================

    getGstReport: builder.query({
      query: ({
        tour_no = "",
        branch_id = "",
        emp_id = "",
        from_date = "",
        to_date = "",
        crnno = "",
        page = 1,
      } = {}) => {
        const params = new URLSearchParams();
        params.append("tour_id", String(tour_no));
        params.append("emp_id", String(emp_id));
        params.append("branch_id", String(branch_id));
        params.append("page", String(page));
        params.append("crnno", String(crnno));
        if (from_date) params.append("from_date", String(from_date));
        if (to_date) params.append("to_date", String(to_date));
        return {
          url: `${Environment.taServiceUrl}/taserv/gst_report?${params.toString()}`,
          method: "GET",
        };
      },
    }),

    downloadGstReport: builder.query({
      query: ({
        tour_no = "",
        branch_id = "",
        emp_id = "",
        from_date = "",
        to_date = "",
        crnno = "",
      } = {}) => {
        const params = new URLSearchParams();
        params.append("tour_id", String(tour_no));
        params.append("all_report", "1");
        params.append("branch_id", String(branch_id));
        params.append("emp_id", String(emp_id));
        params.append("crnno", String(crnno));
        if (from_date) params.append("from_date", String(from_date));
        if (to_date) params.append("to_date", String(to_date));
        return {
          url: `${Environment.taServiceUrl}/taserv/gst_report?${params.toString()}`,
          method: "GET",
        };
      },
    }),

    //======================================================================
    // PRPO
    //======================================================================

    branchIndentMakerSummary: builder.query({
      query: ({
        page = 1,
        page_size = 10,
        ...filters
      } = {}) => ({
        url: `${Environment.prpoServiceUrl}/prserv/branchrequest_maker_summary`,
        method: "POST",
        params: {
          page,
          page_size,
          is_summary: 1,
        },
        body: filters,
      }),
    }),

    branchIndentApproverSummary: builder.query({
      query: ({
        page = 1,
        page_size = 10,
        ...filters
      } = {}) => ({
        url: `${Environment.prpoServiceUrl}/prserv/branchrequest_approver_summary`,
        method: "POST",
        params: {
          page,
          page_size,
          is_summary: 1,
        },
        body: filters,
      }),
    }),

    getBranchIndentDetails: builder.query({
      query: (id) => ({
        url: `${Environment.prpoServiceUrl}/prserv/branchrequest_edit/${id}`,
        method: "GET",
      }),
    }),

    BranchIndentDetails: builder.mutation({
      query: ({
        id,
        data,
      }) => ({
        url: `${Environment.prpoServiceUrl}/prserv/branchrequest_edit/${id}`,
        method: "POST",
        body: data,
      }),
    }),

    branchIndentAction: builder.mutation({
      query: ({
        data,
        queryParam = "",
      }) => ({
        url: `${Environment.prpoServiceUrl}/prserv/branch_request_action${queryParam}`,
        method: "POST",
        body: data,
      }),
    }),

    PRTransaction: builder.query({
      query: ({
        id,
        params_data = {},
      }) => {
        const params = new URLSearchParams();

        Object.entries(params_data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });

        return {
          url: `${Environment.prpoServiceUrl}/prserv/prtran/${id}?${params.toString()}`,
          method: "GET",
        };
      },
    }),

    BranchDropdown: builder.query({
      query: ({
        params_data = {},
      } = {}) => {
        const params = new URLSearchParams();

        Object.entries(params_data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });

        return {
          url: `${Environment.userServiceUrl}/usrserv/search_branch?${params.toString()}`,
          method: "GET",
        };
      },
    }),

    StorageLocation: builder.query({
      query: ({
        params_data = {},
      } = {}) => {
        const params = new URLSearchParams();

        Object.entries(params_data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });

        return {
          url: `${Environment.userServiceUrl}/usrserv/fetch_storage_location?${params.toString()}`,
          method: "GET",
        };
      },
    }),

    ActivityDropdown: builder.query({
      query: ({
        params_data = {},
      } = {}) => {
        const params = new URLSearchParams();

        Object.entries(params_data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });

        return {
          url: `${Environment.vendorServiceUrl}/vendserv/supplier_activity_list?${params.toString()}`,
          method: "GET",
        };
      },
    }),

    BranchSearch: builder.query({
      query: ({
        searchText = "",
        pageNo = 1,
      } = {}) => ({
        url: `${Environment.userServiceUrl}/usrserv/search_branch`,
        method: "GET",
        params: {
          query: searchText,
          page: pageNo,
          display: "CS",
        },
      }),
    }),

    CommoditySearch: builder.query({
      query: ({
        searchText = "",
        pageNo = 1,
      } = {}) => ({
        url: `${Environment.masterServiceUrl}/mstserv/searchcommodity`,
        method: "GET",
        params: {
          query: searchText,
          page: pageNo,
        },
      }),
    }),

    MainCategory: builder.query({
      query: ({
        id,
        params_data = {},
      }) => {
        const params = new URLSearchParams();

        Object.entries(params_data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });

        return {
          url: `${Environment.masterServiceUrl}/mstserv/productclassification/${id}?${params.toString()}`,
          method: "GET",
        };
      },
    }),

    SubCategory: builder.query({
      query: ({
        id,
        params_data = {},
      }) => {
        const params = new URLSearchParams();

        Object.entries(params_data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });

        return {
          url: `${Environment.masterServiceUrl}/mstserv/productcat/${id}?${params.toString()}`,
          method: "GET",
        };
      },
    }),

    Product: builder.query({
      query: ({
        catid,
        subcatid,
        params_data = {},
      }) => {
        const params = new URLSearchParams();

        Object.entries(params_data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });

        return {
          url: `${Environment.masterServiceUrl}/mstserv/fetch_product_bycat_sub/cat/${catid}/subcat/${subcatid}?${params.toString()}`,
          method: "GET",
        };
      },
    }),

    ProductNameSearch: builder.query({
      query: ({
        page = 1,
        query = "",
        request_type = "",
      } = {}) => ({
        url: `${Environment.masterServiceUrl}/mstserv/search_mst_product_prpo`,
        method: "GET",
        params: {
          page,
          query,
          request_type,
        },
      }),
    }),

    SpecificationSearch: builder.query({
      query: ({
        page = 1,
        code = "",
      } = {}) => ({
        url: `${Environment.masterServiceUrl}/mstserv/product_specification`,
        method: "GET",
        params: {
          page,
          code,
        },
      }),
    }),

    UomSearch: builder.query({
      query: ({
        page = 1,
        query = "",
      } = {}) => ({
        url: `${Environment.vendorServiceUrl}/vendmastserv/ven_uom_search`,
        method: "GET",
        params: {
          page,
          query,
        },
      }),
    }),

    CatalogCreate: builder.mutation({
      query: ({
        supplierId,
        payload,
      }) => ({
        url: `${Environment.vendorServiceUrl}/vendserv/supplieractivitydtl/${supplierId}/catelog`,
        method: "POST",
        body: payload,
      }),
    }),

    GetCatalogDetails: builder.query({
      query: ({
        supplierId,
        catalogId,
      }) => ({
        url: `${Environment.vendorServiceUrl}/vendserv/supplieractivitydtl/${supplierId}/catelog/${catalogId}`,
        method: "GET",
      }),
    }),

    DeleteCatalog: builder.mutation({
      query: ({
        supplierId,
        catalogId,
      }) => ({
        url: `${Environment.vendorServiceUrl}/vendserv/supplieractivitydtl/${supplierId}/catelog/${catalogId}`,
        method: "DELETE",
      }),
    }),

    CatalogUpdate: builder.mutation({
      query: ({
        supplierId,
        catalogId,
        payload,
      }) => ({
        url: `${Environment.vendorServiceUrl}/vendserv/supplieractivitydtl/${supplierId}/catelog/${catalogId}`,
        method: "POST",
        body: payload,
      }),
    }),

    ConfigurationSearch: builder.query({
      query: ({
        page = 1,
        query = "",
        code,
        specification,
      } = {}) => ({
        url: `${Environment.vendorServiceUrl}/vendmastserv/product_configuration`,
        method: "GET",
        params: {
          page,
          code,
          specification,
          ...(query ? { query } : {}),
        },
      }),
    }),

    ModelSearch: builder.query({
      query: ({
        page = 1,
        query = "",
        code,
        make_id,
      } = {}) => ({
        url: `${Environment.vendorServiceUrl}/vendmastserv/productmakemodel`,
        method: "GET",
        params: {
          page,
          m_type: "model",
          code,
          make_id,
          ...(query ? { query } : {}),
        },
      }),
    }),

    MakeSearch: builder.query({
      query: ({
        page = 1,
        query = "",
        code,
      } = {}) => ({
        url: `${Environment.vendorServiceUrl}/vendmastserv/productmakemodel`,
        method: "GET",
        params: {
          page,
          m_type: "make",
          code,
          ...(query ? { query } : {}),
        },
      }),
    }),

    ProductTypeSearch: builder.query({
      query: ({
        params_data = {},
      } = {}) => ({
        url: `${Environment.masterServiceUrl}/mstserv/pdtclasstype`,
        method: "GET",
        params: {
          page: params_data?.page,
          ...(params_data?.data
            ? {
              data: params_data.data,
            }
            : {}),
        },
      }),
    }),

    ProductSearch: builder.query({
      query: ({
        searchText = "",
        pageNo = 1,
      } = {}) => ({
        url: `${Environment.masterServiceUrl}/mstserv/product_search_rm`,
        method: "GET",
        params: {
          query: searchText,
          page: pageNo,
        },
      }),
    }),

    PdtClassType: builder.query({
      query: ({
        data = "",
        pageNo = 1,
      } = {}) => ({
        url: `${Environment.masterServiceUrl}/mstserv/pdtclasstype`,
        method: "GET",
        params: {
          data,
          page: pageNo,
        },
      }),
    }),

    Uom: builder.query({
      query: ({
        data = "",
        pageNo = 1,
      } = {}) => ({
        url: `${Environment.masterServiceUrl}/mstserv/uom_search`,
        method: "GET",
        params: {
          query: data,
          page: pageNo,
        },
      }),
    }),

    //======================================================================
    // PCA
    //======================================================================

    PcaSearch: builder.query({
      query: ({
        params_data = {},
      } = {}) => {
        const params = new URLSearchParams();

        Object.entries(params_data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });

        return {
          url: `${Environment.prpoServiceUrl}/prserv/search_pcano?${params.toString()}`,
          method: "GET",
        };
      },
    }),

    CreateIndepent: builder.mutation({
      query: (data) => ({
        url: `${Environment.prpoServiceUrl}/prserv/pr_create_indep`,
        method: "POST",
        body: data,
      }),
    }),

    PcaDetailsForCreate: builder.mutation({
      query: (data) => ({
        url: `${Environment.prpoServiceUrl}/prserv/pca_details_for_pr_create`,
        method: "POST",
        body: data,
      }),
    }),

    bsSearch: builder.query({
      query: (query = "") => ({
        url: `${Environment.userServiceUrl}/usrserv/employee_bs_data`,
        method: "GET",
        params: {
          query,
        },
      }),
    }),

    createBranchIndent: builder.mutation({
      query: ({ data }) => ({
        url: `${Environment.prpoServiceUrl}/prserv/pr_branch_create`,
        method: "POST",
        body: data,
      }),
    }),

    documentGet: builder.query({
      query: ({
        tour_id = 0,
        expid,
      }) => ({
        url: `${Environment.taServiceUrl}/taserv/fetch_documents/${tour_id}`,
        method: "GET",
      }),
    }),

    documentInsert: builder.mutation({
      query: (formData) => ({
        url: `${Environment.taServiceUrl}/taserv/document_insert`,
        method: "POST",
        body: formData,
      }),
    }),

    deleteDocument: builder.mutation({
      query: (docId) => ({
        url: `${Environment.taServiceUrl}/taserv/particular_doc_get/${docId}`,
        method: "DELETE",
      }),
    }),

    getCCBS: builder.query({
      query: (params_data = {}) => {
        const params = new URLSearchParams();

        Object.entries(params_data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });

        return {
          url: `${Environment.taServiceUrl}/taserv/ccbs_get?${params.toString()}`,
          method: "GET",
        };
      },
    }),

    //======================================================================
    // PRPO COMMON REPORTS
    //======================================================================

    prpoCommonReports: builder.mutation({
      query: ({
        data,
        id,
      }) => ({
        url: `${Environment.prpoServiceUrl}/prserv/prpo_common_reports`,
        method: "POST",
        params: {
          report_type: id,
        },
        body: data,
      }),
    }),

    //======================================================================
    // BRANCH INDENT EDIT
    //======================================================================

    GetBranchIndentEdit: builder.query({
      query: ({
        id,
      }) => ({
        url: `${Environment.prpoServiceUrl}/prserv/pr_branch_edit/${id}`,
        method: "GET",
      }),
    }),

    IndependentDetailView: builder.query({
      query: (id) => ({
        url: `${Environment.prpoServiceUrl}/prserv/pr_independent_detail_view/${id}`,
        method: "GET",
      }),
    }),

    UpdateBranchIndent: builder.mutation({
      query: ({
        payload,
      }) => ({
        url: `${Environment.prpoServiceUrl}/prserv/pr_branch_update`,
        method: "POST",
        body: payload,
      }),
    }),

    //======================================================================
    // BOOKING
    //======================================================================

    bookingDetails: builder.query({
      query: (params_data = {}) => {
        const params = new URLSearchParams();

        Object.entries(params_data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });

        return {
          url: `${Environment.taServiceUrl}/taserv/get_requirements_admin?${params.toString()}`,
          method: "GET",
        };
      },
    }),

    accBooking: builder.mutation({
      query: ({ data }) => ({
        url: `${Environment.taServiceUrl}/taserv/accommodation_booking_admin`,
        method: "POST",
        body: data,
      }),
    }),

    cabBooking: builder.mutation({
      query: ({ data }) => ({
        url: `${Environment.taServiceUrl}/taserv/cab_booking_admin`,
        method: "POST",
        body: data,
      }),
    }),

    airBooking: builder.mutation({
      query: ({ data }) => ({
        url: `${Environment.taServiceUrl}/taserv/air_booking_admin`,
        method: "POST",
        body: data,
      }),
    }),

    busBooking: builder.mutation({
      query: ({ data }) => ({
        url: `${Environment.taServiceUrl}/taserv/bus_booking_admin`,
        method: "POST",
        body: data,
      }),
    }),

    trainBooking: builder.mutation({
      query: ({ data }) => ({
        url: `${Environment.taServiceUrl}/taserv/train_booking_admin`,
        method: "POST",
        body: data,
      }),
    }),

    //======================================================================
    // ON BEHALF
    //======================================================================

    onbeHalfDataGet: builder.query({
      query: () => ({
        url: `${Environment.taServiceUrl}/taserv/onbehalf_emp_get`,
        method: "GET",
      }),
    }),
  }),
});

/*
|--------------------------------------------------------------------------
| GENERATED HOOKS
|--------------------------------------------------------------------------
*/

export const {
  //======================================================================
  // USER
  //======================================================================

  useLoginMutation,
  useLazyUserModulesQuery,
  useGetPublicKeyMutation,
  useLogoutMutation,
  useGetCaptachaQuery,
  useGetEntityQuery,
  useSearchEmployeeQuery,
  usePushNotificationMutation,
  useEmployeeDetailsUpdateQuery,
  useForgotPasswordMutation,

  //======================================================================
  // USER / EMPLOYEE
  //======================================================================

  useLazyBranchListQuery,
  useBranchListQuery,
  useLazyEmpDetailsQuery,
  useLazyDepartmentDetailGetQuery,
  useLazyGetEmployeeBranchQuery,
  useGetEmployeeBranchQuery,
  useLazyEmployeeListQuery,
  useEmployeeListQuery,
  useLazyEmpBaseGetQuery,
  useLazyApproverListQuery,

  //======================================================================
  // TOUR
  //======================================================================

  useLazyTravelMakerSummaryQuery,
  useLazyTourReasonListQuery,

  useTourSubmitMutation,
  useLazyTourDataGetQuery,
  useLazyDocumentDataGetQuery,

  useTourApproveMutation,
  useTourRejectMutation,
  useTourReturnMutation,
  useTourForwardMutation,
  useTourCancelMutation,

  useHolidayCheckMutation,

  //======================================================================
  // COMMON DROPDOWN
  //======================================================================

  useLazyCommonDropDownGetQuery,
  useCommonDropDownGetQuery,

  //======================================================================
  // INCIDENTAL
  //======================================================================

  useGetIncidentalTravelModeQuery,
  useLazyGetIncidentalTravelModeQuery,

  useGetIncidentalExpenseQuery,
  useLazyGetIncidentalExpenseQuery,

  useIncidentalLogicMutation,
  useIncidentalCreateMutation,
  useDeleteIncidentalMutation,
  useApproveIncidentalMutation,

  useFetchAttentionQuery,
  useLazyValidateGstNoQuery,

  useFetchTourDetailsQuery,

  useSubmitIncidentalExpenseMutation,

  //======================================================================
  // SUPPLIER GST VALIDATION
  //======================================================================

  useValidateSupplierGstQuery,
  useLazyValidateSupplierGstQuery,

  //======================================================================
  // HSN
  //======================================================================

  useSearchHsnQuery,
  useLazySearchHsnQuery,

  //======================================================================
  // MISC
  //======================================================================

  useGetMiscellaneousTourQuery,
  useLazyGetMiscellaneousTourQuery,
  useMiscellaneousCreateMutation,
  useGetMiscEligibleAmountMutation,
  useGetMiscTourExpenseQuery,
  useLazyGetMiscTourExpenseQuery,
  useMiscCreateMutation,
  useMiscDeleteMutation,
  useMiscLogicMutation,
  useMiscApproveMutation,
  useRefreshTokenMutation,
  useGetMiscReasonDropdownQuery,
  useGetConvCenterDropdownQuery,
  useGetMiscResDropdownQuery,
  useGetTourMiscExpenseQuery,
  useSaveTourMiscExpenseMutation,

  //======================================================================
  // CLIENT / CITY
  //======================================================================

  useLazyClientListTaQuery,
  useLazyCityListQuery,
  useLazyInsertCityQuery,

  useDeleteRequirementMutation,

  //======================================================================
  // ADMIN / APPROVAL
  //======================================================================

  useAdminReservMutation,
  useReqRejectMutation,

  useLazyOnBehalfListQuery,
  useLazyTravelApproveSummaryQuery,
  useLazyAdminSummaryQuery,

  useLazyExpenseApprovalSummarryQuery,

  //======================================================================
  // EXPENSE
  //======================================================================

  useLazyGetExpenseSummaryQuery,
  useLazyGetExpenseDetailsQuery,
  useLazyGetApprovalFlowQuery,
  useLazyGetExpenseListQuery,

  useExpenseDeleteMutation,
  useExpenseSubmitMutation,

  //======================================================================
  // BUSINESS SEGMENT
  //======================================================================

  useGetBusinessSegmentsQuery,
  useLazyGetBusinessSegmentsQuery,

  //======================================================================
  // CC SEGMENT
  //======================================================================

  useGetCcSegmentsQuery,
  useLazyGetCcSegmentsQuery,

  useCcSearchQuery,
  useLazyCcSearchQuery,

  //======================================================================
  // FUEL
  //======================================================================

  useGetFuelAllowanceSummaryQuery,
  useGetEmployeeDetailsForFuelQuery,
  useModeOfTravelQuery,
  useGetEligibleAmountMutation,
  useFuelAllowanceCreateMutation,

  useGetDateRelaxationQuery,
  useUpdateDateRelaxationStatusMutation,

  useGetFuelAllowanceAllQuery,

  useGetFuelAllowanceDetailsQuery,
  useGetFuelDocumentsQuery,

  useFuelApprovalMutation,
  useFuelRejectMutation,
  useFuelReturnMutation,
  useFuelApprovalFlowQuery,

  useFuelAllowanceUploadMutation,
  useFuelAllowanceDownloadQuery,

  useRmApprovalMutation,

  //======================================================================
  // CHAT
  //======================================================================

  useGetChatSummaryQuery,
  useGetChatBoxQuery,
  usePostChatBoxMutation,
  usePostChatBoxViewMutation,
  useDeleteChatMutation,

  //======================================================================
  // LODGING
  //======================================================================

  useLazyGetLodgingQuery,
  useGetLodgingQuery,
  useLodgingCreateMutation,
  useLodgingEligibleAmtMutation,
  useLodgingApproveMutation,
  useDeleteLodgingMutation,
  useDeleteLodgingDependentMutation,
  useGetBankGstListQuery,
  useLazyGetBankGstListQuery,

  //======================================================================
  // LOCAL CONVEYANCE
  //======================================================================

  useGetLocalConvQuery,
  useLocalConvCreateMutation,
  useLocalConvEligibleAmtMutation,
  useDeleteLocalConvMutation,

  //======================================================================
  // DAILY REIMBURSEMENT
  //======================================================================

  useLazyGetDailyReimbursementQuery,
  useDailydeimCreateMutation,
  useDailydeimLogicMutation,
  useGetAllowanceQuery,
  useLazyGetAllowanceQuery,

  //======================================================================
  // ASSOCIATED
  //======================================================================

  useLazyGetAssociatedExpenseQuery,
  useAssociateCreateMutation,

  useGetIbaSummaryQuery,
  useLazyGetIbaSummaryQuery,
  useIbaCreateMutation,
  useIbaEligibleAmtMutation,
  useDeleteIbaTripMutation,
  useIbaApproveMutation,
  useIbaSubmitApUserMutation,
  useGetCommonDropdownQuery,
  useLazyGetCommonDropdownQuery,


  //======================================================================
  // TRAVEL
  //======================================================================

  useLazyGetTravelExpenseQuery,
  useTravelSubmitMutation,
  useApproveTravelExpenseMutation,
  useDeleteTravelExpenseMutation,

  //======================================================================
  // PACKAGING
  //======================================================================

  useGetPackagingFreightQuery,
  useLazyGetPackagingFreightQuery,
  useGetPackingSummaryQuery,
  useLazyGetPackingSummaryQuery,
  usePackingCreateMutation,
  useDeletePackingMutation,
  usePackingEligibleAmtMutation,
  usePackingApproveMutation,
  useGetPackingTwoWheelerDropdownQuery,
  useLazyGetPackingTwoWheelerDropdownQuery,
  useGetDecisionDropdownQuery,
  useLazyGetDecisionDropdownQuery,

  //======================================================================
  // LOCAL DEPUTATION
  //======================================================================

  useGetLocalDeputationQuery,
  useLazyGetLocalDeputationQuery,
  useGetTourGradeDetailsQuery,
  useLazyGetTourGradeDetailsQuery,
  useGetDeputationSummaryQuery,
  useLazyGetDeputationSummaryQuery,
  useGetDeputationCityListQuery,
  useLazyGetDeputationCityListQuery,
  useGetDeputationEligibleMutation,
  useLocalDeputationCreateMutation,
  useDeleteDeputationMutation,
  useApproveDeputationMutation,

  //======================================================================
  // MODE OF TRAVEL
  //======================================================================

  useGetmodeOfTravelQuery,

  //======================================================================
  // DOCUMENT
  //======================================================================

  useLazyDocumentGetQuery,
  useDeleteDocumentMutation,
  useDocumentInsertMutation,

  //======================================================================
  // CCBS
  //======================================================================

  useLazyGetCCBSQuery,

  //======================================================================
  // ADVANCE
  //======================================================================

  useLazyGetAdvanceMakerSummaryQuery,
  useLazyGetAdvancemakerSummaryQuery,
  useLazyGetAdvanceApproverSummaryQuery,
  useLazyGetAdvanceEditDetailsQuery,
  useLazyGetTourBsCcFetchQuery,

  //======================================================================
  // CANCEL
  //======================================================================

  useLazyGetCancelMakerSummaryQuery,
  useLazyGetCancelApproverSummaryQuery,
  useGetCancelApproverSummaryQuery,
  useLazyCancelDataGetQuery,
  useLazyListForCancelGetQuery,
  useLazyAgingDropdownQuery,
  useAgingDropdownQuery,
  useLazyClaimApprovalSummaryQuery,
  useClaimApprovalSummaryQuery,

  //======================================================================
  // ASSIGN APPROVER
  //======================================================================

  useLazyGetAssignApproverSummaryQuery,
  useGetAssignApproverSummaryQuery,
  useAssignApproverMutation,

  //======================================================================
  // RECOVERY
  //======================================================================

  useGetRecoverySummaryMutation,
  useRecoveryEditMutation,
  useRecoveryJvEntryMutation,
  useRecoveryJvApproveMutation,

  //======================================================================
  // AP USER
  //======================================================================

  useLazyGetApUserSummaryQuery,
  useGetApUserSummaryQuery,
  useLazyGetSettlementStatusDropdownQuery,
  useGetSettlementStatusDropdownQuery,
  useLazyGetFailedTranStatusDropdownQuery,
  useGetFailedTranStatusDropdownQuery,
  useChangeFailedTranStatusMutation,
  useRepushFailedTranMutation,
  useLazyGetFailedViewEntryQuery,


  //======================================================================
  // PRPO
  //======================================================================

  useLazyBranchIndentMakerSummaryQuery,
  useLazyBranchIndentApproverSummaryQuery,

  useLazyGetBranchIndentDetailsQuery,

  useBranchIndentDetailsMutation,
  useBranchIndentActionMutation,

  useLazyPRTransactionQuery,

  useLazyBranchDropdownQuery,
  useLazyStorageLocationQuery,
  useLazyActivityDropdownQuery,

  useLazyBranchSearchQuery,
  useLazyCommoditySearchQuery,

  useLazyMainCategoryQuery,
  useLazySubCategoryQuery,
  useLazyProductQuery,

  useLazyProductNameSearchQuery,
  useLazySpecificationSearchQuery,
  useLazyUomSearchQuery,

  //======================================================================
  // CATALOG
  //======================================================================

  useCatalogCreateMutation,
  useGetCatalogDetailsQuery,
  useLazyGetCatalogDetailsQuery,
  useDeleteCatalogMutation,
  useCatalogUpdateMutation,

  //======================================================================
  // PRODUCT
  //======================================================================

  useLazyConfigurationSearchQuery,
  useLazyModelSearchQuery,
  useLazyMakeSearchQuery,
  useLazyProductTypeSearchQuery,
  useLazyProductSearchQuery,

  useLazyEmpBranchQuery,
  useLazyPdtClassTypeQuery,

  //======================================================================
  // PCA
  //======================================================================

  useLazyPcaSearchQuery,

  useCreateIndepentMutation,
  usePcaDetailsForCreateMutation,

  useLazyUomQuery,

  //======================================================================
  // BRANCH INDENT
  //======================================================================

  useCreateBranchIndentMutation,
  useLazyGetBranchIndentEditQuery,
  useLazyIndependentDetailViewQuery,
  useUpdateBranchIndentMutation,

  //======================================================================
  // REPORTS
  //======================================================================

  usePrpoCommonReportsMutation,

  //======================================================================
  // BOOKING
  //======================================================================

  useLazyBookingDetailsQuery,

  useAccBookingMutation,
  useCabBookingMutation,
  useAirBookingMutation,
  useBusBookingMutation,
  useTrainBookingMutation,


  //======================================================================
  // ON BEHALF
  //======================================================================

  useOnbeHalfDataGetQuery,

  //======================================================================
  // TOUR REPORT
  //======================================================================

  useTourReportGetQuery,
  useLazyTourReportGetQuery,
  useGetTourReportSummaryQuery,
  useLazyGetTourReportSummaryQuery,
  useReportStatusDropdownQuery,
  useLazyReportStatusDropdownQuery,
  useLazyReportDownloadTourSummaryQuery,
  useLazyReportDownloadProvisionSummaryQuery,
  useLazyProvisionReportExcelDownloadQuery,

  //======================================================================
  // BRANCHWISE PENDING REPORT
  //======================================================================

  useGetBranchwisePendingReportQuery,
  useLazyGetBranchwisePendingReportQuery,

  //======================================================================
  // EMPLOYEE TOUR REPORT & TA CONSOLIDATE
  //======================================================================

  useGetEmpTourReportQuery,
  useLazyGetEmpTourReportQuery,
  useLazyDownloadEmpTourReportQuery,

  useGetConsolidateReportQuery,
  useLazyGetConsolidateReportQuery,
  useLazyDownloadConsolidateReportQuery,

  //======================================================================
  // GST REPORT
  //======================================================================

  useGetGstReportQuery,
  useLazyGetGstReportQuery,
  useLazyDownloadGstReportQuery,

} = apiSlice;
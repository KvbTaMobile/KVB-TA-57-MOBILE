import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithRefresh } from "./baseQueryWithRefresh";
import { Environment } from "../../environment/Environment";

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
  ],
  endpoints: (builder) => ({
    // USERSRV
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
      query: () => {
        return {
          url: `${Environment.userServiceUrl}/usrserv/user_modules`,
        };
      },
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
      }),
    }),

    getEntity: builder.query({
      query: () => ({
        url: `${Environment.userServiceUrl}/usrserv/get_entity`,
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
      query: ({ query, page }) => ({
        url: `${Environment.userServiceUrl}/usrserv/searchemployee?query=${query}&page=${page}`,
      }),
    }),

    EmployeeDetailsUpdate: builder.query({
      query: (emp_id) => {
        return {
          url: `${Environment.userServiceUrl}/usrserv/employee/${emp_id}`,
          method: "GET",
        };
      },
    }),
 logout: builder.mutation({
      query: () => ({
        url: `${Environment.userServiceUrl}/usrserv/logout`,
        method: "POST",
      }),
    }),


    forgotPassword: builder.mutation({
      query: (data) => ({
        url: `${Environment.userServiceUrl}/usrserv/forgetpassword`,
        method: "POST",
        body: data,
      }),
    }),
   

    // TA API

    travelMakerSummary: builder.query({
      query: (params_data) => {
        const params = new URLSearchParams(params_data);
        return {
          url: `${Environment.taServiceUrl
            }/taserv/tourdata?${params.toString()}`,
        };
      },
    }),
    branchList: builder.query({
      query: ({ name = "", page = 1 }) => {
        const params = new URLSearchParams({
          query: name,
          page: page.toString(),
        });
        return {
          url: `${Environment.userServiceUrl
            }/usrserv/search_employeebranch?${params.toString()}`,
        };
      },
    }),
    empDetails: builder.query({
      query: (params_data) => {
        const params = new URLSearchParams(params_data);
        return {
          url: `${Environment.taServiceUrl}/taserv/emp_details_get?${params}`,
        };
      },
    }),
    tourReasonList: builder.query({
      query: ({ name = "", page = 1 }) => {
        //console.log(name);
        const params = new URLSearchParams({ name, page: page.toString() });
        return {
          url: `${Environment.taServiceUrl
            }/taserv/tourreason?${params.toString()}`,
        };
      },
    }),
    tourSubmit: builder.mutation({
      query: ({ data }) => {
        //console.log("PAYLOAD->>>", data);
        return {
          url: `${Environment.taServiceUrl}/taserv/tour`,
          method: "POST",
          body: data,
        };
      },
    }),
    tourDataGet: builder.query({
      query: ({ tour_id = 0 }) => {
        return {
          url: `${Environment.taServiceUrl}/taserv/tourdata/${tour_id}`,
        };
      },
    }),
documentDataGet: builder.query({
  query: (id) => ({
    url: `${Environment.taServiceUrl}/taserv/fetch_documents/${id}`,
  }),
}),

    tourApprove: builder.mutation({
      query: ({ data }) => {
        //console.log("PAYLOAD->>>", data);
        return {
          url: `${Environment.taServiceUrl}/taserv/tourapprove`,
          method: "POST",
          body: data,
        };
      },
    }),
    tourReject: builder.mutation({
      query: ({ data }) => {
        //console.log("PAYLOAD->>>", data);
        return {
          url: `${Environment.taServiceUrl}/taserv/tourreject`,
          method: "POST",
          body: data,
        };
      },
    }),
    tourReturn: builder.mutation({
      query: ({ data }) => {
        //console.log("PAYLOAD->>>", data);
        return {
          url: `${Environment.taServiceUrl}/taserv/tourreturn`,
          method: "POST",
          body: data,
        };
      },
    }),
    tourForward: builder.mutation({
      query: ({ data }) => {
        //console.log("PAYLOAD->>>", data);
        return {
          url: `${Environment.taServiceUrl}/taserv/tourforward`,
          method: "POST",
          body: data,
        };
      },
    }),
    tourCancel: builder.mutation({
      query: ({ data }) => {
        return {
          url: `${Environment.taServiceUrl}/taserv/tourcancel`,
          method: "POST",
          body: data,
        };
      },
    }),
holidayCheck: builder.mutation({
  query: (params_data) => {
    const params = new URLSearchParams({
      onbehalf: "0",   // was ""
      reason: "",
      tour_id: "0",    // was ""
      ...params_data,
    });
    return {
      url: `${Environment.taServiceUrl}/taserv/tourdate_check?${params.toString()}`,
      method: "POST",
      body: {},
    };
  },
}),
  
    departmentDetailGet: builder.query({
      query: (emp_id) => {
        return {
          url: `${Environment.userServiceUrl}/usrserv/department_details/${emp_id}`,
        };
      },
    }),
    commonDropDownGet: builder.query({
      query: (key) => {
        return {
          url: `${Environment.taServiceUrl}/taserv/common_dropdown_get/${key}`,
        };
      },
    }),
    clientListTa: builder.query({
      query: (params_data) => {
        const params = new URLSearchParams(params_data);
        return {
          url: `${Environment.taServiceUrl
            }/taserv/frequent_client?${params.toString()}`,
        };
      },
    }),
    cityList: builder.query({
      query: (params_data) => {
        const params = new URLSearchParams(params_data);
        return {
          url: `${Environment.taServiceUrl
            }/taserv/frequent_city?${params.toString()}`,
        };
      },
    }),
    deleteRequirement: builder.mutation({
      query: (params_data) => {
        const params = new URLSearchParams(params_data);
        return {
          url: `${Environment.taServiceUrl
            }/taserv/delete_travel_requirements?${params.toString()}`,
          method: "DELETE",
        };
      },
    }),
    adminReserv: builder.mutation({
      query: ({ data }) => {
        //console.log("PAYLOAD->>>", data);
        return {
          url: `${Environment.taServiceUrl}/taserv/admin_reserv`,
          method: "POST",
          body: data,
        };
      },
    }),
    reqReject: builder.mutation({
      query: ({ data }) => {
        //console.log("PAYLOAD->>>", data);
        return {
          url: `${Environment.taServiceUrl}/taserv/requirement_reject`,
          method: "POST",
          body: data,
        };
      },
    }),
  onBehalfList: builder.query({
  query: (params_data) => {
    const params = new URLSearchParams(params_data);
    return {
      url: `${Environment.taServiceUrl}/taserv/onbehalf_emp_get?${params.toString()}`,
      method: "GET",
    };
  },
}),
  travelApproveSummary: builder.query({
  query: (params_data) => {
    const params = new URLSearchParams(params_data);
    return {
      url: `${Environment.taServiceUrl}/taserv/tourapprove/${params_data?.type}?${params.toString()}`,
      method: "GET",
    };
  },
}),
    getExpenseSummary: builder.query({
      query: (params_data) => {
        const params = new URLSearchParams(params_data);
        return {
          url: `${Environment.taServiceUrl
            }/taserv/expense_summary?${params.toString()}`,
          method: "GET",
        };
      },
    }),
 ExpenseApprovalSummarry: builder.query({
  query: (params_data) => {
    const params = new URLSearchParams(params_data);
    return {
      url: `${Environment.taServiceUrl}/taserv/tourapprove/claim?${params.toString()}`,
      method: "GET",
    };
  },
}),
    getFuelAllowanceSummary: builder.query({
      query: ({ page, claim_amount, month_year }) => {
        let url = `${Environment.taServiceUrl}/taserv/fuel_allowance_summary?page=${page}`;

        if (claim_amount) {
          url += `&claim_amount=${claim_amount}`;
        }

        if (month_year) {
          url += `&month_year=${month_year}`;
        }

        return {
          url,
          method: "GET",
        };
      },
    }),
    getEmployeeDetailsForFuel: builder.query({
      query: () => {
        return {
          url: `${Environment.taServiceUrl}/taserv/emp_details_get`,
          method: "GET",
        };
      },
    }),
    modeOfTravel: builder.query({
      query: () => {
        return {
          url: `${Environment.taServiceUrl}/taserv/common_dropdown_get/modeoftravel`,
          method: "GET",
        };
      },
    }),
    getEligibleAmount: builder.mutation({
      query: (payload) => ({
        url: `${Environment.taServiceUrl}/taserv/eligible_amount_fuel`,
        method: "POST",
        body: payload,
      }),
    }),
    getBusinessSegments: builder.query({
      query: ({ query = "", page = 1 } = {}) => {
        return {
          url: `${Environment.masterServiceUrl}/mstserv/searchbusinesssegment?query=${query}&page=${page}`,
          method: "GET",
        };
      },
    }),
    getCcSegments: builder.query({
      query: ({ query = "", bs_id } = {}) => {
        return {
          url: `${Environment.masterServiceUrl}/mstserv/searchbs_cc?query=${query}&bs_id=${bs_id}`,
          method: "GET",
        };
      },
    }),
    fuelAllowanceCreate: builder.mutation({
      query: (formData) => {
        console.log("formData-->", formData);
        return {
          url: `${Environment.taServiceUrl}/taserv/fuel_allowance_create`,
          method: "POST",
          body: formData,
        };
      },
    }),
    getDateRelaxation: builder.query({
      query: ({ tour_no = "", page } = {}) => {
        return {
          url: `${Environment.taServiceUrl}/taserv/date_relaxation?tour_no=${tour_no}&page=${page}`,
          method: "GET",
        };
      },
    }),
    updateDateRelaxationStatus: builder.mutation({
      query: (body) => ({
        url: `${Environment.taServiceUrl}/taserv/date_relaxation`,
        method: "POST",
        body, // [{ id, status, tour_id }]
      }),
    }),
    getFuelAllowanceAll: builder.query({
      query: ({ page = 1, status = 2 }) =>
        `${Environment.taServiceUrl}/taserv/fuel_allowance_summary?page=${page}&status=${status}`,
      method: "GET",
      providesTags: (result, error, { status }) => [
        { type: "FuelAllowance", id: `STATUS-${status}` },
      ],
      keepUnusedDataFor: 300, // Cache timeout in seconds
    }),
    getChatSummary: builder.query({
      query: ({ page = 1 } = {}) => ({
        url: `${Environment.taServiceUrl}/taserv/chat_summary?page=${page}`,
        method: "GET",
      }),
    }),
    deleteChat: builder.mutation({
      query: (params_data) => {
        const params = new URLSearchParams(params_data);
        return {
          //delete_chat_box?chatid=2477&tourid=4246
          url: `${Environment.taServiceUrl
            }/taserv/delete_chat_box?${params.toString()}`,
          method: "DELETE",
        };
      },
    }),
    getChatBox: builder.query({
      query: ({ tourid, page = 1 }) =>
        `${Environment.taServiceUrl}/taserv/chat_box?tourid=${tourid}&page=${page}`,
      method: "GET",
    }),
    postChatBox: builder.mutation({
      query: ({ tourid, approver_id, comment, type = 1 }) => ({
        url: `${Environment.taServiceUrl}/taserv/chat_box`,
        method: "POST",
        body: { request: tourid, ref_type: 1, approver_id, comment, type },
      }),
    }),

    postChatBoxView: builder.mutation({
      query: ({ tourid }) => ({
        url: `${Environment.taServiceUrl}/taserv/chat_box_view?tourid=${tourid}`,
        method: "POST",
        body: {}, // You can include a body if needed
      }),
    }),
    adminSummary: builder.query({
      query: (params_data) => {
        const params = new URLSearchParams(params_data);
        return {
          url: `${Environment.taServiceUrl
            }/taserv/admin_summary?${params.toString()}`,
          method: "GET",
        };
      },
    }),
    getLodging: builder.query({
      query: (tour_no) => {
        return {
          url: `${Environment.taServiceUrl}/taserv/lodging/tour/${tour_no}`,
          method: "GET",
        };
      },
    }),
    lodgingCreate: builder.mutation({
      query: (payload) => {
        //console.log("PAYLOAD->>>", JSON.stringify(payload));
        return {
          url: `${Environment.taServiceUrl}/taserv/lodging`,
          method: "POST",
          body: payload,
        };
      },
    }),
    commonDropDownGet: builder.query({
      query: (key) => {
        return {
          url: `${Environment.taServiceUrl}/taserv/common_dropdown_get/${key}`,
          method: "GET",
        };
      },
    }),

    insertCity: builder.query({
      query: ({ city_name, page }) => {
        //console.log("PAYLOAD->>>", page, city_name)
        return {
          url: `${Environment.taServiceUrl}/taserv/insert_ta_city?city_name=${city_name}&page=${page}`,
          method: "GET",
        };
      },
    }),
    LodgingEligibleAmt: builder.mutation({
      query: (payload) => {
        //console.log("PAYLOAD->>>", JSON.stringify(payload)); // for clarity
        return {
          url: `${Environment.taServiceUrl}/taserv/lodging/logic`,
          method: "POST",
          body: payload,
        };
      },
    }),
    getLocalConv: builder.query({
      query: (tour_no) => {
        return {
          // CORRECTED LINE HERE: use '/' instead of '='
          url: `${Environment.taServiceUrl}/taserv/localconv/tour/${tour_no}`,
          method: "GET",
        };
      },
    }),
    LocalConvCreate: builder.mutation({
      query: ({ data }) => {
        return {
          url: `${Environment.taServiceUrl}/taserv/localconv`,
          method: "POST",
          body: { data },
        };
      },
      // ...
    }),
    LocalConvEligibleAmt: builder.mutation({
      query: (payload) => {
        //console.log("PAYLOAD->>>", JSON.stringify(payload)); // for clarity
        return {
          url: `${Environment.taServiceUrl}/taserv/localconv/logic`,
          method: "POST",
          body: payload,
        };
      },
    }),
    dailydeimLogic: builder.mutation({
      query: (payload) => {
        //console.log("PAYLOAD->>>", JSON.stringify(payload)); // for clarity
        return {
          url: `${Environment.taServiceUrl}/taserv/dailydeim/logic`,
          method: "POST",
          body: payload,
        };
      },
    }),
    dailydeimCreate: builder.mutation({
      query: ({ data }) => {
        //console.log("PAYLOAD->>>", JSON.stringify({ data })); // for clarity
        return {
          url: `${Environment.taServiceUrl}/taserv/dailydeim`,
          method: "POST",
          body: { data },
        };
      },
    }),
    getAssociatedExpense: builder.query({
      query: (tour_no) => {
        return {
          url: `${Environment.taServiceUrl}/taserv/associate/tour/${tour_no}`,
          method: "GET",
        };
      },
    }),
    AssociateCreate: builder.mutation({
      query: (payload) => {
        //console.log("PAYLOAD->>>", JSON.stringify(payload));
        return {
          url: `${Environment.taServiceUrl}/taserv/associate`,
          method: "POST",
          body: payload,
        };
      },
    }),
    travelSubmit: builder.mutation({
      query: ({ data }) => {
        //console.log("PAYLOAD->>>", JSON.stringify({ data }, null, 2)); // for clarity
        return {
          url: `${Environment.taServiceUrl}/taserv/travel`,
          method: "POST",
          body: { data },
        };
      },
    }),

    getTravelExpense: builder.query({
      query: (tour_no) => {
        return {
          // CORRECTED LINE HERE: use '/' instead of '='
          url: `${Environment.taServiceUrl}/taserv/travel/tour/${tour_no}`,
          method: "GET",
        };
      },
    }),
    //PRPO
    // BRANCH INDENT REQUEST - MAKER SUMMARY
    // Update Maker Summary to accept filters
    branchIndentMakerSummary: builder.query({
      query: ({ page = 1, page_size = 10, ...filters }) => ({
        url: `${Environment.prpoServiceUrl}/prserv/branchrequest_maker_summary?page=${page}&page_size=${page_size}&is_summary=1`,
        method: "POST",
        body: filters, // Pass the filter object here
      }),
    }),

    // Update Approver Summary to accept filters
    branchIndentApproverSummary: builder.query({
      query: ({ page = 1, page_size = 10, ...filters }) => ({
        url: `${Environment.prpoServiceUrl}/prserv/branchrequest_approver_summary?page=${page}&page_size=${page_size}&is_summary=1`,
        method: "POST",
        body: filters, // Pass the filter object here
      }),
    }),

    // Added: Get Single Request Details (Edit/View)
    getBranchIndentDetails: builder.query({
      query: (id) => ({
        url: `${Environment.prpoServiceUrl}/prserv/branchrequest_edit/${id}`,
        method: "GET",
      }),
    }),

    BranchIndentDetails: builder.mutation({
      query: ({ id, data }) => ({
        url: `${Environment.prpoServiceUrl}/prserv/branchrequest_edit/${id}`,
        method: "POST",
        body: data,
      }),
    }),
    branchIndentAction: builder.mutation({
      query: ({ data, queryParam = "" }) => ({
        url: `${Environment.prpoServiceUrl}/prserv/branch_request_action${queryParam}`,
        method: "POST",
        body: data,
      }),
    }),
    ///prserv/prtran/498?page=1&page_size=10
    PRTransaction: builder.query({
      query: ({ id, params_data }) => {
        const params = new URLSearchParams(params_data);
        return {
          url: `${Environment.prpoServiceUrl
            }/prserv/prtran/${id}?${params.toString()}`,
          method: "GET",
        };
      },
    }),
    BranchDropdown: builder.query({
      //query: searchText, page: pageNo,display:"CS"
      query: ({ params_data }) => {
        const params = new URLSearchParams(params_data);
        return {
          url: `${Environment.userServiceUrl}/usrserv/search_branch?${params.toString()}`,
          method: "GET",
        };
      },
    }),
    StorageLocation: builder.query({
      query: ({ params_data }) => {
        const params = new URLSearchParams(params_data);
        return {
          url: `${Environment.userServiceUrl}/usrserv/fetch_storage_location?${params.toString()}`,
          method: "GET",
        };
      },
    }),
    ActivityDropdown: builder.query({
      query: ({ params_data }) => {
        const params = new URLSearchParams(params_data);
        return {
          url: `${Environment.vendorServiceUrl}/vendserv/supplier_activity_list?${params.toString()}`,
          method: "GET",
        };
      },
    }),
    BranchSearch: builder.query({
      query: ({ searchText = "", pageNo = 1 }) => ({
        url: `${Environment.userServiceUrl}/usrserv/search_branch`,
        method: "GET",
        params: {
          query: searchText,
          page: pageNo,
          display: "CS"
        },
      }),
    }),
    CommoditySearch: builder.query({
      query: ({ searchText = "", pageNo = 1 }) => ({
        url: `${Environment.masterServiceUrl}/mstserv/searchcommodity`,
        method: "GET",
        params: {
          query: searchText,
          page: pageNo,
        },
      }),
    }),
    ///mstserv/productclassification/161?page=1
    MainCategory: builder.query({
      query: (id, params_data) => {
        const params = new URLSearchParams(params_data);
        return {
          url: `${Environment.masterServiceUrl
            }/mstserv/productclassification/${id}?${params.toString()}`,
        };
      },
    }),
    // /mstserv/productcat/311?page=1
    SubCategory: builder.query({
      query: (id, params_data) => {
        const params = new URLSearchParams(params_data);
        return {
          url: `${Environment.masterServiceUrl
            }/mstserv/productcat/${id}?${params.toString()}`,
        };
      },
    }),
    ///mstserv/fetch_product_bycat_sub/cat/311/subcat/1327?page=1
    Product: builder.query({
      query: ({ catid, subcatid, params_data }) => {
        const params = new URLSearchParams(params_data);
        return {
          url: `${Environment.masterServiceUrl
            }/mstserv/fetch_product_bycat_sub/cat/${catid}/subcat/${subcatid}?${params.toString()}`,
        };
      },
    }),

    ProductNameSearch: builder.query({
      query: ({ page = 1, query = '', request_type }) => ({
        url: `${Environment.masterServiceUrl}/mstserv/search_mst_product_prpo?page=${page}&query=${query}&request_type=${request_type}`,
      }),
    }),
    SpecificationSearch: builder.query({
      query: ({ page = 1, code }) => ({
        url: `${Environment.masterServiceUrl}/mstserv/product_specification?page=${page}&code=${code}`,
      }),
    }),
    UomSearch: builder.query({
      query: ({ page = 1, query = '' }) => ({
        url: `${Environment.vendorServiceUrl}/vendmastserv/ven_uom_search?page=${page}&query=${query}`,
      }),
    }),
    CatalogCreate: builder.mutation({
      query: ({ supplierId, payload }) => ({
        url: `${Environment.vendorServiceUrl}/vendserv/supplieractivitydtl/${supplierId}/catelog`,
        method: 'POST',
        body: payload,
      }),
    }),

    GetCatalogDetails: builder.query({
      query: ({ supplierId, catalogId }) => ({
        url: `${Environment.vendorServiceUrl}/vendserv/supplieractivitydtl/${supplierId}/catelog/${catalogId}`,
      }),
    }),

    DeleteCatalog: builder.mutation({
      query: ({ supplierId, catalogId }) => ({
        url: `${Environment.vendorServiceUrl}/vendserv/supplieractivitydtl/${supplierId}/catelog/${catalogId}`,
        method: 'DELETE',
      }),
    }),
    CatalogUpdate: builder.mutation({
      query: ({ supplierId, catalogId, payload }) => ({
        url: `${Environment.vendorServiceUrl}/vendserv/supplieractivitydtl/${supplierId}/catelog/${catalogId}`,
        method: 'POST',
        body: payload,
      }),
    }),
    ConfigurationSearch: builder.query({
      query: ({ page = 1, query = '', code, specification }) => ({
        url: `${Environment.vendorServiceUrl}/vendmastserv/product_configuration`,
        method: 'GET',
        params: {
          page,
          code,
          specification,
          ...(query ? { query } : {}),
        },
      }),
    }),
    ModelSearch: builder.query({
      query: ({ page = 1, query = '', code, make_id }) => ({
        url: `${Environment.vendorServiceUrl}/vendmastserv/productmakemodel`,
        method: 'GET',
        params: {
          page,
          m_type: 'model',
          code,
          make_id,
          ...(query ? { query } : {}),
        },
      }),
    }),
    MakeSearch: builder.query({
      query: ({ page = 1, query = '', code }) => ({
        url: `${Environment.vendorServiceUrl}/vendmastserv/productmakemodel`,
        method: 'GET',
        params: {
          page,
          m_type: 'make',
          code,
          ...(query ? { query } : {}),
        },
      }),
    }),
    ProductTypeSearch: builder.query({
      query: ({ params_data } = {}) => ({
        url: `${Environment.masterServiceUrl}/mstserv/pdtclasstype`,
        method: "GET",
        params: {
          page: params_data?.page,
          ...(params_data?.data
            ? { data: params_data.data }
            : {}),
        },
      }),
    }),
    ProductSearch: builder.query({
      query: ({ searchText = "", pageNo = 1 }) => ({
        url: `${Environment.masterServiceUrl}/mstserv/product_search_rm`,
        method: "GET",
        params: {
          query: searchText,
          page: pageNo,
        },
      }),
    }),
    //usrserv/emp_empbranch/8009
    EmpBranch: builder.query({
      query: (emp_id) => ({
        url: `${Environment.userServiceUrl}/usrserv/emp_empbranch/${emp_id}`,
        method: "GET",
      }),
    }),
    PdtClassType: builder.query({
      query: (data, pageNo = 1) => ({
        url: `${Environment.masterServiceUrl}/mstserv/pdtclasstype?data=${data}&page=${pageNo}`,
        method: "GET",
      }),
    }),
    PcaSearch: builder.query({
      query: ({ params_data }) => {
        const params = new URLSearchParams(params_data);
        return {
          url: `${Environment.prpoServiceUrl
            }/prserv/search_pcano?${params.toString()}`,
        };
      },
    }),

    //pr_create_indep
    CreateIndepent: builder.mutation({
      query: (data) => {
        //console.log("PAYLOAD->>>", JSON.stringify({ data }, null, 2)); // for clarity
        return {
          url: `${Environment.prpoServiceUrl}/prserv/pr_create_indep`,
          method: "POST",
          body: data,
        };
      },
    }),
    //pca_details_for_pr_create
    PcaDetailsForCreate: builder.mutation({
      query: (data) => {
        //console.log("PAYLOAD->>>", JSON.stringify({ data }, null, 2)); // for clarity
        return {
          url: `${Environment.prpoServiceUrl}/prserv/pca_details_for_pr_create`,
          method: "POST",
          body: data,
        };
      },
    }),
    Uom: builder.query({
      query: (data, pageNo = 1) => ({
        url: `${Environment.masterServiceUrl}/mstserv/uom_search?query=${data}&page=${pageNo}`,
        method: "GET",
      }),
    }),
    bsSearch: builder.query({
      query: (query = "") => ({
        url: `${Environment.masterServiceUrl}/mstserv/searchbusinesssegment`,
        method: "GET",
        params: {
          query: query,
        },
      }),
    }),
    ccSearch: builder.query({
      query: ({ bs_id, query = "" }) => ({
        url: `${Environment.masterServiceUrl}/mstserv/searchbs_cc`,
        method: "GET",
        params: {
          bs_id: bs_id,
          query: query,
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
      query: ({ tour_id = 0, expid }) => {
        //console.log("PAYLOAD->>>", tour_id, expid)
        return {
          url: `${Environment.taServiceUrl}/taserv/document_get?tour_id=${tour_id}&ref_type=2&requirement_type=${expid}`,
          method: "GET",
        };
      },
    }),
    documentInsert: builder.mutation({
      query: (formData) => ({
        url: `${Environment.taServiceUrl}/taserv/document_insert`,
        method: "POST",
        body: formData,
      }),
    }),

    // In your service file (e.g., api.js)
    deleteDocument: builder.mutation({
      query: (docId) => ({
        url: `${Environment.taServiceUrl}/taserv/particular_doc_get/${docId}`,
        method: "DELETE",
      }),
    }),
    ExpenseDelete: builder.mutation({
  query: ({ tour_id, expid }) => ({
    url: `${Environment.taServiceUrl}/taserv/expense_delete/${tour_id}/tour/${expid}`,
    method: "POST",
    body: {},
  }),
}),
    getCCBS: builder.query({
      query: (params_data) => {
        const params = new URLSearchParams(params_data);
        return {
          url: `${Environment.taServiceUrl}/taserv/ccbs_get?${params}`,
          method: "GET",
        };
      },
    }),
    ExpenseSubmit: builder.mutation({
      query: (data) => ({
        url: `${Environment.taServiceUrl}/taserv/expense/submit`,
        method: "POST",
        body: data,
      }),
    }),
    getBusinessSegments: builder.query({
      query: ({ query = "", page = 1 } = {}) => {
        return {
          url: `${Environment.masterServiceUrl}/mstserv/searchbusinesssegment?query=${query}&page=${page}`,
          method: "GET",
        };
      },
    }),

    getCcSegments: builder.query({
      query: ({ query = "", bs_id } = {}) => {
        return {
          url: `${Environment.masterServiceUrl}/mstserv/searchbs_cc?query=${query}&bs_id=${bs_id}`,
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
      query: (tour_no) => {
        return {
          url: `${Environment.taServiceUrl}/taserv/approval_flow_get?type=all&tourid=${tour_no}`,
          method: "GET",
        };
      },
    }),
    getExpenseList: builder.query({
      query: () => {
        return {
          url: `${Environment.taServiceUrl}/taserv/expenselist`,
          method: "GET",
        };
      },
    }),
    prpoCommonReports: builder.mutation({
      query: ({ data, id }) => ({
        url: `${Environment.prpoServiceUrl}/prserv/prpo_common_reports?report_type=${id}`,
        method: "POST",
        body: data,
      }),
    }),
employeeList: builder.query({
      query: (params_data) => {
        const { branch, ...queryParams } = params_data;
        const params = new URLSearchParams(queryParams);
        return {
          url: `${Environment.userServiceUrl}/usrserv/branchwise_employee_get/${branch}?${params.toString()}`,
          method: "GET",
        };
      },
    }),
    GetBranchIndentEdit: builder.query({
      query: ({ id }) => {
        // const params = new URLSearchParams(params_data);
        return {
          url: `${Environment.prpoServiceUrl}/prserv/pr_branch_edit/${id}`,
          method: "GET",
        };
      },
    }),
    IndependentDetailView: builder.query({
      query: (id) => {
        // const params = new URLSearchParams(params_data);
        return {
          url: `${Environment.prpoServiceUrl}/prserv/pr_independent_detail_view/${id}`,
          method: "GET",
        };
      },
    }),
    UpdateBranchIndent: builder.mutation({
      query: ({ payload }) => ({
        url: `${Environment.prpoServiceUrl}/prserv/pr_branch_update`,
        method: "POST",
        body: payload,
      }),
    }),

    approverList: builder.query({
      query: ({ name = "", page = 1, branch = 0, type = "tour" }) => {
        const params = new URLSearchParams({
          name: name,
          page: page.toString(),
        });
        return {
          url: `${Environment.taServiceUrl
            }/taserv/branch_approver_get/${type}/branch/${branch}?${params.toString()}`,
          method: "GET",
        };
      },
    }),
    cancelDataGet: builder.query({
      query: (params) => {
        const params_data = new URLSearchParams(params);
        return {
          url: `${Environment.taServiceUrl
            }/taserv/cancelled_data?${params_data.toString()}`,
          method: "GET",
        };
      },
    }),
    listForCancelGet: builder.query({
      query: (params_data) => {
        const params = new URLSearchParams(params_data);
        return {
          url: `${Environment.taServiceUrl
            }/taserv/approved_data?${params.toString()}`,
          method: "GET",
        };
      },
    }),
    onbeHalfDataGet: builder.query({
      query: () => {
        return {
          url: `${Environment.taServiceUrl}/taserv/onbehalf_emp_get`,
          method: "GET",
        };
      },
    }),
    bookingDetails: builder.query({
      query: (params_data) => {
        const params = new URLSearchParams(params_data);
        return {
          url: `${Environment.taServiceUrl
            }/taserv/get_requirements_admin?${params.toString()}`,
          method: "GET",
        };
      },
    }),
    accBooking: builder.mutation({
      query: ({ data }) => {
        //console.log("PAYLOAD->>>", data);
        return {
          url: `${Environment.taServiceUrl}/taserv/accommodation_booking_admin`,
          method: "POST",
          body: data,
        };
      },
    }),
    cabBooking: builder.mutation({
      query: ({ data }) => {
        //console.log("PAYLOAD->>>", data);
        return {
          url: `${Environment.taServiceUrl}/taserv/cab_booking_admin`,
          method: "POST",
          body: data,
        };
      },
    }),
    airBooking: builder.mutation({
      query: ({ data }) => {
        //console.log("PAYLOAD->>>", data);
        return {
          url: `${Environment.taServiceUrl}/taserv/air_booking_admin`,
          method: "POST",
          body: data,
        };
      },
    }),
    busBooking: builder.mutation({
      query: ({ data }) => {
        //console.log("PAYLOAD->>>", data);
        return {
          url: `${Environment.taServiceUrl}/taserv/bus_booking_admin`,
          method: "POST",
          body: data,
        };
      },
    }),
    trainBooking: builder.mutation({
      query: ({ data }) => {
        //console.log("PAYLOAD->>>", data);
        return {
          url: `${Environment.taServiceUrl}/taserv/train_booking_admin`,
          method: "POST",
          body: data,
        };
      },
    }),
    getEmployeeBranch: builder.query({
      query: (page) => {
        return {
          url: `${Environment.userServiceUrl}/usrserv/search_employeebranch?page=${page}`,
          method: "GET",
        };
      },
    }),
    getmodeOfTravel: builder.query({
      query: () => {
        return {
          url: `${Environment.taServiceUrl}/taserv/common_dropdown_get/mode_of_travel`,
          method: "GET",
        };
      },
    }),
    getDailyReimbursement: builder.query({
      query: (tour_no) => {
        return {
          // CORRECTED LINE HERE: use '/' instead of '='
          url: `${Environment.taServiceUrl}/taserv/dailydeim/tour/${tour_no}`,
          method: "GET",
          // No need to explicitly set method: 'GET' as it's the default for builder.query
        };
      },
    }),
    getIncidentalExpense: builder.query({
      query: (tour_no) => {
        return {
          // CORRECTED LINE HERE: use '/' instead of '='
          url: `${Environment.taServiceUrl}/taserv/incidental/tour/${tour_no}`,
          method: "GET",
          // No need to explicitly set method: 'GET' as it's the default for builder.query
        };
      },
    }),
    getPackagingFreight: builder.query({
      query: (tour_no) => {
        return {
          url: `${Environment.taServiceUrl}/taserv/packingmvg/tour/${tour_no}`,
          method: "GET",
        };
      },
    }),
    getLocalDeputation: builder.query({
      query: (tour_no) => {
        return {
          url: `${Environment.taServiceUrl}/taserv/localdeputation/tour/${tour_no}`,
        };
      },
    }),
    getFuelAllowanceDetails: builder.query({
      query: (tourId) =>
        `${Environment.taServiceUrl}/taserv/fuel_allowance_details/${tourId}`,
      method: "GET",
    }),

    getFuelDocuments: builder.query({
      query: (tourId) =>
        `${Environment.taServiceUrl}/taserv/fuel_document_get?tour_id=${tourId}&ref_type=4`,
      method: "GET",
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
      query: ({ type, tour_id }) =>
        `${Environment.taServiceUrl}/taserv/fuel_approval_flow_get?type=${type}&tour_id=${tour_id}`,
      method: "GET",
    }),

    fuelAllowanceUpload: builder.mutation({
      query: (data) => ({
        url: `${Environment.taServiceUrl}/taserv/fuelallowance_upload`,
        method: "POST",
        body: data,
      }),
    }),

    fuelAllowanceDownload: builder.query({
      query: () => `${Environment.taServiceUrl}/taserv/fuelallowance_download`,
      method: "GET",
    }),

    rmApproval: builder.mutation({
      query: ({ tourId, comment }) => ({
        url: `${Environment.taServiceUrl}/taserv/fuel_rm_skip/${tourId}`,
        method: "POST",
        body: { comment },
      }),
    }),

    EmpBaseGet: builder.query({
      query: () => {
        return {
          url: `${Environment.taServiceUrl}/taserv/employee_base_get`,
          method: "GET",
        };
      },
    }),
// Advance
getAdvanceMakerSummary: builder.query({
  query: ({ page = 1, val = "" }) => ({
    url: `${Environment.taServiceUrl}/taserv/touradvance?page=${page}${val}`,
    method: "GET",
  }),
}),
getAdvanceEditDetails: builder.query({
  query: ({ tour_no }) => ({
    url: `${Environment.taServiceUrl}/taserv/touradvance/${tour_no}`,
    method: "GET",
  }),
}),
getAdvancemakerSummary: builder.query({
  query: ({ page = 1, val = "" }) => ({
    url: `${Environment.taServiceUrl}/taserv/advance_summary?page=${page}${val}`,
    method: "GET",
  }),
}),
getTourBsCcFetch: builder.query({
  query: ({ reason }) => ({
    url: `${Environment.taServiceUrl}/taserv/tour_bscc_fetch`,
    method: "GET",
    params: { reason },
  }),
}),
getAdvanceApproverSummary: builder.query({
  query: ({ status = 2, page = 1, val = "" }) => ({
    url: `${Environment.taServiceUrl}/taserv/tourapprove/advance?status=${status}&page=${page}${val}`,
    method: "GET",
  }),
}),

// Cancel
getCancelMakerSummary: builder.query({
  query: ({ page = 1, val = "" }) => ({
    url: `${Environment.taServiceUrl}/taserv/cancelled_data?type=TourCancel&page=${page}${val}`,
    method: "GET",
  }),
}),
getCancelApproverSummary: builder.query({
  query: ({ status = 2, page = 1, val = "" }) => ({
    url: `${Environment.taServiceUrl}/taserv/tourapprove/TourCancel?status=${status}&page=${page}${val}`,
    method: "GET",
  }),
}),

// Assign Approver
getAssignApproverSummary: builder.query({
  query: ({ page = 1, val = "" }) => ({
    url: `${Environment.taServiceUrl}/taserv/approverlist?page=${page}${val}`,
    method: "GET",
  }),
}),
assignApprover: builder.mutation({
  query: (payload) => ({
    url: `${Environment.taServiceUrl}/taserv/approverlist`,
    method: "POST",
    body: payload,
  }),
}),

// Advance Recovery
getRecoverySummary: builder.mutation({
  query: (payload) => ({
    url: `${Environment.taServiceUrl}/taserv/recovery_summary`,
    method: "POST",
    body: payload,
  }),
}),

// Settlement Approval (ApUser)
getApUserSummary: builder.query({
  query: ({ page = 1, ...filters }) => {
    const params = new URLSearchParams({ page, ...filters });
    return {
      url: `${Environment.taServiceUrl}/taserv/apuser_summary?${params.toString()}`,
      method: "GET",
    };
  },
}),

// Tour Report
getTourReportSummary: builder.query({
  query: ({ page = 1, ...filters }) => {
    const params = new URLSearchParams({ page, ...filters });
    return {
      url: `${Environment.taServiceUrl}/taserv/report_tour_summary?${params.toString()}`,
      method: "GET",
    };
  },
}),
  }),
});

export const {
  //USER
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
  
  //TA
  useLazyTravelMakerSummaryQuery,
  useLazyBranchListQuery,
  useLazyEmpDetailsQuery,
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
  useLazyDepartmentDetailGetQuery,
  useLazyCommonDropDownGetQuery,
  useLazyClientListTaQuery,
  useLazyCityListQuery,
  useDeleteRequirementMutation,
  useAdminReservMutation,
  useReqRejectMutation,
  useLazyOnBehalfListQuery,
  useLazyTravelApproveSummaryQuery,
  useLazyGetExpenseSummaryQuery,
  useLazyExpenseApprovalSummarryQuery,
  useGetFuelAllowanceSummaryQuery,
  useGetEmployeeDetailsForFuelQuery,
  useModeOfTravelQuery,
  useGetEligibleAmountMutation,
  useFuelAllowanceCreateMutation,
  useGetBusinessSegmentsQuery,
  useGetCcSegmentsQuery,
  useGetDateRelaxationQuery,
  useUpdateDateRelaxationStatusMutation,
  useGetFuelAllowanceAllQuery,
  useGetChatSummaryQuery,
  useGetChatBoxQuery,
  usePostChatBoxMutation,
  usePostChatBoxViewMutation,
  useLazyAdminSummaryQuery,
  useLazyGetLodgingQuery,
  useLodgingCreateMutation,
  useLazyInsertCityQuery,
  useLodgingEligibleAmtMutation,
  useGetLocalConvQuery,
  useLocalConvCreateMutation,
  useLocalConvEligibleAmtMutation,
  useLazyGetDailyReimbursementQuery,
  useDailydeimCreateMutation,
  useDailydeimLogicMutation,
  useLazyGetAssociatedExpenseQuery,
  useAssociateCreateMutation,
  useLazyGetTravelExpenseQuery,
  useTravelSubmitMutation,
  useLazyDocumentGetQuery,
  useDeleteDocumentMutation,
  useDocumentInsertMutation,
  useExpenseDeleteMutation,
  useLazyGetCCBSQuery,
  useExpenseSubmitMutation,
  useLazyGetBusinessSegmentsQuery,
  useLazyGetCcSegmentsQuery,
  useLazyGetApprovalFlowQuery,
  useLazyGetExpenseDetailsQuery,
  useLazyGetExpenseListQuery,
  usePrpoCommonReportsMutation,
  useLazyEmployeeListQuery,
  useLazyApproverListQuery,
  useLazyCancelDataGetQuery,
  useLazyListForCancelGetQuery,
  useOnbeHalfDataGetQuery,
  useLazyBookingDetailsQuery,
  useAccBookingMutation,
  useCabBookingMutation,
  useAirBookingMutation,
  useBusBookingMutation,
  useTrainBookingMutation,
  useGetEmployeeBranchQuery,
  useGetmodeOfTravelQuery,
  useGetIncidentalExpenseQuery,
  useLazyGetIncidentalExpenseQuery,
  useGetPackagingFreightQuery,
  useLazyGetPackagingFreightQuery,
  useGetFuelAllowanceDetailsQuery,
  useGetFuelDocumentsQuery,
  useFuelApprovalMutation,
  useFuelRejectMutation,
  useFuelReturnMutation,
  useFuelApprovalFlowQuery,
  useFuelAllowanceUploadMutation,
  useFuelAllowanceDownloadQuery,
  useRmApprovalMutation,
  useLazyEmpBaseGetQuery,
  useDeleteChatMutation,
  useLazyProductNameSearchQuery,
  useLazySpecificationSearchQuery,
  useLazyUomSearchQuery,
  useCatalogCreateMutation,
  useLazyMakeSearchQuery,
  useLazyModelSearchQuery,
  useLazyConfigurationSearchQuery,

useLazyGetAdvanceMakerSummaryQuery,
useLazyGetAdvancemakerSummaryQuery,
useLazyGetAdvanceApproverSummaryQuery,
useLazyGetAdvanceEditDetailsQuery,
useLazyGetTourBsCcFetchQuery,
useLazyGetCancelMakerSummaryQuery,
useLazyGetCancelApproverSummaryQuery,
useLazyGetAssignApproverSummaryQuery,
useAssignApproverMutation,
useGetRecoverySummaryMutation,
useLazyGetApUserSummaryQuery,
useLazyGetTourReportSummaryQuery,

} = apiSlice;

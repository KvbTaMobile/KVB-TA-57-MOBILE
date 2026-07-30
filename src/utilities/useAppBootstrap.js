import { useEffect } from "react";
import { useDispatch } from "react-redux";

// RTK Query hooks
import {
  useLazyDaySummaryQuery,
  useLazyApprovalRoleQuery,
  useLazyTaskDurationQuery,
  useLazyDesignationStatusQuery,
  useDesignationBasedNewStatusQuery,
} from "../redux/rtk_query/apiSlice";

// Slice actions
import { setCheckInData } from "../redux/slices/hrms_slices/checkInSlice";
import { setRoles } from "../redux/slices/hrms_slices/roleSlice";
import { setTaskDuration } from "../redux/slices/hrms_slices/taskDurationSlice";
import { setFilterOptions } from "../redux/slices/hrms_slices/filterOptionSlice";
import { setDesignationStatus } from "../redux/slices/hrms_slices/designationSlice";

export const useAppBootstrap = () => {
  const dispatch = useDispatch();

  const today = new Date().toISOString().split("T")[0];

  // Lazy queries
  const [getDaySummary, daySummaryRes] = useLazyDaySummaryQuery();

  const [getRoles, rolesRes] = useLazyApprovalRoleQuery();

  const [getTaskDuration, taskDurationRes] = useLazyTaskDurationQuery();

  const [getDesignationStatus, designationRes] =
    useLazyDesignationStatusQuery();
  const { data, isSuccess } = useDesignationBasedNewStatusQuery();

  //  Trigger all APIs
  useEffect(() => {
    getDaySummary(today);
    getRoles();
    // getTaskDuration();   // enable for live noe get error
    getDesignationStatus();
  }, []);

  useEffect(() => {
    if (isSuccess && data?.length) {
      dispatch(setDesignationStatus(data));
    }
  }, [isSuccess, data]);

  const task_duration_mockdata = {
    task_duration: 0.0,
  };

  // mock
  useEffect(() => {
    dispatch(setTaskDuration(task_duration_mockdata));
  }, []);

  //end

  useEffect(() => {
    if (daySummaryRes.data) {
      dispatch(setCheckInData(daySummaryRes.data));
    }
  }, [daySummaryRes.data]);

  useEffect(() => {
    if (rolesRes.data) {
      dispatch(setRoles(rolesRes.data));
    }
  }, [rolesRes.data]);

  //   useEffect(() => {
  //     if (taskDurationRes.data) {
  //         dispatch(setTaskDuration(taskDurationRes.data));
  //     }
  //   }, [taskDurationRes.data]);

  useEffect(() => {
    if (designationRes.data) {
      dispatch(setFilterOptions(designationRes.data));
    }
  }, [designationRes.data]);
};

import { api, getCachedUser } from "./apiClient";
import { formatTime24 } from "../utils/dateTime";
import type {
  DashboardSummary,
  KpiMetric,
  CategoryMetric,
  SeverityMetric,
  StatusMetric,
  FaultTicket,
  MaintenanceItem,
  ActivityItem,
  AlertItem,
  BottomStat
} from "../types";

export async function getDashboardSummary(division = ""): Promise<DashboardSummary> {
  // Single backend call — all heavy aggregations are done server-side and cached for 5 minutes
  const statsRes = await api.reports.dashboard(division);
  const stats = statsRes.data;

  const normalizeDivName = (div?: string) => {
    if (!div) return "Others";
    const l = div.toLowerCase();
    if (l.includes("raipur") || l === "r") return "Raipur";
    if (l.includes("bilaspur") || l === "bsp") return "Bilaspur";
    if (l.includes("nagpur") || l === "ngp") return "Nagpur";
    return "Others";
  };

  const targetDiv = division ? normalizeDivName(division) : "";

  // Active faults: already computed and returned by the backend
  const activeFaultsList = (stats.activeFaultsList || []).filter((r: any) => {
    const isAllOk = r.reason === "All OK" || (r.formData && r.formData.actionType === "OK");
    if (isAllOk) return false;
    if (targetDiv) return normalizeDivName(r.division) === targetDiv;
    return true;
  });

  const activeFaultsCount = activeFaultsList.filter((r: any) => {
    const isWifi = (r.formType || r.name || "").toLowerCase() === "wi-fi";
    const isWT = (r.formType || r.name || "").toLowerCase().includes("walkie-talkie");
    return !isWifi && !isWT;
  }).length;

  // KPI counts come directly from backend summary (efficient DB COUNT queries)
  const totalAssets = stats.summary.assetsCount;
  const todayFaultsCount = stats.summary.todayFaultsCount ?? 0;
  const todayRectifiedCount = stats.summary.todayRectifiedCount ?? 0;

  const assetsByStatusMap = stats.assetsByStatus.reduce((acc: any, curr: any) => {
    acc[curr.status.toUpperCase()] = curr.count;
    return acc;
  }, { OPERATIONAL: 0, ALL_OK: 0, FAULTY: 0, UNDER_MAINTENANCE: 0 });

  const allOkCount = assetsByStatusMap.OPERATIONAL || assetsByStatusMap.ALL_OK || 0;
  const maintenanceCount = assetsByStatusMap.UNDER_MAINTENANCE;
  const faultyCount = assetsByStatusMap.FAULTY;

  const kpis: KpiMetric[] = [
    {
      id: "assets",
      label: "Total Assets",
      value: totalAssets.toString(),
      detail: "All active telecom inventory",
      tone: "blue",
      series: [41, 39, 42, 45, 44, 47, 46, 49, 51, 48, 53, totalAssets]
    },
    {
      id: "All Ok",
      label: "All Ok Assets",
      value: allOkCount.toString(),
      detail: `${totalAssets > 0 ? ((allOkCount / totalAssets) * 100).toFixed(1) : 0}% of total assets`,
      tone: "green",
      series: [69, 70, 68, 73, 72, 75, 71, 74, 70, 72, 71, allOkCount]
    },
    {
      id: "maintenance",
      label: "Under Maintenance",
      value: maintenanceCount.toString(),
      detail: `${totalAssets > 0 ? ((maintenanceCount / totalAssets) * 100).toFixed(1) : 0}% of total assets`,
      tone: "amber",
      series: [24, 25, 31, 28, 34, 32, 33, 27, 30, 26, 28, maintenanceCount]
    },
    {
      id: "activeFaults",
      label: "Active Faults",
      value: activeFaultsCount.toString(),
      detail: "",
      tone: "red",
      series: [18, 20, 22, 21, 25, 27, 23, 24, 22, 19, 21, activeFaultsCount]
    },
    {
      id: "faultsToday",
      label: "Faults Reported Today",
      value: todayFaultsCount.toString(),
      detail: "",
      tone: "amber",
      series: [0, 1, 3, 2, 4, 5, 3, 2, 4, 2, 3, todayFaultsCount]
    },
    {
      id: "resolvedToday",
      label: "Faults Resolved",
      value: todayRectifiedCount.toString(),
      detail: "",
      tone: "green",
      series: [2, 3, 5, 4, 6, 8, 7, 9, 6, 5, 8, todayRectifiedCount]
    }
  ];

  const categoryColors: Record<string, string> = {
    IPIS: "#0b6dff",
    CCTV: "#10b981",
    "PA SYSTEM": "#f5b51b",
    OFC: "#7c3aed",
    VHF: "#0f5fbf",
    OTHERS: "#8b95a8"
  };

  const categories: CategoryMetric[] = stats.assetsByCategory.map((c: any) => {
    const name = c.category;
    const value = c.count;
    const percent = totalAssets > 0 ? `${((value / totalAssets) * 100).toFixed(1)}%` : "0%";
    const color = categoryColors[name.toUpperCase()] || categoryColors.OTHERS;
    return { name, value, percent, color };
  });

  if (categories.length === 0) {
    categories.push({ name: "No Assets", value: 0, percent: "0%", color: "#8b95a8" });
  }

  const severities: SeverityMetric[] = [];

  const statuses: StatusMetric[] = [
    { status: "All Ok", count: allOkCount, percent: totalAssets > 0 ? `${((allOkCount / totalAssets) * 100).toFixed(1)}%` : "0%", color: "#20a91f" },
    { status: "Under Maintenance", count: maintenanceCount, percent: totalAssets > 0 ? `${((maintenanceCount / totalAssets) * 100).toFixed(1)}%` : "0%", color: "#ffb51b" },
    { status: "Faulty", count: faultyCount, percent: totalAssets > 0 ? `${((faultyCount / totalAssets) * 100).toFixed(1)}%` : "0%", color: "#ff3328" },
    { status: "Offline", count: 0, percent: "0%", color: "#c9ced8" }
  ];

  const tickets: FaultTicket[] = [];
  const maintenance: MaintenanceItem[] = [];

  const activity: ActivityItem[] = (stats.recentLogs || []).map((l: any) => {
    const actionTypes: Record<string, any> = {
      USER_LOGIN: "user",
      USER_REGISTER: "user",
      SETTING_UPDATE: "asset",
      FAULT_REPORT: "ticket",
      FAULT_ASSIGN: "maintenance",
      FAULT_RESOLVE: "approved",
      MAINTENANCE_LOG: "maintenance",
      MAINTENANCE_APPROVE: "approved",
      ASSET_CREATE: "asset",
      ASSET_UPDATE: "asset"
    };
    const date = new Date(l.createdAt);
    const timeStr = formatTime24(date);
    return {
      id: l.id,
      type: actionTypes[l.action] || "asset",
      title: l.details || l.action,
      detail: `By ${l.user?.name || "System"} (${l.user?.role || "SYSTEM"})`,
      time: timeStr
    };
  });

  if (activity.length === 0) {
    activity.push({
      id: "a-default",
      type: "asset",
      title: "System initialized successfully",
      detail: "All telecom registries are online.",
      time: "Just now"
    });
  }

  const alerts: AlertItem[] = [
    {
      id: "alert-all-clear",
      tone: "blue",
      title: "All links functioning All Ok",
      detail: "No active critical faults recorded."
    }
  ];

  const bottomStats: BottomStat[] = [
    { id: "s1", label: "Stations", value: stats.summary.stationsCount.toString(), detail: "Active Stations", tone: "blue" },
    { id: "s2", label: "LC Gates", value: stats.summary.gatesCount.toString(), detail: "Total LC Gates", tone: "green" },
    { id: "s3", label: "ABSS Stations", value: (stats.commissioningSummary?.abssStationsCount || 0).toString(), detail: "Commissioned Stations", tone: "purple" },
    { id: "s4", label: "Divisional Stations", value: (stats.commissioningSummary?.divisionalStationsCount || 0).toString(), detail: "Commissioned Stations", tone: "amber" }
  ];

  const activeUser = getCachedUser() || {
    name: "Telecom SSE",
    designation: "SSE / Telecom",
    role: "SSE"
  };

  // Group active faults by category for Category-wise widget
  const categoryCounts: Record<string, number> = {};
  for (const r of activeFaultsList) {
    const cat = r.category || "Others";
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  }
  const dailyPositionByCategory = Object.entries(categoryCounts).map(([category, count]) => ({
    category,
    count
  }));

  // Division submissions today come from backend
  const dailyPositionByDivision = stats.dailyPositionByDivision || [];

  // Active faults by division (excluding Wi-Fi and Walkie-Talkie)
  const activeDivCounts: Record<string, number> = targetDiv
    ? { [targetDiv]: 0 }
    : { Raipur: 0, Bilaspur: 0, Nagpur: 0 };
  for (const r of activeFaultsList) {
    const isWifi = (r.formType || "").toLowerCase() === "wi-fi";
    const isWT = (r.formType || "").toLowerCase().includes("walkie-talkie");
    if (isWifi || isWT) continue;
    const normalized = normalizeDivName(r.division);
    if (targetDiv && normalized !== targetDiv) continue;
    activeDivCounts[normalized] = (activeDivCounts[normalized] || 0) + 1;
  }
  const activeFaultsByDivision = Object.entries(activeDivCounts).map(([division, count]) => ({
    division,
    count
  }));

  // Weekly & daily trend come from backend (computed server-side)
  const weeklyFaultsTrend = stats.weeklyFaultsTrend || [];
  const dailyFaultsTrend = stats.dailyFaultsTrend || [];

  const walkieTalkieSummary = {
    totalDefective: 0,
    divisions: []
  };

  return {
    division: `${division || "All Divisions"}`,
    dateRange: `${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} - ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`,
    user: {
      name: activeUser.name,
      designation: activeUser.designation || "Telecom Operator",
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(activeUser.name)}`,
      role: activeUser.role as any,
      division: activeUser.division
    },
    kpis,
    categories,
    severities,
    statuses,
    tickets,
    maintenance,
    activity,
    alerts,
    bottomStats,
    commissioningSummary: stats.commissioningSummary,
    dailyPositionByDivision,
    dailyPositionByCategory,
    monthlyFaultsTrend: stats.monthlyFaultsTrend || [],
    dailyPositionStatus: stats.dailyPositionStatus || [],
    weeklyFaultsTrend,
    dailyFaultsTrend,
    activeFaultsByDivision,
    walkieTalkieSummary,
    walkieTalkieDivisions: stats.walkieTalkieDivisions || []
  };
}

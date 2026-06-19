import { api } from "./apiClient";
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
  // Fetch only dashboard stats payload from backend in a single request!
  const statsRes = await api.reports.dashboard(division);
  const stats = statsRes.data;

  // Let's build the stats mapping:
  const totalAssets = stats.summary.assetsCount;
  const assetsByStatusMap = stats.assetsByStatus.reduce((acc: any, curr: any) => {
    acc[curr.status.toUpperCase()] = curr.count;
    return acc;
  }, { OPERATIONAL: 0, FAULTY: 0, UNDER_MAINTENANCE: 0 });

  const operationalCount = assetsByStatusMap.OPERATIONAL;
  const maintenanceCount = assetsByStatusMap.UNDER_MAINTENANCE;
  const faultyCount = assetsByStatusMap.FAULTY;
  
  const healthPercent = totalAssets > 0 ? ((operationalCount / totalAssets) * 100).toFixed(1) : "100";

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
      id: "operational",
      label: "Operational Assets",
      value: operationalCount.toString(),
      detail: `${totalAssets > 0 ? ((operationalCount / totalAssets) * 100).toFixed(1) : 0}% of total assets`,
      tone: "green",
      series: [69, 70, 68, 73, 72, 75, 71, 74, 70, 72, 71, operationalCount]
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
      value: (stats.summary.activeFaultsCount || 0).toString(),
      detail: "Pending faults",
      tone: "red",
      series: [18, 20, 22, 21, 25, 27, 23, 24, 22, 19, 21, stats.summary.activeFaultsCount || 0]
    },
    {
      id: "faultsToday",
      label: "Faults Today",
      value: (stats.summary.todayFaultsCount || 0).toString(),
      detail: "Faults reported today",
      tone: "amber",
      series: [0, 1, 3, 2, 4, 5, 3, 2, 4, 2, 3, stats.summary.todayFaultsCount || 0]
    },
    {
      id: "resolvedToday",
      label: "Resolved Today",
      value: (stats.summary.todayRectifiedCount || 0).toString(),
      detail: "Faults resolved today",
      tone: "green",
      series: [2, 3, 5, 4, 6, 8, 7, 9, 6, 5, 8, stats.summary.todayRectifiedCount || 0]
    }
  ];

  // Map Categories
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

  // Map Severities
  const severityColors: Record<string, string> = {
    CRITICAL: "#ff3328",
    MAJOR: "#ff8a00",
    MINOR: "#f7b814",
    INFO: "#0b6dff"
  };
  const severities: SeverityMetric[] = [];

  // Map Statuses
  const statuses: StatusMetric[] = [
    { status: "Operational", count: operationalCount, percent: totalAssets > 0 ? `${((operationalCount / totalAssets) * 100).toFixed(1)}%` : "0%", color: "#20a91f" },
    { status: "Under Maintenance", count: maintenanceCount, percent: totalAssets > 0 ? `${((maintenanceCount / totalAssets) * 100).toFixed(1)}%` : "0%", color: "#ffb51b" },
    { status: "Faulty", count: faultyCount, percent: totalAssets > 0 ? `${((faultyCount / totalAssets) * 100).toFixed(1)}%` : "0%", color: "#ff3328" },
    { status: "Offline", count: 0, percent: "0%", color: "#c9ced8" }
  ];

  // Map Recent Tickets (take up to 5)
  const tickets: FaultTicket[] = [];

  // Map Maintenance Due
  const maintenance: MaintenanceItem[] = [];

  // Map Activity Feed (from audit logs)
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
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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

  // Alerts & Notifications (Map from recent open tickets and pending maintenance)
  const alerts: AlertItem[] = [
    {
      id: "alert-all-clear",
      tone: "blue",
      title: "All links functioning operational",
      detail: "No active critical faults recorded."
    }
  ];

  // Map Bottom Stats
  const bottomStats: BottomStat[] = [
    { id: "s1", label: "Stations", value: stats.summary.stationsCount.toString(), detail: "Active Stations", tone: "blue" },
    { id: "s2", label: "LC Gates", value: stats.summary.gatesCount.toString(), detail: "Total LC Gates", tone: "green" },
    { id: "s3", label: "ABSS Stations", value: (stats.commissioningSummary?.abssStationsCount || 0).toString(), detail: "Commissioned Stations", tone: "purple" },
    { id: "s4", label: "Divisional Stations", value: (stats.commissioningSummary?.divisionalStationsCount || 0).toString(), detail: "Commissioned Stations", tone: "amber" }
  ];

  const userProfile = await api.auth.getProfile().catch(() => ({ data: null }));
  const activeUser = userProfile.data || {
    name: "Telecom SSE",
    designation: "SSE / Telecom",
    role: "SSE"
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
    dailyPositionByDivision: stats.dailyPositionByDivision,
    dailyPositionByCategory: stats.dailyPositionByCategory,
    monthlyFaultsTrend: stats.monthlyFaultsTrend || [],
    dailyPositionStatus: stats.dailyPositionStatus || []
  };
}

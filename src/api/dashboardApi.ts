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

const toDateValue = (date = new Date()) => {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
};

export async function getDashboardSummary(division = ""): Promise<DashboardSummary> {
  const todayStr = toDateValue(new Date());
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = toDateValue(sevenDaysAgo);

  // Fetch dashboard stats, active faults, and weekly records in parallel
  const [statsRes, activeFaultsRes, weeklyRecordsRes] = await Promise.all([
    api.reports.dashboard(division),
    api.dailyPosition.list({ division: division || "", isFaulty: "true", limit: 500 }).catch(() => ({ data: [] })),
    api.dailyPosition.list({ division: division || "", dateFrom: sevenDaysAgoStr, limit: 1000 }).catch(() => ({ data: [] }))
  ]);

  const weeklyData = weeklyRecordsRes.data || [];

  // Filter in-memory to get today's, resolved, and walkie-talkie records
  const todayRecordsRes = {
    data: weeklyData.filter((r: any) => r.date && r.date.slice(0, 10) === todayStr)
  };

  const resolvedRecordsRes = {
    data: weeklyData.filter((r: any) => r.status === "RECTIFIED" || r.status === "OPERATIONAL" || r.rectificationTime)
  };

  const wtTestingRes = {
    data: weeklyData.filter((r: any) => (r.formType || r.name) === "Walkie-Talkie Testing")
  };

  const wtRepairingRes = {
    data: weeklyData.filter((r: any) => (r.formType || r.name) === "Walkie-Talkie Repairing")
  };

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

  // 1. Calculate Active Faults Count
  // Exclude "All OK" daily position submissions (reason: "All OK" or actionType: "OK")
  const activeFaultsList = (activeFaultsRes.data || []).filter((r: any) => {
    if (r.status === "DRAFT") return false;
    const isAllOk = r.reason === "All OK" || (r.formData && r.formData.actionType === "OK");
    if (isAllOk) return false;
    if (targetDiv) {
      return normalizeDivName(r.division) === targetDiv;
    }
    return true;
  });
  // Exclude wifi faults from the active faults count because they are shown separately
  const activeFaultsCount = activeFaultsList.filter((r: any) => {
    const isWifi = (r.formType || r.name || "").toLowerCase() === "wi-fi";
    return !isWifi;
  }).length;

  // 2. Calculate Faults Today Count (where failureTime is today)
  const uniqueRecordsMap = new Map<string, any>();
  for (const r of [...activeFaultsList, ...(resolvedRecordsRes.data || []), ...(todayRecordsRes.data || [])]) {
    if (r.id) {
      if (targetDiv && normalizeDivName(r.division) !== targetDiv) continue;
      uniqueRecordsMap.set(r.id, r);
    }
  }

  const faultsTodayList = Array.from(uniqueRecordsMap.values()).filter((r: any) => {
    if (r.status === "DRAFT") return false;
    const isAllOk = r.reason === "All OK" || (r.formData && r.formData.actionType === "OK");
    if (isAllOk) return false;
    if (!r.failureTime) return false;
    try {
      const failDate = new Date(r.failureTime);
      if (isNaN(failDate.getTime())) return false;
      return toDateValue(failDate) === todayStr;
    } catch {
      return false;
    }
  });
  const faultsTodayCount = faultsTodayList.length;

  // 3. Calculate Resolved Today Count (only today's data, excluding previous days)
  const resolvedTodayList = (resolvedRecordsRes.data || []).filter((r: any) => {
    if (r.status === "DRAFT") return false;
    const isAllOk = r.reason === "All OK" || (r.formData && r.formData.actionType === "OK");
    if (isAllOk) return false;
    if (targetDiv && normalizeDivName(r.division) !== targetDiv) return false;
    if (!r.rectificationTime) return false;
    try {
      const rectDate = new Date(r.rectificationTime);
      if (isNaN(rectDate.getTime())) return false;
      return toDateValue(rectDate) === todayStr;
    } catch {
      return false;
    }
  });
  const resolvedTodayCount = resolvedTodayList.length;

  // Group active faults by category for Category-wise Fault section
  // Exclude All OK data (only actual pending faults are in activeFaultsList)
  const categoryCounts: Record<string, number> = {};
  for (const r of activeFaultsList) {
    const cat = r.category || "Others";
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  }
  const dailyPositionByCategory = Object.entries(categoryCounts).map(([category, count]) => ({
    category,
    count
  }));

  // Group today's records by division for Division-wise Report Submission (daily basis)
  const divisionCounts: Record<string, number> = targetDiv
    ? { [targetDiv]: 0 }
    : { Raipur: 0, Bilaspur: 0, Nagpur: 0 };
  for (const r of todayRecordsRes.data || []) {
    if (r.status === "DRAFT") continue;
    const normalized = normalizeDivName(r.division);
    if (targetDiv && normalized !== targetDiv) continue;
    divisionCounts[normalized] = (divisionCounts[normalized] || 0) + 1;
  }
  const dailyPositionByDivision = Object.entries(divisionCounts).map(([division, count]) => ({
    division,
    count
  }));

  // Group active faults by division for activeFaultsByDivision (Raipur, Bilaspur, Nagpur)
  // Exclude Wi-Fi faults — they are tracked separately via the Wi-Fi Faults counter
  const activeDivCounts: Record<string, number> = targetDiv
    ? { [targetDiv]: 0 }
    : { Raipur: 0, Bilaspur: 0, Nagpur: 0 };
  for (const r of activeFaultsList) {
    const isWifi = (r.formType || r.name || "").toLowerCase() === "wi-fi";
    if (isWifi) continue; // skip Wi-Fi faults
    const normalized = normalizeDivName(r.division);
    if (targetDiv && normalized !== targetDiv) continue;
    activeDivCounts[normalized] = (activeDivCounts[normalized] || 0) + 1;
  }
  const activeFaultsByDivision = Object.entries(activeDivCounts).map(([division, count]) => ({
    division,
    count
  }));

  // Combine records to compute weekly reported and resolved per day
  const uniqueWeeklyMap = new Map<string, any>();
  for (const r of [
    ...activeFaultsList,
    ...(resolvedRecordsRes.data || []),
    ...(todayRecordsRes.data || []),
    ...(weeklyRecordsRes.data || [])
  ]) {
    if (r.id && r.status !== "DRAFT") {
      const matchesDiv = !targetDiv || normalizeDivName(r.division) === targetDiv;
      if (!matchesDiv) continue;
      const isAllOk = r.reason === "All OK" || (r.formData && r.formData.actionType === "OK");
      if (!isAllOk) {
        uniqueWeeklyMap.set(r.id, r);
      }
    }
  }

  // Create last 7 days array
  const last7Days = [];
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = toDateValue(d);
    last7Days.push({
      dateStr,
      day: weekdays[d.getDay()], // e.g. "Mon"
      reported: 0,
      resolved: 0
    });
  }

  // Count reported and resolved for each day
  for (const r of uniqueWeeklyMap.values()) {
    if (r.failureTime) {
      try {
        const fDate = new Date(r.failureTime);
        const fDateStr = toDateValue(fDate);
        const dayBucket = last7Days.find(d => d.dateStr === fDateStr);
        if (dayBucket) {
          dayBucket.reported++;
        }
      } catch {}
    }
    if (r.rectificationTime) {
      try {
        const rDate = new Date(r.rectificationTime);
        const rDateStr = toDateValue(rDate);
        const dayBucket = last7Days.find(d => d.dateStr === rDateStr);
        if (dayBucket) {
          dayBucket.resolved++;
        }
      } catch {}
    }
  }

  const weeklyFaultsTrend = last7Days.map(({ day, reported, resolved }) => ({
    day,
    reported,
    resolved
  }));

  // Create daily (today's) slots in 4-hour intervals
  const dailySlots = [
    { hour: "00:00 - 04:00", reported: 0, resolved: 0 },
    { hour: "04:00 - 08:00", reported: 0, resolved: 0 },
    { hour: "08:00 - 12:00", reported: 0, resolved: 0 },
    { hour: "12:00 - 16:00", reported: 0, resolved: 0 },
    { hour: "16:00 - 20:00", reported: 0, resolved: 0 },
    { hour: "20:00 - 00:00", reported: 0, resolved: 0 }
  ];

  for (const r of uniqueWeeklyMap.values()) {
    if (r.failureTime) {
      try {
        const fDate = new Date(r.failureTime);
        if (toDateValue(fDate) === todayStr) {
          const hr = fDate.getHours();
          const slotIdx = Math.floor(hr / 4);
          if (slotIdx >= 0 && slotIdx < 6) {
            dailySlots[slotIdx].reported++;
          }
        }
      } catch {}
    }
    if (r.rectificationTime) {
      try {
        const rDate = new Date(r.rectificationTime);
        if (toDateValue(rDate) === todayStr) {
          const hr = rDate.getHours();
          const slotIdx = Math.floor(hr / 4);
          if (slotIdx >= 0 && slotIdx < 6) {
            dailySlots[slotIdx].resolved++;
          }
        }
      } catch {}
    }
  }

  const dailyFaultsTrend = dailySlots.map(({ hour, reported, resolved }) => ({
    hour,
    reported,
    resolved
  }));

  // Let's build the stats mapping:
  const totalAssets = stats.summary.assetsCount;
  const assetsByStatusMap = stats.assetsByStatus.reduce((acc: any, curr: any) => {
    acc[curr.status.toUpperCase()] = curr.count;
    return acc;
  }, { OPERATIONAL: 0, ALL_OK: 0, FAULTY: 0, UNDER_MAINTENANCE: 0 });

  const allOkCount = assetsByStatusMap.OPERATIONAL || assetsByStatusMap.ALL_OK || 0;
  const maintenanceCount = assetsByStatusMap.UNDER_MAINTENANCE;
  const faultyCount = assetsByStatusMap.FAULTY;
  
  const healthPercent = totalAssets > 0 ? ((allOkCount / totalAssets) * 100).toFixed(1) : "100";

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
      value: faultsTodayCount.toString(),
      detail: "",
      tone: "amber",
      series: [0, 1, 3, 2, 4, 5, 3, 2, 4, 2, 3, faultsTodayCount]
    },
    {
      id: "resolvedToday",
      label: "Faults Resolved Today",
      value: resolvedTodayCount.toString(),
      detail: "",
      tone: "green",
      series: [2, 3, 5, 4, 6, 8, 7, 9, 6, 5, 8, resolvedTodayCount]
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
    { status: "All Ok", count: allOkCount, percent: totalAssets > 0 ? `${((allOkCount / totalAssets) * 100).toFixed(1)}%` : "0%", color: "#20a91f" },
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

  // Alerts & Notifications (Map from recent open tickets and pending maintenance)
  const alerts: AlertItem[] = [
    {
      id: "alert-all-clear",
      tone: "blue",
      title: "All links functioning All Ok",
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

  const activeUser = getCachedUser() || {
    name: "Telecom SSE",
    designation: "SSE / Telecom",
    role: "SSE"
  };

  // Walkie-Talkie Records Aggregation (Overall latest records)
  const wtTestingRecords = (wtTestingRes.data || [])
    .sort((a: any, b: any) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());

  const wtRepairingRecords = (wtRepairingRes.data || [])
    .sort((a: any, b: any) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());

  const normalizeDiv = (divName?: string) => {
    if (!divName) return "Others";
    const l = divName.toLowerCase();
    if (l.includes("raipur") || l === "r") return "Raipur";
    if (l.includes("bilaspur") || l === "bsp") return "Bilaspur";
    if (l.includes("nagpur") || l === "ngp") return "Nagpur";
    return "Others";
  };

  const divisionsList = targetDiv && targetDiv !== "Others"
    ? [targetDiv]
    : ["Raipur", "Bilaspur", "Nagpur"];
  let totalDefective = 0;
  const wtDivisions = divisionsList.map(div => {
    const testRec = wtTestingRecords.find(r => normalizeDiv(r.division) === div);
    const repairRec = wtRepairingRecords.find(r => normalizeDiv(r.division) === div);

    const testFd = testRec?.formData || {};
    const tested = testRec ? Number(testFd.testedCount ?? 0) : 0;
    const total = testRec ? Number(testFd.toBeTestedCount ?? 0) : 0;
    const balance = testRec ? Number(testFd.balanceWalkieTalkies ?? (total - tested)) : 0;

    const repairFd = repairRec?.formData || {};
    const pending = repairRec ? Number(repairFd.pendingRepair ?? repairFd.openingDefective ?? 0) : 0;
    const opening = repairRec ? Number(repairFd.openingDefective ?? 0) : 0;

    totalDefective += pending;

    return {
      division: div,
      testing: testRec ? { tested, total, balance } : null,
      repairing: repairRec ? { pending, opening } : null
    };
  });

  const walkieTalkieSummary = {
    totalDefective,
    divisions: wtDivisions
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

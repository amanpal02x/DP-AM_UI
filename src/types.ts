export type UserRole =
  | "SUPER_ADMIN"
  | "DIVISIONAL_ADMIN"
  | "SSE"
  | "TECHNICIAN"
  | "TESTROOM"
  | "VIEWER";

export type AssetStatus = "Operational" | "Under Maintenance" | "Faulty" | "Offline";

export interface KpiMetric {
  id: string;
  label: string;
  value: string;
  detail: string;
  trend?: string;
  tone: "blue" | "green" | "amber" | "red" | "purple" | "teal";
  series: number[];
}

export interface CategoryMetric {
  name: string;
  value: number;
  percent: string;
  color: string;
}

export interface SeverityMetric {
  name: string;
  value: number;
  percent: string;
  color: string;
}

export interface StatusMetric {
  status: AssetStatus;
  count: number;
  percent: string;
  color: string;
}

export interface FaultTicket {
  id: string;
  severity: "Critical" | "Major" | "Minor" | "Info";
  title: string;
  location: string;
  assetRef: string;
  status: "In Progress" | "Assigned" | "Open";
  updatedAt: string;
}

export interface MaintenanceItem {
  id: string;
  date: string;
  title: string;
  location: string;
  assetRef: string;
  due: string;
}

export interface ActivityItem {
  id: string;
  type: "approved" | "ticket" | "maintenance" | "user" | "asset";
  title: string;
  detail: string;
  time: string;
}

export interface AlertItem {
  id: string;
  tone: "red" | "amber" | "blue";
  title: string;
  detail: string;
}

export interface BottomStat {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: KpiMetric["tone"];
}

export interface CommissioningSummary {
  abssStationsCount: number;
  divisionalStationsCount: number;
  abssOnly: number;
  divisionalOnly: number;
  bothSchemes: number;
  unspecified: number;
}

export interface DashboardSummary {
  division: string;
  dateRange: string;
  user: {
    name: string;
    designation: string;
    avatarUrl: string;
    role: UserRole;
  };
  kpis: KpiMetric[];
  categories: CategoryMetric[];
  severities: SeverityMetric[];
  statuses: StatusMetric[];
  tickets: FaultTicket[];
  maintenance: MaintenanceItem[];
  activity: ActivityItem[];
  alerts: AlertItem[];
  bottomStats: BottomStat[];
  commissioningSummary?: CommissioningSummary;
  dailyPositionStatus?: Array<{ status: string; count: number }>;
  dailyPositionByDivision?: Array<{ division: string; count: number }>;
  dailyPositionByCategory?: Array<{ category: string; count: number }>;
}

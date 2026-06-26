import { useState, useEffect, Fragment, useRef, useMemo, lazy, Suspense } from "react";
import type { ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { create } from "zustand";
import {
  AlertTriangle,
  BarChart3,
  Box,
  Calendar,
  ChevronDown,
  CircleUserRound,
  ClipboardList,
  FileClock,
  FileText,
  Gauge,
  Home,
  MapPin,
  Plus,
  RadioTower,
  Settings,
  ShieldCheck,
  Siren,
  Train,
  Upload,
  Users,
  Wrench,
  Wifi,
  X,
  LogOut,
  Layers,
  Building2,
  Map as MapIcon,
  Menu,
  SlidersHorizontal,
  Filter,
  Edit,
  Lock,
  MessageSquare,
  UploadCloud,
  Send,
  Eye,
  EyeOff,
  Printer
} from "lucide-react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

// Human-readable labels for checklist boolean fields
const CHECKLIST_LABELS: Record<string, string> = {
  hasIpis: "IPIS (Integrated Passenger Information System)",
  hasPaSystem: "P.A. System",
  hasCctv: "CCTV",
  hasUts: "UTS (Unreserved Ticketing System)",
  hasPrs: "PRS (Passenger Reservation System)",
  hasFois: "FOIS (Freight Operations Info System)",
  hasDigitalClock: "Digital Clock",
  hasWifi: "High Speed Wi-Fi",
  hasExchange: "Exchange / EPABX",
  hasTalkback: "Talkback System",
  hasPms: "PMS (Power Management System)",
  hasCms: "CMS (Control Management System)",
  hasAtvm: "ATVM (Automatic Ticket Vending Machine)",
  hasArt: "ART (Accident Relief Train)",
  hasVhf25W: "VHF 25W Set",
  hasControlTelephoneVoip: "Control Telephone (VoIP)",
  hasCgsCgdb: "CGS / CGDB",
  hasTib: "Train Indication Board (TIB)",
  hasAgdb: "AGDB / At-A-Glance Display Board",
  hasAutoAnnouncement: "Auto Announcement System",
  hasAnalogClock: "Analog Clock",
  hasGpsClock: "GPS Clock",
  hasCoachGuidanceDisplay: "Coach Guidance Display",
  hasTrainIndicationBoard: "Train Indication Board",
  hasDigitalDisplayHeritage: "Digital Display (Under Heritage Museum)",
  hasAtAGlanceBoard: "At A Glance Board",
  hasCctvDe: "CCTV D&E",
};

// Map Excel column header → DB boolean field key (case-insensitive partial match)
const EXCEL_COL_MAP: Array<{ match: string; field: string }> = [
  { match: "pa system", field: "hasPaSystem" },
  { match: "p.a. system", field: "hasPaSystem" },
  { match: "analog clock", field: "hasAnalogClock" },
  { match: "gpsclock", field: "hasGpsClock" },
  { match: "gps clock", field: "hasGpsClock" },
  { match: "coach guidance", field: "hasCoachGuidanceDisplay" },
  { match: "train indication board", field: "hasTrainIndicationBoard" },
  { match: "high speed wi-fi", field: "hasWifi" },
  { match: "high speed wifi", field: "hasWifi" },
  { match: "wi-fi", field: "hasWifi" },
  { match: "cctv d", field: "hasCctvDe" },
  { match: "cctv", field: "hasCctv" },
  { match: "digital display", field: "hasDigitalDisplayHeritage" },
  { match: "at a glance", field: "hasAtAGlanceBoard" },
  { match: "prs", field: "hasPrs" },
  { match: "uts", field: "hasUts" },
  { match: "atvm", field: "hasAtvm" },
  { match: "ipis", field: "hasIpis" },
];

const ASSET_MODE_STANDALONE = "STANDALONE";
const ASSET_MODE_HAS_EQUIPMENT = "HAS_EQUIPMENT";
const MAINTENANCE_NOT_AVAILABLE = "NOT_AVAILABLE";
const MAINTENANCE_OPTIONS = [
  { value: "AMC", label: "AMC" },
  { value: "RMC", label: "RMC" },
  { value: MAINTENANCE_NOT_AVAILABLE, label: "Not Available" }
];
const CONNECTED_WITH_OPTIONS = ["CGS", "TIB", "Auto Announcement", "AGDB"];

const TELECOM_ASSET_CHECKS = [
  { key: "hasIpis", label: "IPIS" },
  { key: "hasPaSystem", label: "PA System" },
  { key: "hasCctv", label: "CCTV" },
  { key: "hasUts", label: "UTS" },
  { key: "hasPrs", label: "PRS" },
  { key: "hasFois", label: "FOIS" },
  { key: "hasDigitalClock", label: "Digital Clock" },
  { key: "hasWifi", label: "Wi-Fi" },
  { key: "hasExchange", label: "Exchange" },
  { key: "hasTalkback", label: "Talkback" },
  { key: "hasPms", label: "PMS" },
  { key: "hasCms", label: "CMS" },
  { key: "hasAtvm", label: "ATVM" },
  { key: "hasArt", label: "ART" },
  { key: "hasVhf25W", label: "VHF (25W)" },
  { key: "hasControlTelephoneVoip", label: "VoIP Control Phone" },
  { key: "hasCgsCgdb", label: "CGS / CGDB" },
  { key: "hasTib", label: "TIB" },
  { key: "hasAgdb", label: "AGDB" },
  { key: "hasAutoAnnouncement", label: "Auto Announcement" },
  { key: "hasAnalogClock", label: "Analog Clock" },
  { key: "hasGpsClock", label: "GPS Clock" },
  { key: "hasCoachGuidanceDisplay", label: "Coach Guidance Display" },
  { key: "hasTrainIndicationBoard", label: "Train Indication Board" },
  { key: "hasDigitalDisplayHeritage", label: "Heritage Digital Display" },
  { key: "hasAtAGlanceBoard", label: "At A Glance Board" },
  { key: "hasCctvDe", label: "CCTV DE" }
];

const normalizeAssetText = (value: any) => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");

const normalizeStationLookupText = (value: any) => normalizeAssetText(value)
  .replace(/junction/g, "")
  .replace(/road/g, "")
  .replace(/station/g, "")
  .replace(/jn$/g, "");

const getTelecomAssetName = (asset: any) => asset?.telecomAsset || asset?.category || "Unspecified";

const isTelecomAssetMatch = (assetValue: string, expectedValue: string) => {
  const asset = normalizeAssetText(assetValue);
  const expected = normalizeAssetText(expectedValue);
  return asset === expected || asset.includes(expected) || expected.includes(asset) || (asset === "wifi" && expected === "wifi");
};

const requiredLabel = (label: string) => (
  <span className="field-label">
    {label}<span className="required-mark">*</span>
  </span>
);

const splitConnectedWith = (value: any) => String(value || "")
  .split(",")
  .map(item => item.trim())
  .filter(Boolean);

const MultiSelectDropdown = ({
  label,
  options,
  selected,
  onChange,
  placeholder = "Select options"
}: {
  label: ReactNode;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  return (
    <div
      ref={wrapperRef}
      className="form-field"
      onBlur={event => {
        if (!wrapperRef.current?.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      {label}
      <div className="multi-dropdown">
        <button
          type="button"
          className={`multi-dropdown-trigger ${open ? "open" : ""}`}
          onClick={() => setOpen(value => !value)}
          aria-haspopup="listbox"
          aria-expanded={open}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}
        >
          <span
            className={selected.length ? "multi-dropdown-value" : "multi-dropdown-placeholder"}
            style={{ marginRight: selected.length ? "24px" : "0px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}
          >
            {selected.length ? selected.join(", ") : placeholder}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }} onClick={e => e.stopPropagation()}>
            {selected.length > 0 && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange([]);
                }}
                style={{
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: "2px 6px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#ef4444";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#94a3b8";
                }}
              >
                ×
              </span>
            )}
            <ChevronDown size={16} style={{ color: "#64748b" }} />
          </div>
        </button>
        {open && (
          <div className="multi-dropdown-menu" role="listbox" aria-multiselectable="true">
            {options.map(option => {
              const isSelected = selected.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`multi-dropdown-option ${isSelected ? "selected" : ""}`}
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => onChange(isSelected
                    ? selected.filter(item => item !== option)
                    : [...selected, option]
                  )}
                >
                  <span>{option}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const ClearableSelect = ({
  value,
  onChange,
  children,
  required,
  style,
  disabled,
  ...props
}: {
  value: string;
  onChange: (val: string) => void;
  children: React.ReactNode;
  required?: boolean;
  style?: React.CSSProperties;
  disabled?: boolean;
  [key: string]: any;
}) => {
  return (
    <div className="clearable-select-wrapper" style={{ position: "relative", width: "100%", display: "inline-block" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        style={{
          ...style,
          width: "100%",
          paddingRight: value && !disabled ? "38px" : style?.paddingRight,
        }}
        {...props}
      >
        {children}
      </select>
      {value && !disabled && (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onChange("");
          }}
          style={{
            position: "absolute",
            right: "32px",
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: "18px",
            fontWeight: "bold",
            color: "#94a3b8",
            cursor: "pointer",
            padding: "2px 6px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2,
            userSelect: "none"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#ef4444";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#94a3b8";
          }}
        >
          ×
        </span>
      )}
    </div>
  );
};

// Auto-infer state abbreviation from division code
const inferStateFromDivision = (div: string): string => {
  const d = String(div).trim().toUpperCase();
  if (["R", "RAIPUR", "BSP", "BILASPUR"].includes(d)) return "CG";
  if (["G", "NGP", "NAGPUR"].includes(d)) return "MH";
  if (["SBP", "SAMBALPUR"].includes(d)) return "OR";
  if (["KNW", "KATNI", "JBP", "JABALPUR"].includes(d)) return "MP";
  return "";
};

const normalizeDivision = (div: any): string => {
  if (!div) return "";
  const d = String(div).trim().toUpperCase();
  if (d === "R" || d === "RAIPUR") return "Raipur";
  if (d === "BSP" || d === "BILASPUR") return "Bilaspur";
  if (d === "NGP" || d === "NAGPUR") return "Nagpur";
  return String(div);
};

import { api, getAuthToken, setAuthToken, getCachedUser, setCachedUser } from "./api/apiClient";
import { getDashboardSummary } from "./api/dashboardApi";
import { formatDate24, formatDateTime24, formatTime24, shiftDateText } from "./utils/dateTime";
import { DAILY_POSITION_CATEGORIES, DAILY_POSITION_FORMS } from "./components/DailyPosition/dailyPositionForms";
const DailyPositionView = lazy(() => import("./components/DailyPosition/DailyPositionView"));
const DailyPositionPrintView = lazy(() => import("./components/DailyPosition/DailyPositionPrintView"));
import type {
  ActivityItem,
  AlertItem,
  BottomStat,
  CategoryMetric,
  FaultTicket,
  KpiMetric,
  MaintenanceItem,
  SeverityMetric,
  UserRole,
  DashboardSummary
} from "./types";

type NavKey =
  | "Asset Dashboard"
  | "Daily Position"
  | "DP Summary"
  | "Master List"
  | "Assets"
  | "LC Gate"
  | "Feedback"
  | "GIS Mapping"
  | "DP Form"
  | "DP Logs"
  | "Sections"
  | "Reports & Analytics"
  | "Users & Roles"
  | "Audit Logs";

const navToHash: Record<NavKey, string> = {
  "Asset Dashboard": "#/dashboard/asset-management",
  "Daily Position": "#/dashboard/daily-position",
  "DP Summary": "#/dashboard/daily-position-summary",
  "Master List": "#/stations",
  "Assets": "#/assets",
  "LC Gate": "#/gates",
  "Feedback": "#/feedback",
  "GIS Mapping": "#/gis",
  "DP Form": "#/daily-position",
  "DP Logs": "#/daily-position-history",
  "Sections": "#/sections",
  "Reports & Analytics": "#/reports",
  "Users & Roles": "#/users",
  "Audit Logs": "#/audit-logs"
};

const hashToNav: Record<string, NavKey> = {
  "#/dashboard/asset-management": "Asset Dashboard",
  "#/dashboard/daily-position": "Daily Position",
  "#/dashboard/daily-position-summary": "DP Summary",
  "#/stations": "Master List",
  "#/assets": "Assets",
  "#/gates": "LC Gate",
  "#/feedback": "Feedback",
  "#/gis": "GIS Mapping",
  "#/daily-position": "DP Form",
  "#/daily-position-history": "DP Logs",
  "#/sections": "Sections",
  "#/reports": "Reports & Analytics",
  "#/users": "Users & Roles",
  "#/audit-logs": "Audit Logs"
};

type AppState = {
  activeNav: NavKey;
  role: UserRole;
  division: string;
  sidebarOpen: boolean;
  token: string | null;
  user: any | null;
  assetStatusFilter: string;
  dpHistoryFilter: "date" | "active-faults" | "resolved-faults";
  dpHistoryCategoryFilter: string;
  dpHistoryFormTypeFilter: string;
  setActiveNav: (activeNav: NavKey) => void;
  setDivision: (division: string) => void;
  setToken: (token: string | null) => void;
  setUser: (user: any | null) => void;
  setSidebarOpen: (sidebarOpen: boolean) => void;
  setAssetStatusFilter: (status: string) => void;
  setDpHistoryFilter: (filter: "date" | "active-faults" | "resolved-faults") => void;
  setDpHistoryCategoryFilter: (category: string) => void;
  setDpHistoryFormTypeFilter: (formType: string) => void;
  logout: () => void;
  dpSelectedCategory: string;
  dpSelectedFormName: string;
  dpOpenCategory: string;
  dpCircuitSearch: string;
  setDpSelectedCategory: (category: string) => void;
  setDpSelectedFormName: (formName: string) => void;
  setDpOpenCategory: (category: string) => void;
  setDpCircuitSearch: (search: string) => void;
};

export const useAppStore = create<AppState>((set) => ({
  activeNav: getCachedUser() && getCachedUser().accessDailyPosition === false && getCachedUser().accessAssets === true
    ? "Asset Dashboard"
    : "Daily Position",
  role: getCachedUser() ? getCachedUser().role : "VIEWER",
  division: getCachedUser() && (getCachedUser().role === "SUPER_ADMIN" || getCachedUser().role === "ALL_DIVISION_VIEWER") ? "" : (getCachedUser()?.division || "Raipur"),
  sidebarOpen: false,
  token: getAuthToken(),
  user: getCachedUser(),
  assetStatusFilter: "",
  dpHistoryFilter: "date",
  dpHistoryCategoryFilter: "",
  dpHistoryFormTypeFilter: "",
  setActiveNav: (activeNav) => set({ activeNav, sidebarOpen: false, assetStatusFilter: "", dpHistoryFilter: "date", dpHistoryCategoryFilter: "", dpHistoryFormTypeFilter: "" }),
  setDivision: (division) => set({ division }),
  setToken: (token) => {
    setAuthToken(token);
    set({ token });
  },
  setUser: (user) => {
    setCachedUser(user);
    set({ user, role: user ? user.role : "VIEWER" });
  },
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setAssetStatusFilter: (status) => set({ assetStatusFilter: status }),
  setDpHistoryFilter: (dpHistoryFilter) => set({ dpHistoryFilter }),
  setDpHistoryCategoryFilter: (dpHistoryCategoryFilter) => set({ dpHistoryCategoryFilter }),
  setDpHistoryFormTypeFilter: (dpHistoryFormTypeFilter) => set({ dpHistoryFormTypeFilter }),
  logout: () => {
    setAuthToken(null);
    setCachedUser(null);
    set({ token: null, user: null, role: "VIEWER", activeNav: "Daily Position", division: "Raipur", assetStatusFilter: "", dpHistoryFilter: "date", dpHistoryCategoryFilter: "", dpHistoryFormTypeFilter: "" });
  },
  dpSelectedCategory: "Communication & Voice Circuits",
  dpSelectedFormName: "Control & ICMS Position",
  dpOpenCategory: "Communication & Voice Circuits",
  dpCircuitSearch: "",
  setDpSelectedCategory: (dpSelectedCategory) => set({ dpSelectedCategory }),
  setDpSelectedFormName: (dpSelectedFormName) => set({ dpSelectedFormName }),
  setDpOpenCategory: (dpOpenCategory) => set({ dpOpenCategory }),
  setDpCircuitSearch: (dpCircuitSearch) => set({ dpCircuitSearch }),
}));

const toneIcons = {
  blue: Box,
  green: Gauge,
  amber: Wrench,
  red: Siren,
  purple: Wifi,
  teal: ShieldCheck
};

const activityIcons = {
  approved: ShieldCheck,
  ticket: ClipboardList,
  maintenance: Wrench,
  user: CircleUserRound,
  asset: FileText
};

const navItems: Array<{
  label: NavKey;
  icon: typeof Home;
  roles: UserRole[];
  badge?: string;
  expandable?: boolean;
}> = [
    { label: "Asset Dashboard", icon: Home, roles: ["SUPER_ADMIN", "DIVISIONAL_ADMIN", "SSE", "TECHNICIAN", "TESTROOM", "VIEWER", "DIVISIONAL_VIEWER", "ALL_DIVISION_VIEWER"] },
    { label: "Daily Position", icon: BarChart3, roles: ["SUPER_ADMIN", "DIVISIONAL_ADMIN", "SSE", "TECHNICIAN", "TESTROOM", "VIEWER", "DIVISIONAL_VIEWER", "ALL_DIVISION_VIEWER"] },
    { label: "DP Form", icon: ClipboardList, roles: ["TESTROOM"] },
    { label: "DP Summary", icon: FileText, roles: ["SUPER_ADMIN", "DIVISIONAL_ADMIN", "SSE", "TECHNICIAN", "TESTROOM", "VIEWER", "DIVISIONAL_VIEWER", "ALL_DIVISION_VIEWER"] },
    { label: "DP Logs", icon: FileClock, roles: ["SUPER_ADMIN", "DIVISIONAL_ADMIN", "SSE", "TESTROOM"] },
    { label: "Master List", icon: Train, roles: ["SUPER_ADMIN", "DIVISIONAL_ADMIN", "SSE", "VIEWER", "TESTROOM"] },
    { label: "Assets", icon: Box, roles: ["SUPER_ADMIN", "DIVISIONAL_ADMIN", "SSE", "TECHNICIAN", "VIEWER", "TESTROOM"] },
    { label: "LC Gate", icon: RadioTower, roles: ["SUPER_ADMIN", "DIVISIONAL_ADMIN", "SSE", "TECHNICIAN", "VIEWER", "TESTROOM"] },
    { label: "Sections", icon: Layers, roles: ["SUPER_ADMIN"] },
    { label: "Reports & Analytics", icon: BarChart3, roles: ["SUPER_ADMIN", "DIVISIONAL_ADMIN", "SSE"] },
    { label: "Users & Roles", icon: Users, roles: ["SUPER_ADMIN", "DIVISIONAL_ADMIN", "SSE"] },
    { label: "Audit Logs", icon: FileClock, roles: ["SUPER_ADMIN", "DIVISIONAL_ADMIN", "SSE"] },
    { label: "Feedback", icon: MessageSquare, roles: ["TESTROOM", "SUPER_ADMIN"] }
  ];

// Fallback points for Leaflet map if DB is empty
const defaultStationPoints = [
  { name: "Raipur Jn.", type: "station", position: [21.2514, 81.6296] as [number, number] },
  { name: "Bhatapara", type: "station", position: [21.7359, 81.9477] as [number, number] },
  { name: "Durg", type: "station", position: [21.1904, 81.2849] as [number, number] }
];

const fallbackRouteLines = [
  [21.1904, 81.2849],
  [21.2514, 81.6296],
  [21.7359, 81.9477]
] as [number, number][];

const parseCSV = (text: string) => {
  const lines = text.split(/\r?\n/);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    let cols = [];
    let current = '';
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cols.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    cols.push(current.trim());

    const obj: any = {};
    headers.forEach((h, index) => {
      let val = cols[index] || '';
      val = val.replace(/^["']|["']$/g, '');
      obj[h] = val;
    });
    rows.push(obj);
  }
  return { headers, rows };
};

function ImportDrawerForm({ page, showToast, close }: { page: string; showToast: (msg: string) => void; close: () => void }) {
  const queryClient = useQueryClient();
  const [fileData, setFileData] = useState<{ headers: string[]; rows: any[]; isMasterExcel?: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [rawFile, setRawFile] = useState<File | null>(null);

  const getExpectedHeaders = (p: string) => {
    switch (p) {
      case "Master List":
        return "Excel: Station, Code, Division, State, Category, P.A. System, Analog Clock, GPSClock, Coach guidance display, Train indication board, High Speed Wi-Fi, CCTV, Digital Display (Heritage), At A Glance Board, PRS, UTS, ATVM, CCTV D&E  |  CSV: name, code, division, state, category";
      case "Assets": return "stationCode, telecomAsset, assetMode, equipmentName, rdsoSpec, make, model, dateOfInstallation, workName, connectedWith, forwardInspection, backwardInspection, displayBoard, maintenanceValidity, maintenanceFrom, maintenanceTo, installLocation, status";
      case "LC Gate": return "gateNumber, name, category, section, km, tvuAvailability, locationName, stationCode";
      case "Users & Roles": return "username, password, name, role, designation, division";
      default: return "";
    }
  };

  // SheetJS is loaded only when an Excel import is actually used.
  const parseExcel = async (file: File): Promise<{ headers: string[]; rows: any[]; isMasterExcel: boolean }> => {
    const XLSX = await import("xlsx");
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
          if (jsonRows.length === 0) { resolve({ headers: [], rows: [], isMasterExcel: false }); return; }
          const headers = Object.keys(jsonRows[0]);
          // Detect if this is a Master List Excel by looking for checklist columns
          const lowerHeaders = headers.map(h => String(h).toLowerCase());
          const isMasterExcel = lowerHeaders.some(h => h.includes("pa system") || h.includes("p.a.") || h.includes("cctv") || h.includes("analog"));
          resolve({ headers, rows: jsonRows, isMasterExcel });
        } catch (err) { reject(err); }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRawFile(file);
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "xlsx" || ext === "xls") {
      const parsed = await parseExcel(file);
      setFileData(parsed);
    } else {
      // CSV fallback
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const parsed = parseCSV(text);
        setFileData({ ...parsed, isMasterExcel: false });
      };
      reader.readAsText(file);
    }
  };

  // Map a raw Excel row → station DB payload
  const mapMasterExcelRow = (rawRow: any): any => {
    const row: any = {};
    const entries = Object.entries(rawRow);
    for (const [col, val] of entries) {
      const colLower = String(col).toLowerCase().trim();
      if (colLower === "s.n." || colLower === "s.no" || colLower === "sn" || colLower === "#") continue;
      if (colLower === "station") { row.name = String(val).trim(); continue; }
      if (colLower === "code") { row.code = String(val).trim().toUpperCase(); continue; }
      if (colLower === "division") { row.division = String(val).trim(); continue; }
      if (colLower === "state") { row.state = String(val).trim(); continue; }
      if (colLower === "category") { row.category = String(val).trim(); continue; }
      // Checklist boolean columns — match by EXCEL_COL_MAP
      for (const mapping of EXCEL_COL_MAP) {
        if (colLower.includes(mapping.match)) {
          const v = String(val).trim().toUpperCase();
          row[mapping.field] = (v === "Y" || v === "YES" || v === "TRUE" || v === "1");
          break;
        }
      }
    }
    // Auto-infer state from division if missing
    if (!row.state && row.division) {
      row.state = inferStateFromDivision(row.division);
    }
    return row;
  };

  const handleImport = async () => {
    if (!fileData || fileData.rows.length === 0) return;
    setLoading(true);
    setSkipped(0);
    let successCount = 0;
    let skipCount = 0;
    let firstSkipReason = "";
    const total = fileData.rows.length;
    const stationList = page === "Assets"
      ? (queryClient.getQueryData<any>(["stations-list"])?.data || (await api.stations.list()).data || [])
      : [];
    const resolveStationCode = (value: any) => {
      const stationValue = String(value || "").trim();
      if (!stationValue) return null;
      const parenthesizedCode = stationValue.match(/\(([A-Za-z0-9]{2,8})\)/)?.[1];
      const lastToken = stationValue.match(/\b([A-Z]{2,8})\b\s*$/)?.[1];
      const codeCandidates = [stationValue, parenthesizedCode, lastToken].filter(Boolean).map(candidate => normalizeAssetText(candidate));
      const normalizedStation = normalizeAssetText(stationValue);
      const looseStation = normalizeStationLookupText(stationValue);
      const match = stationList.find((station: any) => {
        const code = normalizeAssetText(station.code);
        const name = normalizeAssetText(station.name);
        const looseName = normalizeStationLookupText(station.name);
        return codeCandidates.includes(code)
          || name === normalizedStation
          || looseName === looseStation
          || (looseStation.length >= 4 && looseName.includes(looseStation))
          || (looseName.length >= 4 && looseStation.includes(looseName));
      });
      return match?.code || (parenthesizedCode || lastToken || stationValue).toUpperCase();
    };
    const getCell = (row: any, ...keys: string[]) => {
      const normalizedKeys = keys.map(key => normalizeAssetText(key));
      for (const [rawKey, value] of Object.entries(row)) {
        if (normalizedKeys.includes(normalizeAssetText(rawKey))) {
          return value;
        }
      }
      return undefined;
    };

    try {
      if (page === "Master List") {
        if (!rawFile) {
          showToast("File reference missing. Please select the file again.");
          setLoading(false);
          return;
        }

        const formData = new FormData();
        formData.append("file", rawFile);

        setProgress(5);
        const res = await api.stations.importUpload(formData);
        const jobId = res.data?.jobId;

        if (!jobId) {
          throw new Error("Failed to start import job on backend");
        }

        const intervalId = setInterval(async () => {
          try {
            const statusRes = await api.stations.getImportStatus(jobId);
            const jobData = statusRes.data;

            if (jobData) {
              setProgress(jobData.progress);

              if (jobData.status === "COMPLETED") {
                clearInterval(intervalId);
                setLoading(false);
                setSkipped(jobData.resultSummary?.skipCount || 0);
                const succ = jobData.resultSummary?.successCount || 0;
                const skp = jobData.resultSummary?.skipCount || 0;

                const msg = skp > 0
                  ? `Imported ${succ} records. ${skp} skipped (duplicates or invalid).`
                  : `Successfully imported ${succ} records.`;
                showToast(msg);

                queryClient.invalidateQueries({ queryKey: ["stations-list"] });
                close();
              } else if (jobData.status === "FAILED") {
                clearInterval(intervalId);
                setLoading(false);
                showToast(jobData.errorMsg || "Import job failed on server.");
              }
            }
          } catch (pollErr: any) {
            console.error("Error polling job status:", pollErr);
          }
        }, 1500);

        return;
      } else {
        for (let i = 0; i < total; i++) {
          const rawRow = fileData.rows[i];
          try {
            if (page === "Assets") {
              const valueOrDash = (...values: any[]) => {
                const found = values.find(value => value !== undefined && value !== null && String(value).trim() !== "");
                return found !== undefined ? found : "-";
              };
              const valueOrNull = (...values: any[]) => {
                const found = values.find(value => value !== undefined && value !== null && String(value).trim() !== "");
                return found !== undefined ? found : null;
              };
              const importedTelecomAsset = valueOrDash(getCell(rawRow, "telecomAsset", "Telecom Asset", "asset", "Asset", "category", "Category"));
              const importedEquipmentName = valueOrNull(getCell(rawRow, "equipmentName", "Equipment Name", "equipment", "Equipment"));
              const importedAssetMode = valueOrNull(getCell(rawRow, "assetMode", "Asset Mode", "mode", "Mode")) || (importedEquipmentName ? ASSET_MODE_HAS_EQUIPMENT : ASSET_MODE_STANDALONE);
              const importedMaintenanceValidity = String(valueOrNull(getCell(rawRow, "maintenanceValidity", "Maintenance Validity")) || MAINTENANCE_NOT_AVAILABLE).trim().toUpperCase();
              const importedMaintenanceFrom = valueOrNull(getCell(rawRow, "maintenanceFrom", "Maintenance From"));
              const importedMaintenanceTo = valueOrNull(getCell(rawRow, "maintenanceTo", "Maintenance To"));
              const hasMaintenanceDates = importedMaintenanceFrom && importedMaintenanceTo;
              const safeMaintenanceValidity = (importedMaintenanceValidity === "AMC" || importedMaintenanceValidity === "RMC") && !hasMaintenanceDates
                ? MAINTENANCE_NOT_AVAILABLE
                : importedMaintenanceValidity;
              const displayBoardValue = valueOrNull(getCell(rawRow, "displayBoard", "Display Board", "dbCount", "No. of DB", "No of DB"));
              const importedStationCode = resolveStationCode(valueOrNull(getCell(rawRow, "stationCode", "Station Code", "station", "Station", "code", "Code")));
              const importedStatus = String(valueOrNull(getCell(rawRow, "status", "Status")) || "OPERATIONAL").trim().toUpperCase().replace(/\s+/g, "_");

              await api.assets.create({
                telecomAsset: importedTelecomAsset,
                category: importedTelecomAsset,
                assetMode: importedAssetMode,
                equipmentName: importedAssetMode === ASSET_MODE_HAS_EQUIPMENT ? valueOrDash(importedEquipmentName) : null,
                stationCode: importedStationCode,
                make: valueOrDash(getCell(rawRow, "make", "Make")),
                model: valueOrDash(getCell(rawRow, "model", "Model")),
                serialNumber: valueOrNull(getCell(rawRow, "serialNumber", "Serial Number", "serialNo", "Serial No")),
                rdsoSpec: valueOrDash(getCell(rawRow, "rdsoSpec", "rdsoSpec/version", "RDSO Spec / Version", "RDSO Spec", "RDSO")),
                dop: valueOrDash(getCell(rawRow, "dateOfInstallation", "Date of Installation", "dop", "DOP")),
                workName: valueOrDash(getCell(rawRow, "workName", "Work Name")),
                connectedWith: valueOrDash(getCell(rawRow, "connectedWith", "Connected With")),
                forwardInspection: valueOrDash(getCell(rawRow, "forwardInspection", "Forward Inspection")),
                backwardInspection: valueOrDash(getCell(rawRow, "backwardInspection", "Backward Inspection")),
                displayBoard: normalizeAssetText(importedTelecomAsset) === "ipis" ? displayBoardValue : (displayBoardValue || "-"),
                maintenanceValidity: safeMaintenanceValidity,
                maintenanceFrom: safeMaintenanceValidity !== MAINTENANCE_NOT_AVAILABLE ? importedMaintenanceFrom : null,
                maintenanceTo: safeMaintenanceValidity !== MAINTENANCE_NOT_AVAILABLE ? importedMaintenanceTo : null,
                status: importedStatus,
                installLocation: valueOrDash(getCell(rawRow, "installLocation", "Install Location", "location", "Location")),
                specifications: {}
              });
              successCount++;
            } else if (page === "LC Gate") {
              await api.gates.create({
                gateNumber: rawRow.gateNumber,
                name: rawRow.name || null,
                category: rawRow.category,
                section: rawRow.section || null,
                km: rawRow.km ? parseFloat(rawRow.km) : null,
                tvuAvailability: rawRow.tvuAvailability ? (rawRow.tvuAvailability === "true" || rawRow.tvuAvailability === "1" || rawRow.tvuAvailability === "Yes") : null,
                locationName: rawRow.locationName || null,
                stationCode: rawRow.stationCode
              });
              successCount++;
            } else if (page === "Users & Roles") {
              const isSuper = rawRow.role === "SUPER_ADMIN";
              const isDivAdmin = rawRow.role === "DIVISIONAL_ADMIN";
              await api.auth.register({
                username: rawRow.username,
                password: rawRow.password,
                name: rawRow.name,
                role: rawRow.role,
                designation: (isSuper || isDivAdmin) ? null : (rawRow.designation || null),
                division: isSuper ? null : (rawRow.division || null)
              });
              successCount++;
            }
          } catch (err: any) {
            if (!firstSkipReason) {
              firstSkipReason = `Row ${i + 1}: ${err?.message || "Invalid row"}`;
            }
            if (err?.message?.includes("already exists") || err?.status === 400) {
              skipCount++;
            } else {
              console.error(`Error importing row ${i + 1}:`, err);
            }
          }
          setProgress(Math.round(((i + 1) / total) * 100));
        }
      }
    } catch (err: any) {
      console.error("Batch import failed:", err);
      showToast(err.message || "Failed to import records.");
    }

    setSkipped(skipCount);
    setLoading(false);
    const msg = skipCount > 0
      ? `Imported ${successCount} records. ${skipCount} skipped. ${firstSkipReason}`
      : `Successfully imported ${successCount} of ${total} records.`;
    showToast(msg);

    if (page === "Master List") queryClient.invalidateQueries({ queryKey: ["stations-list"] });
    if (page === "Assets") queryClient.invalidateQueries({ queryKey: ["assets-list"] });
    if (page === "LC Gate") queryClient.invalidateQueries({ queryKey: ["gates-list"] });
    if (page === "Users & Roles") queryClient.invalidateQueries({ queryKey: ["users-list"] });
    close();
  };

  // Preview: render boolean values as ✓/—
  const renderCellValue = (val: any) => {
    if (typeof val === "boolean") return val ? "✓" : "—";
    const s = String(val ?? "").trim().toUpperCase();
    if (s === "Y" || s === "YES") return "✓";
    if (s === "" || s === "N" || s === "NO") return "—";
    return val;
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div>
        <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", textAlign: "left" }}>
          Upload a <strong>.xlsx</strong> / <strong>.xls</strong> Excel file or <strong>.csv</strong> file.
          {page === "Master List" && <span style={{ color: "var(--blue)", fontWeight: 700 }}> Excel format auto-maps checklist columns (Y = installed).</span>}
        </p>
        <code style={{ display: "block", background: "#f1f5f9", padding: 10, borderRadius: 6, marginTop: 8, fontSize: 11, wordBreak: "break-all", textAlign: "left", lineHeight: 1.6 }}>
          {getExpectedHeaders(page)}
        </code>
      </div>

      <div style={{ border: "2px dashed #cbd5e1", borderRadius: 8, padding: 20, textAlign: "center", background: "#f8fafc" }}>
        <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} disabled={loading} style={{ display: "block", margin: "0 auto", fontSize: 13 }} />
        <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--muted)" }}>Supported: .xlsx, .xls, .csv</p>
      </div>

      {fileData && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <strong style={{ fontSize: 13 }}>{fileData.rows.length} rows detected</strong>
            {fileData.isMasterExcel && (
              <span style={{ fontSize: 11, background: "var(--blue-soft)", color: "var(--blue)", padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>
                Excel Master List Format Detected
              </span>
            )}
          </div>
          <div style={{ maxHeight: 200, overflowY: "auto", overflowX: "auto", border: "1px solid var(--line)", borderRadius: 6 }}>
            <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse", textAlign: "left" }}>
              <thead style={{ background: "#f1f5f9", position: "sticky", top: 0 }}>
                <tr>
                  {fileData.headers.map((h, i) => <th key={i} style={{ padding: "6px 10px", borderBottom: "1px solid #cbd5e1", whiteSpace: "nowrap" }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {fileData.rows.slice(0, 6).map((row, i) => (
                  <tr key={i}>
                    {fileData.headers.map((h, idx) => (
                      <td key={idx} style={{ padding: "6px 10px", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>
                        {renderCellValue(row[h])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {fileData.rows.length > 6 && (
              <p style={{ margin: "6px 10px", fontSize: 11, color: "var(--muted)", fontStyle: "italic" }}>Showing first 6 of {fileData.rows.length} rows...</p>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
            <span>Importing records...</span>
            <strong>{progress}%</strong>
          </div>
          <div style={{ height: 8, background: "#e2e8f0", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${progress}%`, height: "100%", background: "var(--blue)", transition: "width 0.2s" }}></div>
          </div>
        </div>
      )}

      {!loading && skipped > 0 && (
        <p style={{ margin: 0, fontSize: 12, color: "var(--amber)", fontWeight: 600 }}>
          ⚠ {skipped} duplicate station code(s) were skipped.
        </p>
      )}

      <button
        className="export-button"
        disabled={loading || !fileData || fileData.rows.length === 0}
        onClick={handleImport}
        style={{ width: "100%", opacity: (!fileData || loading) ? 0.6 : 1 }}
      >
        {loading ? `Importing... ${progress}%` : `Start Import`}
      </button>
    </div>
  );
}

function App() {
  const { token, setToken, setUser, setDivision, logout, role, division, activeNav, sidebarOpen, setSidebarOpen, user } = useAppStore();
  const [panel, setPanel] = useState<string | null>(null);
  const [panelItemId, setPanelItemId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [viewCategoryFaults, setViewCategoryFaults] = useState<string | null>(null);

  // Reset category faults page view when activeNav changes
  useEffect(() => {
    setViewCategoryFaults(null);
  }, [activeNav]);

  // Synchronize hash routing with store activeNav
  useEffect(() => {
    const handleHashChange = () => {
      const currentHash = window.location.hash;
      const navKey = hashToNav[currentHash];
      if (navKey && useAppStore.getState().activeNav !== navKey) {
        useAppStore.getState().setActiveNav(navKey);
      }
    };

    window.addEventListener("hashchange", handleHashChange);

    // Initial load sync
    const initialHash = window.location.hash;
    const initialNav = hashToNav[initialHash];
    if (initialNav) {
      useAppStore.getState().setActiveNav(initialNav);
    } else {
      window.location.hash = navToHash[useAppStore.getState().activeNav];
    }

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  // Sync state changes back to hash
  useEffect(() => {
    const expectedHash = navToHash[activeNav];
    if (expectedHash && window.location.hash !== expectedHash) {
      window.location.hash = expectedHash;
    }
  }, [activeNav]);

  // Fetch active user profile
  const profileQuery = useQuery({
    queryKey: ["auth-profile", token],
    queryFn: async () => {
      if (!token) return null;
      try {
        const res = await api.auth.getProfile();
        return res.data;
      } catch (err: any) {
        // Only logout if it is a 401 Unauthorized authentication error
        if (err.status === 401 || (err.message && err.message.includes("401"))) {
          logout();
        }
        throw err;
      }
    },
    enabled: !!token,
    retry: false
  });

  // Synchronize profile data with store
  useEffect(() => {
    if (profileQuery.data) {
      setUser(profileQuery.data);
      if (profileQuery.data.role === "SUPER_ADMIN" || profileQuery.data.role === "ALL_DIVISION_VIEWER") {
        setDivision("");
      } else {
        setDivision(profileQuery.data.division || "Raipur");
      }
    }
  }, [profileQuery.data, setUser, setDivision]);

  // Route redirection guard based on user access flags
  useEffect(() => {
    if (!token || !user) return;
    const hasAssetAccess = user.accessAssets !== false;
    const hasDailyPositionAccess = user.accessDailyPosition !== false;

    const assetRoutes: NavKey[] = ["Asset Dashboard", "Master List", "Assets", "LC Gate"];
    const dpRoutes: NavKey[] = ["Daily Position", "DP Form", "DP Summary", "DP Logs"];

    if (assetRoutes.includes(activeNav) && !hasAssetAccess) {
      if (hasDailyPositionAccess) {
        useAppStore.getState().setActiveNav("Daily Position");
      }
    } else if (dpRoutes.includes(activeNav) && !hasDailyPositionAccess) {
      if (hasAssetAccess) {
        useAppStore.getState().setActiveNav("Asset Dashboard");
      }
    }
  }, [activeNav, user, token]);

  const queryClient = useQueryClient();

  // All Queries for dynamic data - Lazy-loaded based on active tab to prevent pool exhaustion!
  const stationsQuery = useQuery({
    queryKey: ["stations-list"],
    queryFn: () => api.stations.list(),
    enabled: !!token && ["Master List", "Assets", "LC Gate"].includes(activeNav),
    staleTime: 5 * 60 * 1000,
    placeholderData: previousData => previousData,
  });

  const assetsQuery = useQuery({
    queryKey: ["assets-list"],
    queryFn: () => api.assets.list(),
    enabled: !!token && ["Assets", "Master List"].includes(activeNav),
    staleTime: 5 * 60 * 1000,
    placeholderData: previousData => previousData,
  });

  const gatesQuery = useQuery({
    queryKey: ["gates-list"],
    queryFn: () => api.gates.list(),
    enabled: !!token && activeNav === "LC Gate",
    staleTime: 5 * 60 * 1000,
    placeholderData: previousData => previousData,
  });

  const usersQuery = useQuery({
    queryKey: ["users-list"],
    queryFn: () => api.auth.getUsers(),
    enabled: !!token && activeNav === "Users & Roles"
  });

  const logsQuery = useQuery({
    queryKey: ["audit-logs-list"],
    queryFn: () => api.settings.auditLogs(),
    enabled: !!token && activeNav === "Audit Logs"
  });

  // Dashboard Aggregated Query
  const dashboardCacheKey = `telecom_dashboard_${user?.id || user?.username || "user"}_${division || "all"}`;
  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError } = useQuery({
    queryKey: ["dashboard-summary", division, token],
    queryFn: () => getDashboardSummary(division),
    enabled: !!token && ["Asset Dashboard", "Daily Position"].includes(activeNav),
    staleTime: 60_000,
    placeholderData: previousData => previousData,
    initialData: () => {
      try {
        const cached = JSON.parse(localStorage.getItem(dashboardCacheKey) || "null");
        return cached && Date.now() - cached.savedAt < 10 * 60_000 ? cached.data : undefined;
      } catch {
        return undefined;
      }
    },
    initialDataUpdatedAt: () => {
      try {
        return JSON.parse(localStorage.getItem(dashboardCacheKey) || "null")?.savedAt || 0;
      } catch {
        return 0;
      }
    },
  });

  useEffect(() => {
    if (!dashboardData) return;
    localStorage.setItem(dashboardCacheKey, JSON.stringify({ savedAt: Date.now(), data: dashboardData }));
  }, [dashboardCacheKey, dashboardData]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast("");
    }, 4000);
  };

  if (!token) {
    return (
      <>
        <AuthView showToast={showToast} />
        <Toast message={toast} />
      </>
    );
  }

  const isProfileLoading = !useAppStore.getState().user && profileQuery.isLoading;
  if (isProfileLoading) {
    return (
      <div className="app-loading-container">
        <div className="circular-time-loader">
          <div className="loader-outer-ring"></div>
          <div className="loader-inner-track"></div>
          <div className="loader-spinner-gradient"></div>
          <div className="loader-clock-hand-minute"></div>
          <div className="loader-clock-hand-hour"></div>
          <div className="loader-center-dot"></div>
        </div>
        <div className="loading-text">Loading Telecom Dashboard...</div>
      </div>
    );
  }

  const openPanel = (title: string, itemId: string | null = null) => {
    setPanel(title);
    setPanelItemId(itemId);
  };

  const queries = {
    stationsQuery,
    assetsQuery,
    gatesQuery,
    usersQuery,
    logsQuery
  };

  return (
    <div className="app-shell">
      <header className="mobile-appbar">
        <button className="icon-button" type="button" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}>
          <Menu size={22} />
        </button>
        <div>
          <strong>{activeNav}</strong>
          <span>SECR Telecom</span>
        </div>
      </header>
      {sidebarOpen && <button className="sidebar-scrim" type="button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <Sidebar onEditProfile={() => setEditProfileOpen(true)} />
      <main className="main">
        <Suspense fallback={<div className="module-loading-skeleton" aria-label="Loading module" />}>
          {viewCategoryFaults ? (
            <CategoryFaultsPageView
              categoryName={viewCategoryFaults}
              onBack={() => setViewCategoryFaults(null)}
              queries={queries}
              showToast={showToast}
            />
          ) : activeNav === "Asset Dashboard" ? (
            dashboardData ? (
              <AssetDashboardView data={dashboardData} openPanel={openPanel} queries={queries} />
            ) : dashboardError ? (
              <div className="dashboard-inline-state">
                <h3>Dashboard API unavailable.</h3>
                <p>Please check the backend connection.</p>
              </div>
            ) : (
              <div className="dashboard-loading-grid" aria-label={dashboardLoading ? "Loading dashboard" : "Preparing dashboard"}>
                {Array.from({ length: 8 }).map((_, index) => <span key={index} />)}
              </div>
            )
          ) : activeNav === "Daily Position" ? (
            dashboardData ? (
              <DailyPositionDashboardView data={dashboardData} openPanel={openPanel} queries={queries} showToast={showToast} onCategoryClick={setViewCategoryFaults} />
            ) : (
              <div className="dashboard-loading-grid" aria-label="Loading daily position dashboard">
                {Array.from({ length: 8 }).map((_, index) => <span key={index} />)}
              </div>
            )
          ) : activeNav === "DP Form" ? (
            <DailyPositionView role={role} division={division} user={user} mode="form" showToast={showToast} />
          ) : activeNav === "DP Summary" ? (
            <div className="dashboard-scroll-wrap" style={{ flex: 1, overflowY: "hidden", display: "flex", flexDirection: "column", gap: 10, paddingRight: 4, height: "100%" }}>
              <section className="operations-grid" style={{ gridTemplateColumns: "1fr", flex: 1, display: "flex", flexDirection: "column", minHeight: 0, marginTop: 0 }}>
                <DailyPositionSummaryTable user={user} queries={queries} showToast={showToast} />
              </section>
            </div>
          ) : activeNav === "DP Logs" ? (
            <DailyPositionView role={role} division={division} user={user} mode="history" showToast={showToast} />
          ) : activeNav === "Feedback" ? (
            role === "SUPER_ADMIN" ? (
              <FeedbackAdminView showToast={showToast} />
            ) : (
              <FeedbackFormView showToast={showToast} />
            )
          ) : activeNav === "Sections" ? (
            <SectionsManagementView showToast={showToast} />
          ) : (
            <ModuleView activeNav={activeNav} openPanel={openPanel} queries={queries} />
          )}
        </Suspense>
      </main>
      <Toast message={toast} />
      {panel === "Asset Details" ? (
        <AssetDetailsModal
          itemId={panelItemId!}
          close={() => {
            setPanel(null);
            setPanelItemId(null);
          }}
          queries={queries}
        />
      ) : panel === "User Details" ? (
        <UserDetailsModal
          itemId={panelItemId!}
          close={() => {
            setPanel(null);
            setPanelItemId(null);
          }}
          queries={queries}
        />
      ) : panel ? (
        <ActionPanel
          title={panel}
          itemId={panelItemId}
          close={() => {
            setPanel(null);
            setPanelItemId(null);
          }}
          queries={queries}
          showToast={showToast}
        />
      ) : null}
      {editProfileOpen && (
        <EditProfileModal
          close={() => setEditProfileOpen(false)}
          showToast={showToast}
        />
      )}
    </div>
  );
}

function EditProfileModal({
  close,
  showToast
}: {
  close: () => void;
  showToast: (msg: string) => void;
}) {
  const { user, setUser } = useAppStore();
  const [name, setName] = useState(user?.name || "");
  const [designation, setDesignation] = useState(user?.designation || "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const body: any = { name };
      if (user?.role !== "SUPER_ADMIN" && user?.role !== "DIVISIONAL_ADMIN") {
        body.designation = designation;
      }
      if (password) {
        body.password = password;
      }

      const res = await api.auth.updateProfile(body);
      setUser(res.data);
      showToast("Profile credentials updated successfully.");
      close();
    } catch (err: any) {
      showToast(err.message || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  const showDesignationField = user?.role !== "SUPER_ADMIN" && user?.role !== "DIVISIONAL_ADMIN";

  return (
    <div
      className="modern-backdrop"
      onClick={close}
    >
      <div
        className="modern-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modern-modal-header">
          <div className="modern-modal-header-text">
            <h3 className="modern-modal-title">
              Edit Profile
            </h3>
            <p className="modern-modal-subtitle">
              Manage your credentials and settings
            </p>
          </div>
          <button
            onClick={close}
            className="modern-modal-close-btn"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="modern-modal-body">
          <label className="modern-form-field">
            Full Name
            <input
              required
              className="modern-input"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </label>

          <label className="modern-form-field">
            Username (Read-Only)
            <input
              readOnly
              className="modern-input"
              value={user?.username || ""}
            />
          </label>

          {showDesignationField && (
            <label className="modern-form-field">
              Designation
              <input
                className="modern-input"
                value={designation}
                onChange={e => setDesignation(e.target.value)}
              />
            </label>
          )}

          <label className="modern-form-field">
            New Password
            <input
              type="password"
              placeholder="Leave blank to remain unchanged"
              className="modern-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </label>

          {/* Footer Actions */}
          <div className="modern-modal-footer">
            <button
              type="button"
              className="modern-btn modern-btn-secondary"
              onClick={close}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="modern-btn modern-btn-primary"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const toDateValue = (date = new Date()) => {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
};

function SidebarDailyPositionAccordion() {
  const {
    dpSelectedCategory,
    dpSelectedFormName,
    dpOpenCategory,
    dpCircuitSearch,
    setDpSelectedCategory,
    setDpSelectedFormName,
    setDpOpenCategory,
    setDpCircuitSearch,
    user,
    division
  } = useAppStore();

  const todayStr = toDateValue();
  const completedFormsKey = `dp_completed_${user?.username || "default"}_${todayStr}`;

  const [completedForms, setCompletedForms] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(completedFormsKey) || "[]");
    } catch {
      return [];
    }
  });

  // Fetch today's records so we can reconcile with localStorage
  const sidebarRecordsQuery = useQuery({
    queryKey: ["daily-position-records", division, todayStr, "date"],
    queryFn: () => api.dailyPosition.list({ division: division || "", date: todayStr, limit: 500 }),
    staleTime: 30_000,
  });

  // Reconcile: if server records were deleted, remove them from local state
  useEffect(() => {
    if (!sidebarRecordsQuery.isSuccess || sidebarRecordsQuery.isFetching) return;

    const serverCompletedForms = new Set(
      (sidebarRecordsQuery.data?.data || [])
        .filter((r: any) => r.status !== "DRAFT")
        .map((r: any) => r.formType as string)
    );

    const currentLocal: string[] = (() => {
      try {
        return JSON.parse(localStorage.getItem(completedFormsKey) || "[]");
      } catch {
        return [];
      }
    })();

    const reconciled = currentLocal.filter(name => serverCompletedForms.has(name));

    if (reconciled.length !== currentLocal.length) {
      setCompletedForms(reconciled);
      localStorage.setItem(completedFormsKey, JSON.stringify(reconciled));
    } else if (reconciled.length !== completedForms.length) {
      // Also sync state if it's out of date (e.g. after a new submission)
      setCompletedForms(reconciled);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sidebarRecordsQuery.isSuccess, sidebarRecordsQuery.isFetching, sidebarRecordsQuery.data?.data]);

  return (
    <div className="dp-circuit-accordion" style={{ paddingLeft: "8px", margin: "4px 0 12px 0", display: "grid", gap: "6px" }}>
      {DAILY_POSITION_CATEGORIES.map(category => {
        const isOpen = category === dpOpenCategory;
        const forms = DAILY_POSITION_FORMS.filter(form => form.category === category);
        const visibleForms = forms.filter(form =>
          `${form.name} ${form.badge} ${form.systemCode}`.toLowerCase().includes(dpCircuitSearch.toLowerCase())
        );

        return (
          <div key={category} className={`dp-circuit-group ${isOpen ? "open" : ""}`} style={{ border: "1px solid var(--line)", borderRadius: "6px", overflow: "hidden", background: "#ffffff" }}>
            <button
              className="dp-circuit-heading"
              type="button"
              style={{
                width: "100%",
                padding: "8px 10px",
                background: isOpen ? "var(--blue-soft)" : "transparent",
                color: isOpen ? "var(--blue)" : "var(--navy)",
                fontWeight: 700,
                fontSize: "12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                border: "none",
                cursor: "pointer",
                textAlign: "left"
              }}
              onClick={() => {
                if (isOpen) {
                  setDpOpenCategory("");
                  return;
                }
                setDpOpenCategory(category);
                setDpSelectedCategory(category);
                setDpSelectedFormName("");
                setDpCircuitSearch("");
              }}
            >
              <span style={{ fontSize: "11px" }}>{category}</span>
              <strong>{isOpen ? "v" : ">"}</strong>
            </button>
            {isOpen && (
              <div className="dp-circuit-list" style={{ padding: "6px", display: "grid", gap: "4px", background: "#f8fafc", borderTop: "1px solid var(--line)" }}>
                <input
                  value={dpCircuitSearch}
                  onChange={event => setDpCircuitSearch(event.target.value)}
                  placeholder="Search circuit..."
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    fontSize: "11px",
                    border: "1px solid var(--line)",
                    borderRadius: "4px",
                    marginBottom: "4px",
                    outline: "none"
                  }}
                />
                {visibleForms.map(form => {
                  const isActive = form.name === dpSelectedFormName || (!dpSelectedFormName && form.name === forms[0].name);
                  const isCompleted = completedForms.includes(form.name);
                  return (
                    <button
                      key={form.name}
                      type="button"
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        borderRadius: "4px",
                        border: "none",
                        background: isActive ? "#ffffff" : "transparent",
                        color: isActive ? "#114c8f" : "rgba(255, 255, 255, 0.85)",
                        fontSize: "11px",
                        fontWeight: isActive ? 700 : 500,
                        textAlign: "left",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                      onClick={() => {
                        setDpSelectedFormName(form.name);
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>{form.name}</span>
                        {isCompleted && (
                          <span style={{ color: isActive ? "#ffffff" : "var(--green)", fontWeight: 700, fontSize: "12px" }}>✓</span>
                        )}
                      </span>
                    </button>
                  );
                })}
                {visibleForms.length === 0 && <p style={{ fontSize: "11px", color: "var(--muted)", margin: "4px 0", textAlign: "center" }}>No circuit found.</p>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Sidebar({ onEditProfile }: { onEditProfile: () => void }) {
  const { activeNav, role, sidebarOpen, setActiveNav, logout, user, division, token } = useAppStore();
  const queryClient = useQueryClient();
  const [showProfileCard, setShowProfileCard] = useState(false);
  const [dpDropdownOpen, setDpDropdownOpen] = useState(true);

  const hasAccessAssets = user?.accessAssets !== false;
  const hasAccessDailyPosition = user?.accessDailyPosition !== false;

  const visibleNav = navItems.filter((item) => {
    if (!item.roles.includes(role)) return false;
    if (item.label === "Feedback" && role !== "SUPER_ADMIN") return false;
    const isAssetLink = ["Asset Dashboard", "Master List", "Assets", "LC Gate"].includes(item.label);
    const isDpLink = ["Daily Position", "DP Form", "DP Summary", "DP Logs"].includes(item.label);
    if (isAssetLink && !hasAccessAssets) return false;
    if (isDpLink && !hasAccessDailyPosition) return false;
    return true;
  });

  const feedbackItem = navItems.find((item) => item.label === "Feedback" && item.roles.includes(role) && role !== "SUPER_ADMIN");

  const isFeedbackActive = activeNav === "Feedback";
  const feedbackStyle = isFeedbackActive
    ? {
      background: "#ffffff",
      color: "#114c8f",
      fontWeight: 800,
      boxShadow: "0 4px 12px rgba(13, 59, 111, 0.15)",
      border: "none",
      marginTop: "auto",
      marginBottom: "8px"
    }
    : {
      background: "rgba(255, 255, 255, 0.08)",
      border: "1px solid rgba(255, 255, 255, 0.18)",
      color: "rgba(255, 255, 255, 0.9)",
      fontWeight: 750,
      marginTop: "auto",
      marginBottom: "8px"
    };

  const prefetchNav = (label: NavKey) => {
    if (label === "DP Form" || label === "DP Logs") {
      void import("./components/DailyPosition/DailyPositionView");
    }
    if ((label === "Asset Dashboard" || label === "Daily Position") && token) {
      void queryClient.prefetchQuery({
        queryKey: ["dashboard-summary", division, token],
        queryFn: () => getDashboardSummary(division),
        staleTime: 60_000,
      });
    }
    if ((label === "Master List" || label === "Assets") && token) {
      void queryClient.prefetchQuery({
        queryKey: ["stations-list"],
        queryFn: () => api.stations.list(),
        staleTime: 5 * 60_000,
      });
    }
    if (label === "Assets" && token) {
      void queryClient.prefetchQuery({
        queryKey: ["assets-list"],
        queryFn: () => api.assets.list(),
        staleTime: 5 * 60_000,
      });
    }
  };

  return (
    <aside className={`sidebar ${sidebarOpen ? "show" : ""}`}>
      <div className="brand">
        <div className="telecom-mark">
          <RadioTower size={24} />
        </div>
        <div>
          <h1>SECR</h1>
          <p>Telecom DP & Assets Management </p>
        </div>
      </div>

      <nav className="nav-list" aria-label="Primary">
        {visibleNav.map((item) => {
          const isAssetLink = ["Asset Dashboard", "Master List", "Assets", "LC Gate"].includes(item.label);
          const isDpLink = ["Daily Position", "DP Form", "DP Summary", "DP Logs"].includes(item.label);
          const hasAccess = (isAssetLink ? hasAccessAssets : true) && (isDpLink ? hasAccessDailyPosition : true);

          return (
            <Fragment key={item.label}>
              <button
                className={`nav-item ${item.label === activeNav ? "active" : ""}`}
                style={{ opacity: hasAccess ? 1 : 0.6 }}
                onMouseEnter={() => hasAccess && prefetchNav(item.label)}
                onFocus={() => hasAccess && prefetchNav(item.label)}
                onClick={() => {
                  if (!hasAccess) {
                    alert("Access to this module is not permitted. Please request access from the administrator.");
                    return;
                  }
                  if (item.label === "DP Form") {
                    if (activeNav === "DP Form") {
                      setDpDropdownOpen(!dpDropdownOpen);
                    } else {
                      setActiveNav(item.label);
                      setDpDropdownOpen(true);
                    }
                  } else {
                    setActiveNav(item.label);
                  }
                }}
                type="button"
              >
                <item.icon size={20} />
                <span>
                  {role === "TESTROOM"
                    ? item.label === "Daily Position"
                      ? "Dashboard"
                      : item.label === "DP Form"
                        ? "Daily Position Form"
                        : item.label
                    : item.label}
                </span>
                {hasAccess ? (
                  <>
                    {item.badge ? <b>{item.badge}</b> : null}
                    {item.expandable ? <ChevronDown className="nav-caret" size={16} /> : null}
                  </>
                ) : (
                  <Lock className="nav-caret" size={14} style={{ color: "var(--muted)", marginLeft: "auto" }} />
                )}
              </button>
              {item.label === "DP Form" && activeNav === "DP Form" && dpDropdownOpen && hasAccess && (
                <SidebarDailyPositionAccordion />
              )}
            </Fragment>
          );
        })}
      </nav>

      {feedbackItem && (
        <button
          className={`nav-item ${isFeedbackActive ? "active" : ""}`}
          onClick={() => setActiveNav("Feedback")}
          style={feedbackStyle}
          type="button"
        >
          <MessageSquare size={20} />
          <span>Feedback</span>
        </button>
      )}

      {user && (
        <div
          className="sidebar-footer"
          onMouseEnter={() => setShowProfileCard(true)}
          onMouseLeave={() => setShowProfileCard(false)}
          style={{
            marginTop: feedbackItem ? "0" : "auto"
          }}
        >
          {/* Visual Avatar */}
          <div className="profile-avatar">
            {user.name[0].toUpperCase()}
          </div>

          {/* User Details */}
          <div className="user-info" style={{ cursor: "pointer", flex: 1, minWidth: 0 }}>
            <strong style={{ display: "block", fontSize: "12.5px", color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</strong>
            <small style={{ display: "block", fontSize: "10.5px", color: "rgba(255, 255, 255, 0.6)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.designation || user.role}</small>
          </div>

          {/* Actions Button Group */}
          <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
            <button
              className="profile-action-btn"
              onClick={onEditProfile}
              title="Edit Profile"
            >
              <Edit size={13} />
            </button>
            <button
              className="profile-action-btn sign-out"
              onClick={logout}
              title="Sign Out"
            >
              <LogOut size={13} />
            </button>
          </div>
          {showProfileCard && (
            <div className="profile-hover-card">
              <div className="profile-header">
                <div className="profile-avatar">{user.name[0].toUpperCase()}</div>
                <div style={{ textAlign: "left" }}>
                  <h4>{user.name}</h4>
                  <span className="pill info" style={{ fontSize: 9, padding: "2px 6px", textTransform: "uppercase" }}>{user.role}</span>
                </div>
              </div>
              <div className="profile-body">
                <div className="profile-field">
                  <span className="label">Username</span>
                  <span className="value">{user.username}</span>
                </div>
                <div className="profile-field">
                  <span className="label">Designation</span>
                  <span className="value">{user.designation || "-"}</span>
                </div>
                <div className="profile-field">
                  <span className="label">Division</span>
                  <span className="value">{normalizeDivision(user.division) || "HQ (All)"}</span>
                </div>
                {user.createdAt && (
                  <div className="profile-field">
                    <span className="label">Joined</span>
                    <span className="value">{new Date(user.createdAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

// PageHeader Component
function PageHeader({ activeNav }: { activeNav: NavKey }) {
  const { division, role } = useAppStore();

  const displayTitle = role === "TESTROOM"
    ? activeNav === "Daily Position"
      ? "Dashboard"
      : activeNav === "DP Form"
        ? "Daily Position Form"
        : activeNav
    : activeNav;

  return (
    <section className="page-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
      <div>
        <h2 style={{ fontSize: "24px", fontWeight: 700, color: "var(--navy)", margin: 0 }}>{displayTitle}</h2>
        <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "var(--muted)" }}>
          {["Asset Dashboard", "Daily Position"].includes(activeNav)
            ? "Overview of Telecom Assets and Operations"
            : `${displayTitle} operations workspace`}
        </p>
      </div>

      {role !== "SUPER_ADMIN" && (
        <div style={{ textTransform: "uppercase", fontWeight: 700, fontSize: 13, background: "#eef2f6", padding: "8px 16px", borderRadius: 6, color: "var(--muted)" }}>
          {`Division: ${normalizeDivision(division) || "HQ"}`}
        </div>
      )}
    </section>
  );
}

function AssetDashboardView({
  data,
  openPanel,
  queries
}: {
  data: DashboardSummary;
  openPanel: (title: string, itemId?: string | null) => void;
  queries: any;
}) {
  const handleBottomStatClick = (label: string) => {
    const { setActiveNav } = useAppStore.getState();
    if (label === "Stations" || label === "ABSS Stations" || label === "Divisional Stations") {
      setActiveNav("Master List");
    } else if (label === "Gates" || label === "LC Gate" || label === "LC Gates") {
      setActiveNav("LC Gate");
    } else {
      setActiveNav(label as any);
    }
  };

  const assetKpis = data.kpis.filter(kpi => ["assets", "operational", "maintenance"].includes(kpi.id));

  const commissioningMetrics = useMemo(() => {
    const summary = data.commissioningSummary || { abssOnly: 0, divisionalOnly: 0, bothSchemes: 0, unspecified: 0 };
    const total = (summary.abssOnly || 0) + (summary.divisionalOnly || 0) + (summary.bothSchemes || 0);
    const getPercent = (val: number) => total > 0 ? `${((val / total) * 100).toFixed(1)}%` : "0%";
    return [
      { name: "ABSS Only", value: summary.abssOnly || 0, percent: getPercent(summary.abssOnly || 0), color: "#3b82f6" },
      { name: "Divisional Only", value: summary.divisionalOnly || 0, percent: getPercent(summary.divisionalOnly || 0), color: "#10b981" },
      { name: "Both Schemes", value: summary.bothSchemes || 0, percent: getPercent(summary.bothSchemes || 0), color: "#8b5cf6" }
    ];
  }, [data.commissioningSummary]);

  const totalStations = useMemo(() => {
    const summary = data.commissioningSummary || { abssOnly: 0, divisionalOnly: 0, bothSchemes: 0, unspecified: 0 };
    return (summary.abssOnly || 0) + (summary.divisionalOnly || 0) + (summary.bothSchemes || 0);
  }, [data.commissioningSummary]);

  return (
    <div className="dashboard-scroll-wrap" style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingRight: 4 }}>
      <section className="kpi-grid">
        {assetKpis.map((kpi, index) => (
          <KpiCard key={kpi.id} kpi={kpi} index={index} />
        ))}
      </section>

      <section className="dashboard-grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
        <ChartPanel
          title="Assets by Category"
          total={data.kpis.find(kpi => kpi.id === "assets")?.value || "0"}
          metrics={data.categories}
          openPanel={() => useAppStore.getState().setActiveNav("Assets")}
        />
        <ChartPanel
          title="Assets by Status"
          total={data.kpis.find(kpi => kpi.id === "assets")?.value || "0"}
          metrics={data.statuses.map(s => ({ name: s.status, value: s.count, percent: s.percent, color: s.color }))}
          openPanel={() => useAppStore.getState().setActiveNav("Assets")}
        />
        <ChartPanel
          title="Station Commissioning Status"
          total={totalStations.toString()}
          metrics={commissioningMetrics}
          openPanel={() => useAppStore.getState().setActiveNav("Master List")}
        />
      </section>

      <section className="operations-grid">
        <TelecomCoveragePanel queries={queries} />
        <DivisionDistributionPanel queries={queries} />
        <CategoryDistributionPanel queries={queries} />
      </section>

      <section className="bottom-stats">
        {data.bottomStats.map((stat) => (
          <BottomStatCard key={stat.id} stat={stat} openPanel={() => handleBottomStatClick(stat.label)} />
        ))}
      </section>
    </div>
  );
}

function DailyPositionSubmissionProgressPanel({ division }: { division: string }) {
  const todayStr = toDateValue();
  const dpQuery = useQuery({
    queryKey: ["dp-summary-table", division, todayStr],
    queryFn: () => api.dailyPosition.list({ division, date: todayStr, limit: 500 }),
    staleTime: 30 * 1000
  });

  const entries = dpQuery.data?.data || [];

  // Count unique forms submitted today
  const displayedForms = useMemo(() => {
    const base = DAILY_POSITION_FORMS.filter(form => form.category !== "Daily Log" && form.name !== "Daily Position Log");
    const wifi = base.find(f => f.name === "Wi-Fi");
    if (wifi) {
      return [...base.filter(f => f.name !== "Wi-Fi"), wifi];
    }
    return base;
  }, []);

  const submittedFormsCount = useMemo(() => {
    const submittedNames = new Set(entries.map((e: any) => e.formType));
    return displayedForms.filter(form => submittedNames.has(form.name) || submittedNames.has(form.systemCode)).length;
  }, [entries, displayedForms]);

  const totalFormsCount = displayedForms.length; // 20
  const pendingFormsCount = Math.max(0, totalFormsCount - submittedFormsCount);

  const chartData = [
    { name: "Submitted", value: submittedFormsCount, color: "#10b981" },
    { name: "Pending", value: pendingFormsCount, color: "#cbd5e1" }
  ];

  return (
    <article className="panel distribution-panel" style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: "310px" }}>
      <h3 style={{ margin: "0 0 16px 0", fontSize: 17, borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>Today's Submission Progress</h3>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 20 }}>
        <div style={{ width: 140, height: 140, flexShrink: 0, position: "relative" }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart style={{ outline: 'none' }}>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={65}
                paddingAngle={3}
                dataKey="value"
                style={{ outline: 'none' }}
              >
                {chartData.map((entry, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    fill={entry.color}
                    style={{ outline: 'none' }}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value} Forms`, 'Count']} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
            pointerEvents: "none"
          }}>
            <strong style={{ fontSize: 20, color: "var(--navy)", display: "block", lineHeight: 1 }}>
              {Math.round((submittedFormsCount / totalFormsCount) * 100)}%
            </strong>
            <span style={{ fontSize: 10, color: "var(--muted)" }}>Complete</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <span style={{ fontSize: 12, color: "var(--muted)", display: "block" }}>Division</span>
            <strong style={{ fontSize: 16, color: "var(--navy)" }}>{division}</strong>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
              <strong style={{ color: "var(--navy)" }}>Submitted:</strong> {submittedFormsCount} / {totalFormsCount}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#cbd5e1", display: "inline-block" }} />
              <strong style={{ color: "var(--navy)" }}>Pending:</strong> {pendingFormsCount}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function DailyPositionDivisionPanel({ divisionData }: { divisionData: any[] }) {
  const { setDivision, setActiveNav, setDpHistoryFilter } = useAppStore();
  const hasData = divisionData.some(d => d.value > 0);
  const chartData = hasData ? divisionData : [
    { name: "Raipur", value: 1, color: "#f1f5f9" },
    { name: "Bilaspur", value: 1, color: "#f1f5f9" },
    { name: "Nagpur", value: 1, color: "#f1f5f9" }
  ];

  const handleDivisionClick = (divName: string) => {
    setDivision(divName);
    setDpHistoryFilter("active-faults");
    setActiveNav("DP Logs");
  };

  return (
    <article className="panel distribution-panel" style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: "310px" }}>
      <h3 style={{ margin: "0 0 16px 0", fontSize: 17, borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>Division-wise Report Submission </h3>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 20 }}>
        <div style={{ width: 140, height: 140, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart style={{ outline: 'none' }}>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={65}
                paddingAngle={hasData ? 3 : 0}
                dataKey="value"
                style={{ outline: 'none' }}
              >
                {chartData.map((entry, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    fill={entry.color}
                    style={{ outline: 'none', cursor: (hasData && entry.value > 0) ? 'pointer' : 'default' }}
                    onClick={() => hasData && entry.value > 0 && handleDivisionClick(entry.name)}
                  />
                ))}
              </Pie>
              {hasData && <Tooltip formatter={(value) => [`${value} Faults`, 'Count']} />}
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {divisionData.map(entry => {
            const clickable = hasData && entry.value > 0;
            return (
              <div
                key={entry.name}
                onClick={() => clickable && handleDivisionClick(entry.name)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  cursor: clickable ? "pointer" : "default",
                  transition: "opacity 0.2s"
                }}
                onMouseEnter={e => {
                  if (clickable) e.currentTarget.style.opacity = "0.7";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.opacity = "1";
                }}
              >
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: hasData ? entry.color : "#cbd5e1", display: "inline-block" }} />
                <strong style={{ color: clickable ? "var(--blue)" : "var(--navy)", textDecoration: clickable ? "underline" : "none" }}>{entry.name}:</strong> {entry.value}
              </div>
            );
          })}
        </div>
      </div>
    </article>
  );
}

function DailyPositionStatusPanel({
  monthlyFaultsTrend = []
}: {
  monthlyFaultsTrend?: Array<{ month: string; faults: number }>;
}) {
  const { setActiveNav } = useAppStore();

  // If no trend data is present, provide a baseline mock for visual preview
  const data = monthlyFaultsTrend.length > 0 ? monthlyFaultsTrend : [
    { month: "Jan", faults: 0 },
    { month: "Feb", faults: 0 },
    { month: "Mar", faults: 0 },
    { month: "Apr", faults: 0 },
    { month: "May", faults: 0 },
    { month: "Jun", faults: 0 }
  ];

  return (
    <article className="panel" style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: "310px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "0 0 16px 0", borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: 17, color: "var(--navy)", fontWeight: 700 }}>Monthly Faults Trend</h3>
        <button
          onClick={() => setActiveNav("DP Logs")}
          style={{ fontSize: 12, color: "var(--blue)", border: 0, background: "none", fontWeight: 600, padding: 0 }}
        >
          View Logs
        </button>
      </div>

      <div style={{ flex: 1, width: "100%", height: "100%", minHeight: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="faultsColor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--red)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="var(--red)" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
            <XAxis
              dataKey="month"
              tick={{ fill: "var(--muted)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "var(--muted)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
              }}
              labelStyle={{ fontWeight: 700, color: "var(--navy)" }}
            />
            <Area
              type="monotone"
              dataKey="faults"
              stroke="var(--red)"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#faultsColor)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}

function DailyPositionHighPriorityFaultsPanel({
  userDivision,
  showToast,
  queries,
  onCategoryClick
}: {
  userDivision: string;
  showToast: (msg: string) => void;
  queries: any;
  onCategoryClick?: (categoryName: string) => void;
}) {
  const { role, setActiveNav, setDpHistoryFilter, setDpHistoryCategoryFilter } = useAppStore();
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [rectifyingRecord, setRectifyingRecord] = useState<any | null>(null);
  const [rectificationTimeInput, setRectificationTimeInput] = useState("");

  const activeFaultsQuery = useQuery({
    queryKey: ["daily-position-dashboard-active-faults", userDivision],
    queryFn: () => api.dailyPosition.list({ division: userDivision || "", isFaulty: "true", limit: 500 }),
  });

  const queryClient = useQueryClient();
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => api.dailyPosition.update(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-position-dashboard-active-faults"] });
      queryClient.invalidateQueries({ queryKey: ["daily-position-category-active-faults"] });
      queryClient.invalidateQueries({ queryKey: ["daily-position-records"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dp-summary-table"] });
      showToast?.("Fault rectified successfully.");
      setRectifyingRecord(null);
    },
    onError: (err: any) => {
      showToast?.(err.message || "Failed to rectify fault.");
    }
  });

  const getPriorityInfo = (category = "", name = "") => {
    const catLower = (category || "").toLowerCase();
    const nameLower = (name || "").toLowerCase();

    // High Priority: Cable Infrastructure, Control & ICMS Position and FOIS 
    if (
      catLower.includes("cable infrastructure") ||
      catLower.includes("cable infrasturucture") ||
      nameLower.includes("cable infrastructure") ||
      nameLower.includes("cable infrasturucture") ||
      nameLower.includes("cable cut") ||
      nameLower.includes("control & icms") ||
      nameLower.includes("fois") ||
      nameLower.includes("vsat")
    ) {
      return { label: "High", color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)", border: "rgba(239, 68, 68, 0.2)" };
    }

    // Median Priority: Video Conferencing with Divisions and hotline
    if (
      nameLower.includes("video conferencing") ||
      nameLower.includes("hotline") ||
      catLower.includes("video conferencing") ||
      catLower.includes("hotline")
    ) {
      return { label: "Median", color: "#f97316", bg: "rgba(249, 115, 22, 0.1)", border: "rgba(249, 115, 22, 0.2)" };
    }

    // Low Priority: wifi and Network&internet (and default fallback)
    return { label: "Low", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)", border: "rgba(59, 130, 246, 0.2)" };
  };

  const getPriorityWeight = (category = "", name = "") => {
    const info = getPriorityInfo(category, name);
    if (info.label === "High") return 1;
    if (info.label === "Median") return 2;
    return 3;
  };

  const records = useMemo(() => {
    const rawRecords = activeFaultsQuery.data?.data || [];
    const filtered = rawRecords.filter((r: any) => {
      if (r.status === "DRAFT") return false;
      const isAllOk = r.reason === "All OK" || (r.formData && r.formData.actionType === "OK");
      const isWifi = (r.formType || r.name || "").toLowerCase() === "wi-fi";
      return !isAllOk && !isWifi;
    });

    // Sort by priority weight first (High=1, Median=2, Low=3), then by failureTime ascending (oldest first)
    return [...filtered].sort((a: any, b: any) => {
      const weightA = getPriorityWeight(a.category, a.formType || a.name);
      const weightB = getPriorityWeight(b.category, b.formType || b.name);

      if (weightA !== weightB) {
        return weightA - weightB;
      }

      const timeA = a.failureTime ? new Date(a.failureTime).getTime() : 0;
      const timeB = b.failureTime ? new Date(b.failureTime).getTime() : 0;
      return timeB - timeA;
    });
  }, [activeFaultsQuery.data]);

  const formatDate = (dateStr: string) => {
    return formatDate24(dateStr);
  };

  const toLocalDateTimeValue = (date: Date) => {
    const tzoffset = date.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(date.getTime() - tzoffset)).toISOString().slice(0, -1);
    return localISOTime.substring(0, 16);
  };

  const formatDateTimeInput = (dateStr?: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return Number.isNaN(d.getTime()) ? "" : toLocalDateTimeValue(d);
  };

  const calcDurationText = (failureTime?: string, rectificationTime?: string) => {
    if (!failureTime || !rectificationTime) return "";
    const start = new Date(failureTime);
    const end = new Date(rectificationTime);
    const diffMs = end.getTime() - start.getTime();
    if (diffMs <= 0) return "0 mins";
    const diffMins = Math.round(diffMs / 60000);
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    if (hrs > 0) {
      return `${hrs} hr${hrs > 1 ? "s" : ""} ${mins} min${mins !== 1 ? "s" : ""}`;
    }
    return `${mins} min${mins !== 1 ? "s" : ""}`;
  };

  const getFailureDurationText = (failureTime?: string) => {
    if (!failureTime) return "N/A";
    const start = new Date(failureTime);
    if (isNaN(start.getTime())) return "N/A";
    const diffMs = Date.now() - start.getTime();
    if (diffMs <= 0) return "Just reported";
    const diffMins = Math.round(diffMs / 60000);
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    const days = Math.floor(hrs / 24);

    if (days > 0) {
      return `${days}d ${hrs % 24}h ${mins}m`;
    }
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const [maxRecords, setMaxRecords] = useState(5);
  useEffect(() => {
    const handleResize = () => {
      if (window.innerHeight > 800) {
        setMaxRecords(7);
      } else {
        setMaxRecords(5);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const displayRecords = records.slice(0, maxRecords);

  const handleViewAllClick = () => {
    onCategoryClick?.("Active Faults");
  };

  return (
    <article className="panel" style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, gridColumn: "span 2", padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid var(--line)", paddingBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <AlertTriangle size={18} style={{ color: "var(--red)" }} />
          <h3 style={{ margin: 0, fontSize: "17px", color: "var(--navy)", fontWeight: 700 }}>
            Priority Active Faults
          </h3>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        {activeFaultsQuery.isLoading ? (
          <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
            <div className="dp-btn-loader" style={{ borderTopColor: "var(--blue)", width: "24px", height: "24px" }} />
            <span style={{ marginLeft: "8px", color: "var(--muted)", fontSize: "13px" }}>Loading priority list...</span>
          </div>
        ) : records.length === 0 ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: "10px", color: "var(--muted)", textAlign: "center" }}>
            <ShieldCheck size={40} style={{ color: "var(--green)" }} />
            <div>
              <strong style={{ color: "var(--navy)", display: "block", fontSize: "15px" }}>All Operations Normal</strong>
              <span style={{ fontSize: "12px" }}>No pending telecom faults found.</span>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
            <div className="table-scroll-container" style={{ margin: 0, boxShadow: "none", border: "1px solid var(--line)", borderRadius: "8px", overflowY: "auto", background: "#fff", flex: 1, paddingBottom: "6px" }}>
              <table className="data-table" style={{ fontSize: "12.5px" }}>
                <thead>
                  <tr>
                    <th>Circuit Name</th>
                    <th>Location</th>
                    <th>Remarks</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRecords.map((r: any) => {
                    return (
                      <tr key={r.id} style={{ transition: "background 0.2s" }} className="hover-row">
                        <td>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <strong style={{ color: "var(--navy)" }}>{r.formType || r.name}</strong>
                            <span style={{ fontSize: "11px", color: "var(--muted)" }}>{r.category}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span>{r.stationCode || r.stationName || r.section || "-"}</span>
                            <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase" }}>{r.division} Division</span>
                          </div>
                        </td>
                        <td>
                          <div
                            style={{
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              fontSize: "11.5px",
                              color: "var(--muted)",
                              lineHeight: "1.3",
                              whiteSpace: "normal",
                              wordBreak: "break-word",
                              maxWidth: "250px"
                            }}
                            title={r.remarks || r.reason || "-"}
                          >
                            {r.remarks || r.reason || "-"}
                          </div>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "8px", justifyContent: "flex-end", width: "100%" }}>
                            <button
                              type="button"
                              onClick={() => setSelectedRecord(r)}
                              style={{
                                color: "var(--blue)",
                                fontWeight: 600,
                                background: "none",
                                border: "none",
                                padding: "4px 8px",
                                fontSize: "12px",
                                cursor: "pointer"
                              }}
                            >
                              Detail
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRectifyingRecord(r);
                                setRectificationTimeInput(toLocalDateTimeValue(new Date()));
                              }}
                              style={{
                                color: "var(--red)",
                                fontWeight: 700,
                                background: "rgba(239, 68, 68, 0.08)",
                                border: "1px solid rgba(239, 68, 68, 0.2)",
                                borderRadius: "4px",
                                padding: "3px 10px",
                                fontSize: "11px",
                                cursor: "pointer",
                                transition: "all 0.2s"
                              }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(239, 68, 68, 0.15)"; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(239, 68, 68, 0.08)"; }}
                              title="Click to rectify fault"
                            >
                              Rectify
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {records.length > 5 && (
              <div style={{ textAlign: "center", fontSize: "12px", color: "var(--muted)", marginTop: "4px" }}>
                Showing 5 of {records.length} active faults. <span style={{ color: "var(--blue)", cursor: "pointer", fontWeight: 600 }} onClick={handleViewAllClick}>View all faults</span> to see the rest.
              </div>
            )}
          </div>
        )}
      </div>

      {selectedRecord && (
        <DailyPositionDetailsModal
          detailsRecord={[selectedRecord]}
          detailsTitle={`${selectedRecord.formType || selectedRecord.name} — ${selectedRecord.division}`}
          selectedDate={selectedRecord.createdAt || selectedRecord.failureTime || new Date().toISOString()}
          formatDate={formatDate}
          onClose={() => setSelectedRecord(null)}
          role="SUPER_ADMIN"
          queries={queries}
        />
      )}

      {rectifyingRecord && (
        <div className="modal-backdrop dp-modal-backdrop" onClick={() => setRectifyingRecord(null)} style={{ zIndex: 9999 }}>
          <div className="modal-card" onClick={event => event.stopPropagation()} style={{ width: "min(460px, 95vw)", padding: "24px", borderRadius: "12px", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)", background: "#fff", position: "relative" }}>
            <button className="modal-close" type="button" onClick={() => setRectifyingRecord(null)} aria-label="Close">
              <X size={16} />
            </button>
            <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: "600", color: "var(--navy)" }}>Rectify Fault</h3>
            <p style={{ margin: "0 0 20px 0", fontSize: "14px", color: "var(--muted)" }}>
              Update the rectification date and time for <strong>{rectifyingRecord.formType || rectifyingRecord.name}</strong> at <strong>{rectifyingRecord.stationCode || rectifyingRecord.stationName || rectifyingRecord.section || "-"}</strong>.
            </p>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!rectificationTimeInput) {
                showToast("Please enter the rectification date and time.");
                return;
              }
              const nowLocalStr = toLocalDateTimeValue(new Date());
              if (rectificationTimeInput > nowLocalStr) {
                showToast("Future date & time is not allowed.");
                return;
              }
              const failureTimeLocalStr = formatDateTimeInput(rectifyingRecord.failureTime);
              if (failureTimeLocalStr && rectificationTimeInput < failureTimeLocalStr) {
                showToast("Rectification time cannot be before failure time.");
                return;
              }

              const updatedFormData = {
                ...(rectifyingRecord.formData || {}),
                rectificationTime: rectificationTimeInput,
              };

              updateMutation.mutate({
                id: rectifyingRecord.id,
                body: {
                  ...rectifyingRecord,
                  rectificationTime: rectificationTimeInput,
                  durationText: calcDurationText(rectifyingRecord.failureTime, rectificationTimeInput),
                  status: "RECTIFIED",
                  formData: updatedFormData,
                }
              });
            }}>
              <div className="dp-field" style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--navy)", marginBottom: "6px" }}>
                  Rectification Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={rectificationTimeInput}
                  max={toLocalDateTimeValue(new Date())}
                  onChange={(e) => setRectificationTimeInput(e.target.value)}
                  onClick={(e) => { try { e.currentTarget.showPicker(); } catch (err) { } }}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--line)",
                    fontSize: "14px",
                    fontFamily: "inherit",
                    color: "var(--navy)",
                    cursor: "pointer"
                  }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setRectifyingRecord(null)}
                  className="export-button"
                  style={{ background: "transparent", color: "var(--muted)", borderColor: "var(--line)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="export-button"
                  disabled={updateMutation.isPending}
                  style={{ background: "var(--blue)", color: "#fff", border: "none" }}
                >
                  {updateMutation.isPending ? "Submitting..." : "Rectify Fault"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </article>
  );
}

function CategoryFaultsPageView({
  categoryName,
  onBack,
  queries,
  showToast
}: {
  categoryName: string;
  onBack: () => void;
  queries?: any;
  showToast?: (msg: string) => void;
}) {
  const isTodayQuery = categoryName.toLowerCase().includes("today") || categoryName.toLowerCase().includes("resolved");

  const faultsQuery = useQuery({
    queryKey: ["daily-position-category-active-faults", categoryName],
    queryFn: () => {
      const params: any = { limit: 500 };
      if (!isTodayQuery) {
        params.isFaulty = "true";
      }
      return api.dailyPosition.list(params);
    },
  });

  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [rectifyingRecord, setRectifyingRecord] = useState<any | null>(null);
  const [rectificationTimeInput, setRectificationTimeInput] = useState("");

  const [selectedDivision, setSelectedDivision] = useState("");
  const [selectedStation, setSelectedStation] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    setSelectedStation("");
  }, [selectedDivision]);

  const formatDate = (dateStr: string) => {
    return formatDate24(dateStr);
  };

  const toLocalDateTimeValue = (date: Date) => {
    const tzoffset = date.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(date.getTime() - tzoffset)).toISOString().slice(0, -1);
    return localISOTime.substring(0, 16);
  };

  const formatDateTimeInput = (dateStr?: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return Number.isNaN(d.getTime()) ? "" : toLocalDateTimeValue(d);
  };

  const calcDurationText = (failureTime?: string, rectificationTime?: string) => {
    if (!failureTime || !rectificationTime) return "";
    const start = new Date(failureTime);
    const end = new Date(rectificationTime);
    const diffMs = end.getTime() - start.getTime();
    if (diffMs <= 0) return "0 mins";
    const diffMins = Math.round(diffMs / 60000);
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    if (hrs > 0) {
      return `${hrs} hr${hrs > 1 ? "s" : ""} ${mins} min${mins !== 1 ? "s" : ""}`;
    }
    return `${mins} min${mins !== 1 ? "s" : ""}`;
  };

  const queryClient = useQueryClient();
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => api.dailyPosition.update(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-position-category-active-faults"] });
      queryClient.invalidateQueries({ queryKey: ["daily-position-records"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dp-summary-table"] });
      showToast?.("Fault rectified successfully.");
      setRectifyingRecord(null);
    },
    onError: (err: any) => {
      showToast?.(err.message || "Failed to rectify fault.");
    }
  });

  const toDateValue = (date = new Date()) => {
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
  };
  const todayStr = toDateValue(new Date());

  const records = (faultsQuery.data?.data || []).filter((r: any) => {
    if (r.status === "DRAFT") return false;
    const isAllOk = r.reason === "All OK" || (r.formData && r.formData.actionType === "OK");
    if (isAllOk) return false;

    const lowerCat = categoryName.toLowerCase();

    // 1. Active Faults
    if (lowerCat === "active faults") {
      const isWifi = (r.formType || r.name || "").toLowerCase() === "wi-fi";
      return !isWifi && !r.rectificationTime; // Must be active
    }

    // 2. Wi-Fi Faults
    if (lowerCat === "wi-fi") {
      const isWifi = (r.formType || r.name || "").toLowerCase() === "wi-fi";
      return isWifi && !r.rectificationTime; // Must be active
    }

    // 3. Faults Reported Today
    if (lowerCat === "faults today" || lowerCat === "faults reported today" || lowerCat === "reported today") {
      const isTodayVal = r.failureTime && toDateValue(new Date(r.failureTime)) === todayStr;
      return isTodayVal;
    }

    // 4. Faults Resolved Today
    if (lowerCat === "resolved today" || lowerCat === "faults resolved today" || lowerCat === "resolved faults") {
      const isResolvedToday = r.rectificationTime && toDateValue(new Date(r.rectificationTime)) === todayStr;
      return isResolvedToday;
    }

    return r.category?.toLowerCase() === categoryName?.toLowerCase();
  });

  const sortedRecords = useMemo(() => {
    return [...records].sort((a: any, b: any) => {
      const timeA = a.failureTime ? new Date(a.failureTime).getTime() : 0;
      const timeB = b.failureTime ? new Date(b.failureTime).getTime() : 0;
      return timeB - timeA;
    });
  }, [records]);

  const uniqueDivisions = useMemo(() => {
    return Array.from(new Set(records.map((r: any) => r.division).filter(Boolean))) as string[];
  }, [records]);

  const uniqueStations = useMemo(() => {
    const filteredForStations = selectedDivision
      ? records.filter((r: any) => r.division === selectedDivision)
      : records;
    return Array.from(new Set(filteredForStations.map((r: any) => r.stationCode || r.stationName || r.section).filter(Boolean))) as string[];
  }, [records, selectedDivision]);

  const filteredRecords = useMemo(() => {
    return sortedRecords.filter((r: any) => {
      if (selectedDivision && r.division !== selectedDivision) return false;

      const stationVal = r.stationCode || r.stationName || r.section || "";
      if (selectedStation && stationVal !== selectedStation) return false;

      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const division = String(r.division || "").toLowerCase();
        const category = String(r.category || "").toLowerCase();
        const formType = String(r.formType || "").toLowerCase();
        const station = String(stationVal).toLowerCase();
        const remarks = String(r.remarks || r.reason || "").toLowerCase();
        const customFields = r.formData ? JSON.stringify(r.formData).toLowerCase() : "";

        const match = division.includes(query) ||
          category.includes(query) ||
          formType.includes(query) ||
          station.includes(query) ||
          remarks.includes(query) ||
          customFields.includes(query);
        if (!match) return false;
      }
      return true;
    });
  }, [sortedRecords, selectedDivision, selectedStation, searchTerm]);

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return Number.isNaN(date.getTime()) ? dateStr : formatDateTime24(date);
  };

  return (
    <article className="panel" style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: "500px", padding: "24px" }}>
      {/* Page Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--line)", paddingBottom: "16px", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.8px" }}>
            {["active faults", "wi-fi faults", "faults today", "faults reported today", "reported today", "resolved today", "faults resolved today", "resolved faults"].includes(categoryName.toLowerCase()) ? "Telecom Fault Log" : "Category-wise Fault Log"}
          </span>
          <h2 style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: 700, color: "var(--navy)" }}>
            {(() => {
              const lower = categoryName.toLowerCase();
              if (lower === "active faults") return "Active Faults";
              if (lower === "faults today" || lower === "faults reported today" || lower === "reported today") return "Faults Reported Today";
              if (lower === "resolved today" || lower === "faults resolved today" || lower === "resolved faults") return "Faults Resolved Today";
              return `${categoryName} Faults`;
            })()}
          </h2>
          <p style={{ margin: "2px 0 0", fontSize: "13px", color: "var(--muted)" }}>
            {faultsQuery.isLoading
              ? "Loading faults..."
              : categoryName.toLowerCase().includes("resolved")
                ? `${records.length} resolved faults found`
                : `${records.filter((r: any) => !r.rectificationTime).length} active faults found`}
          </p>
        </div>
        <button onClick={onBack} className="export-button" style={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
          ← Back
        </button>
      </div>

      {/* Page Body */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {faultsQuery.isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "80px" }}>
            <div className="dp-btn-loader" style={{ borderTopColor: "var(--blue)", width: "32px", height: "32px" }} />
            <span style={{ marginLeft: "12px", color: "var(--muted)", fontSize: "14px" }}>Loading records...</span>
          </div>
        ) : records.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px", color: "var(--muted)", fontSize: "15px" }}>
            {categoryName.toLowerCase().includes("resolved") ? "No resolved faults found." : `No active faults found for ${categoryName}.`}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
            {/* Filters Panel */}
            <div className="dp-history-filters" style={{ display: "flex", gap: "12px", flexWrap: "wrap", padding: "12px 16px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", alignItems: "flex-end" }}>
              <div style={{ flex: "1 1 150px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>Division</label>
                <ClearableSelect
                  value={selectedDivision}
                  onChange={setSelectedDivision}
                  style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", background: "#fff" }}
                >
                  <option value="">All Divisions</option>
                  {uniqueDivisions.map(div => (
                    <option key={div} value={div}>{div}</option>
                  ))}
                </ClearableSelect>
              </div>

              <div style={{ flex: "1 1 180px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>Station / Location</label>
                <ClearableSelect
                  value={selectedStation}
                  onChange={setSelectedStation}
                  style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", background: "#fff" }}
                >
                  <option value="">All Stations</option>
                  {uniqueStations.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </ClearableSelect>
              </div>

              <div style={{ flex: "1 1 0" }} />

              <div style={{ flex: "0 1 280px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>Search...</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "9px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none", display: "flex", alignItems: "center" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                  </span>
                  <input
                    type="text"
                    placeholder="Search station, remarks..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ width: "100%", padding: "6px 10px 6px 30px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              {(selectedDivision || selectedStation || searchTerm) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDivision("");
                    setSelectedStation("");
                    setSearchTerm("");
                  }}
                  className="action-btn text-red"
                  style={{ height: "34px", padding: "0 12px", border: "1px solid #fca5a5", borderRadius: "6px", background: "#fef2f2", fontSize: "13px", alignSelf: "flex-end" }}
                >
                  Clear Filters
                </button>
              )}
            </div>

            {filteredRecords.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px", color: "var(--muted)", fontSize: "15px" }}>
                No active faults matching current criteria.
              </div>
            ) : (
              <div className="table-scroll-container" style={{ margin: 0, boxShadow: "none", border: "1px solid var(--line)", borderRadius: "8px", overflow: "hidden", background: "#fff" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Division</th>
                      <th>Station</th>
                      <th>Failure Time</th>
                      <th>Rectification Time</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((record: any) => (
                      <tr key={record.id}>
                        <td>{record.division}</td>
                        <td>{record.stationCode || record.stationName || record.section || "-"}</td>
                        <td>{formatDateTime(record.failureTime)}</td>
                        <td>
                          {record.rectificationTime ? (
                            formatDateTime(record.rectificationTime)
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setRectifyingRecord(record);
                                setRectificationTimeInput(toLocalDateTimeValue(new Date()));
                              }}
                              style={{
                                color: "var(--red)",
                                fontWeight: 700,
                                background: "rgba(239, 68, 68, 0.08)",
                                border: "1px solid rgba(239, 68, 68, 0.2)",
                                borderRadius: "4px",
                                padding: "2px 8px",
                                fontSize: "11px",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center"
                              }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(239, 68, 68, 0.15)"; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(239, 68, 68, 0.08)"; }}
                              title="Click to rectify fault"
                            >
                              Active
                            </button>
                          )}
                        </td>
                        <td style={{ maxWidth: "400px", wordBreak: "break-word" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            <span>{record.remarks || record.reason || "-"}</span>
                            <button
                              type="button"
                              onClick={() => setSelectedRecord(record)}
                              style={{
                                alignSelf: "flex-start",
                                fontSize: "11px",
                                color: "var(--blue)",
                                border: "none",
                                background: "none",
                                padding: 0,
                                cursor: "pointer",
                                fontWeight: 650,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px"
                              }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = "underline"; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = "none"; }}
                            >
                              <Eye size={12} /> View Detail
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedRecord && (
        <DailyPositionDetailsModal
          detailsRecord={[selectedRecord]}
          detailsTitle={`${selectedRecord.formType || categoryName} — ${selectedRecord.division}`}
          selectedDate={selectedRecord.createdAt || selectedRecord.failureTime || new Date().toISOString()}
          formatDate={formatDate}
          onClose={() => setSelectedRecord(null)}
          role="SUPER_ADMIN"
          queries={queries}
        />
      )}

      {rectifyingRecord && (
        <div className="modal-backdrop dp-modal-backdrop" onClick={() => setRectifyingRecord(null)} style={{ zIndex: 9999 }}>
          <div className="modal-card" onClick={event => event.stopPropagation()} style={{ width: "min(460px, 95vw)", padding: "24px", borderRadius: "12px", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)", background: "#fff", position: "relative" }}>
            <button className="modal-close" type="button" onClick={() => setRectifyingRecord(null)} aria-label="Close">
              <X size={16} />
            </button>
            <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: "600", color: "var(--navy)" }}>Rectify Fault</h3>
            <p style={{ margin: "0 0 20px 0", fontSize: "14px", color: "var(--muted)" }}>
              Update the rectification date and time for <strong>{rectifyingRecord.formType || categoryName}</strong> at <strong>{rectifyingRecord.stationCode || rectifyingRecord.stationName || rectifyingRecord.section || "-"}</strong>.
            </p>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!rectificationTimeInput) {
                showToast?.("Please enter the rectification date and time.");
                return;
              }
              const nowLocalStr = toLocalDateTimeValue(new Date());
              if (rectificationTimeInput > nowLocalStr) {
                showToast?.("Future date & time is not allowed.");
                return;
              }
              const failureTimeLocalStr = formatDateTimeInput(rectifyingRecord.failureTime);
              if (failureTimeLocalStr && rectificationTimeInput < failureTimeLocalStr) {
                showToast?.("Rectification time cannot be before failure time.");
                return;
              }

              const updatedFormData = {
                ...(rectifyingRecord.formData || {}),
                rectificationTime: rectificationTimeInput,
              };

              updateMutation.mutate({
                id: rectifyingRecord.id,
                body: {
                  ...rectifyingRecord,
                  rectificationTime: rectificationTimeInput,
                  durationText: calcDurationText(rectifyingRecord.failureTime, rectificationTimeInput),
                  status: "RECTIFIED",
                  formData: updatedFormData,
                }
              });
            }}>
              <div className="dp-field" style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--navy)", marginBottom: "6px" }}>
                  Rectification Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={rectificationTimeInput}
                  max={toLocalDateTimeValue(new Date())}
                  onChange={(e) => setRectificationTimeInput(e.target.value)}
                  onClick={(e) => { try { e.currentTarget.showPicker(); } catch (err) { } }}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--line)",
                    fontSize: "14px",
                    fontFamily: "inherit",
                    color: "var(--navy)",
                    cursor: "pointer"
                  }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setRectifyingRecord(null)}
                  className="export-button"
                  style={{ background: "transparent", color: "var(--muted)", borderColor: "var(--line)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="export-button"
                  disabled={updateMutation.isPending}
                  style={{ background: "var(--blue)", color: "#fff", border: "none" }}
                >
                  {updateMutation.isPending ? "Submitting..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </article>
  );
}

function DailyPositionCategoryPanel({
  categoryData,
  onCategoryClick
}: {
  categoryData: any[];
  onCategoryClick: (categoryName: string) => void;
}) {
  const displayedCategories = DAILY_POSITION_CATEGORIES.filter(cat => cat !== "Daily Log" && cat !== "Daily Position Log");
  const total = categoryData.reduce((acc, curr) => acc + curr.value, 0) || 1;

  const displayData = displayedCategories.map((cat, idx) => {
    const found = categoryData.find(d => d.name.toLowerCase() === cat.toLowerCase());
    const catColors = ["#0b6dff", "#10b981", "#f5b51b", "#7c3aed", "#0f5fbf", "#8b95a8"];
    return {
      name: cat,
      value: found ? found.value : 0,
      color: found ? found.color : catColors[idx % catColors.length]
    };
  });

  return (
    <article className="panel distribution-panel" style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <h3 style={{ margin: "0 0 16px 0", fontSize: 17, borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>Category-wise Fault</h3>
      <div style={{ flex: 1, overflowY: "auto", display: "grid", gap: 14, paddingRight: 4 }}>
        {displayData.map(stat => {
          const percent = total > 0 && stat.value > 0 ? Math.round((stat.value / total) * 100) : 0;
          return (
            <div
              key={stat.name}
              className="category-distribution-row"
              style={{ display: "grid", gap: 5, cursor: "pointer" }}
              onClick={() => {
                onCategoryClick(stat.name);
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700 }}>
                <span style={{ color: "var(--navy)" }}>{stat.name}</span>
                <span style={{ color: stat.value > 0 ? "var(--blue)" : "var(--muted)" }}>
                  {stat.value} faults {stat.value > 0 && <span style={{ fontWeight: 500, color: "var(--muted)" }}>({percent}%)</span>}
                </span>
              </div>
              <div style={{ height: 6, background: "#e2e8f0", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${percent}%`, height: "100%", background: stat.color, borderRadius: 3 }} />
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function DailyPositionDashboardView({
  data,
  openPanel,
  queries,
  showToast,
  onCategoryClick
}: {
  data: DashboardSummary;
  openPanel: (title: string, itemId?: string | null) => void;
  queries: any;
  showToast: (msg: string) => void;
  onCategoryClick: (categoryName: string) => void;
}) {
  const { role, division: userDivision } = useAppStore();

  const activeFaultsQuery = useQuery({
    queryKey: ["daily-position-dashboard-active-faults", userDivision],
    queryFn: () => api.dailyPosition.list({ division: userDivision || "", isFaulty: "true", limit: 500 }),
    staleTime: 30 * 1000,
  });

  const wifiFaultsCount = useMemo(() => {
    const rawRecords = activeFaultsQuery.data?.data || [];
    const filtered = rawRecords.filter((r: any) => {
      if (r.status === "DRAFT") return false;
      const isAllOk = r.reason === "All OK" || (r.formData && r.formData.actionType === "OK");
      const isWifi = (r.formType || r.name || "").toLowerCase() === "wi-fi";
      return isWifi && !isAllOk;
    });
    return filtered.length;
  }, [activeFaultsQuery.data]);

  const activeFaultsCountClient = useMemo(() => {
    if (!activeFaultsQuery.data) {
      const faultsKpi = data.kpis.find(k => k.id === "activeFaults");
      return faultsKpi ? faultsKpi.value : "0";
    }
    const rawRecords = activeFaultsQuery.data?.data || [];
    const filtered = rawRecords.filter((r: any) => {
      if (r.status === "DRAFT") return false;
      const isAllOk = r.reason === "All OK" || (r.formData && r.formData.actionType === "OK");
      const isWifi = (r.formType || r.name || "").toLowerCase() === "wi-fi";
      return !isWifi && !isAllOk;
    });
    return String(filtered.length);
  }, [activeFaultsQuery.data, data.kpis]);

  const handleBottomStatClick = (label: string) => {
    const { setActiveNav } = useAppStore.getState();
    if (label === "Active Faults" || label === "Reported Today" || label === "Rectified Today") {
      setActiveNav(data.user.role === "TESTROOM" ? "DP Form" : "DP Logs");
    } else {
      setActiveNav(label as any);
    }
  };

  const dpKpis = useMemo(() => {
    const originalFaultsKpi = data.kpis.find(k => k.id === "activeFaults") || {
      id: "activeFaults",
      label: "Active Faults",
      value: "0",
      detail: "Pending faults",
      tone: "red",
      series: [0, 0, 0, 0, 0]
    };
    const faultsKpi = {
      ...originalFaultsKpi,
      value: activeFaultsCountClient
    };
    const wifiKpi = {
      id: "wifiFaults",
      label: "Wi-Fi Faults",
      value: String(wifiFaultsCount),
      detail: "",
      tone: "purple" as const,
      series: [0, 0, 0, 0, 0]
    };
    const faultsTodayKpi = data.kpis.find(k => k.id === "faultsToday") || {
      id: "faultsToday",
      label: "Faults Today",
      value: "0",
      detail: "Faults reported today",
      tone: "amber",
      series: [0, 0, 0, 0, 0]
    };
    const resolvedTodayKpi = data.kpis.find(k => k.id === "resolvedToday") || {
      id: "resolvedToday",
      label: "Resolved Today",
      value: "0",
      detail: "Faults resolved today",
      tone: "green",
      series: [0, 0, 0, 0, 0]
    };
    return [faultsKpi, faultsTodayKpi, resolvedTodayKpi, wifiKpi];
  }, [data.kpis, wifiFaultsCount, activeFaultsCountClient]);

  const dailyPositionMetrics = useMemo(() => {
    const statusColors: Record<string, string> = {
      FAULTY: "#ef4444", // Red
      RECTIFIED: "#10b981", // Green
      UNDER_MAINTENANCE: "#f59e0b", // Amber
      OPERATIONAL: "#3b82f6", // Blue
    };
    const records = data.dailyPositionStatus || [];
    const total = records.reduce((acc: number, curr: any) => acc + curr.count, 0) || 1;
    return records.map((item: any) => {
      const name = item.status.replace(/_/g, " ");
      const formattedName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
      return {
        name: formattedName,
        value: item.count,
        percent: `${((item.count / total) * 100).toFixed(1)}%`,
        color: statusColors[item.status.toUpperCase()] || "#94a3b8"
      };
    });
  }, [data.dailyPositionStatus]);

  const totalDailyPositions = useMemo(() => {
    return (data.dailyPositionStatus || []).reduce((acc: number, curr: any) => acc + curr.count, 0);
  }, [data.dailyPositionStatus]);

  const divisionData = useMemo(() => {
    const records = data.dailyPositionByDivision || [];
    const divColors: Record<string, string> = {
      Raipur: "#3b82f6",
      Bilaspur: "#10b981",
      Nagpur: "#8b5cf6"
    };
    return ["Raipur", "Bilaspur", "Nagpur"].map(name => {
      const record = records.find(r => normalizeDivision(r.division).toLowerCase() === name.toLowerCase());
      return {
        name,
        value: record ? record.count : 0,
        color: divColors[name] || "#8b5cf6"
      };
    });
  }, [data.dailyPositionByDivision]);

  const categoryData = useMemo(() => {
    const records = data.dailyPositionByCategory || [];
    const catColors = ["#0b6dff", "#10b981", "#f5b51b", "#7c3aed", "#0f5fbf", "#8b95a8"];
    return records.map((r, idx) => ({
      name: r.category,
      value: r.count,
      color: catColors[idx % catColors.length]
    }));
  }, [data.dailyPositionByCategory]);

  return (
    <div className="dashboard-scroll-wrap" style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingRight: 4 }}>
      <section className="kpi-grid">
        {dpKpis.map((kpi, index) => (
          <KpiCard key={kpi.id} kpi={kpi} index={index} onCategoryClick={onCategoryClick} />
        ))}
      </section>

      <section className="dashboard-grid" style={{ marginTop: 0, flex: 1, minHeight: 0 }}>
        <DailyPositionCategoryPanel categoryData={categoryData} onCategoryClick={onCategoryClick} />
        <DailyPositionHighPriorityFaultsPanel
          userDivision={userDivision}
          showToast={showToast}
          queries={queries}
          onCategoryClick={onCategoryClick}
        />
      </section>
    </div>
  );
}

// KPI Card Component
function KpiCard({ kpi, index, onCategoryClick }: { kpi: KpiMetric; index: number; onCategoryClick?: (categoryName: string) => void }) {
  const Icon = toneIcons[kpi.tone];
  const { setActiveNav, setAssetStatusFilter, setDpHistoryFilter, role } = useAppStore();

  const handleClick = () => {
    if (kpi.label === "Total Assets") {
      useAppStore.setState({ activeNav: "Assets", assetStatusFilter: "" });
    } else if (kpi.label === "Operational Assets") {
      useAppStore.setState({ activeNav: "Assets", assetStatusFilter: "OPERATIONAL" });
    } else if (kpi.label === "Under Maintenance") {
      useAppStore.setState({ activeNav: "Assets", assetStatusFilter: "UNDER_MAINTENANCE" });
    } else if (kpi.id === "activeFaults" || kpi.label === "Active Faults") {
      onCategoryClick?.("Active Faults");
    } else if (kpi.id === "wifiFaults" || kpi.label === "Wi-Fi Faults") {
      onCategoryClick?.("Wi-Fi");
    } else if (kpi.id === "resolvedToday" || kpi.label === "Resolved Faults" || kpi.label === "Faults Resolved Today" || kpi.label === "Resolved Today") {
      onCategoryClick?.("Resolved Today");
    } else if (kpi.id === "faultsToday" || kpi.label === "Faults Today" || kpi.id === "reportedToday" || kpi.label === "Reported Today" || kpi.label === "Rectified Today") {
      onCategoryClick?.("Faults Today");
    }
  };

  return (
    <motion.button
      className={`kpi-card ${kpi.tone}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={handleClick}
      transition={{ delay: index * 0.04 }}
      type="button"
    >
      <div className="kpi-top">
        <div className={`metric-icon ${kpi.tone}`}>
          <Icon size={24} />
        </div>
        <div>
          <p>{kpi.label}</p>
          <strong>{kpi.value}</strong>
          <span>{kpi.trend ?? kpi.detail}</span>
        </div>
      </div>
    </motion.button>
  );
}

// Chart Panel Component
function ChartPanel({
  className = "",
  title,
  total,
  metrics,
  openPanel
}: {
  className?: string;
  title: string;
  total: string;
  metrics: Array<CategoryMetric | SeverityMetric>;
  openPanel: () => void;
}) {
  const sum = metrics.reduce((acc, curr) => acc + (curr.value || 0), 0);
  const hasData = sum > 0;
  const chartData = hasData ? metrics : [{ name: "No Data", value: 1, color: "#f1f5f9" }];

  return (
    <article className={`panel chart-panel ${className}`}>
      <h3>{title}</h3>
      <div className="donut-layout">
        <div className="donut-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                innerRadius="52%"
                outerRadius="82%"
                paddingAngle={hasData ? 1 : 0}
              >
                {chartData.map((entry, idx) => (
                  <Cell key={entry.name || idx} fill={entry.color} />
                ))}
              </Pie>
              {hasData && <Tooltip />}
            </PieChart>
          </ResponsiveContainer>
          <div className="donut-center">
            <strong>{total}</strong>
            <span>Total</span>
          </div>
        </div>
        <ul className="legend-list">
          {metrics.map((metric) => (
            <li key={metric.name}>
              <i style={{ background: hasData ? metric.color : "#cbd5e1" }} />
              <span>{metric.name}</span>
              <strong>{metric.value}</strong>
              <em>({metric.percent})</em>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

// Status Panel Component
function StatusPanel({
  statuses
}: {
  statuses: Array<{ status: string; count: number; percent: string; color: string }>;
}) {
  return (
    <article className="panel status-panel">
      <div className="panel-head">
        <h3>Asset Status Summary</h3>
      </div>
      {statuses.map((status) => (
        <div className="status-row" key={status.status}>
          <div>
            <span>{status.status}</span>
            <strong>{status.count.toLocaleString()} <em>({status.percent})</em></strong>
          </div>
          <div className="bar-track">
            <i style={{ width: status.percent, background: status.color }} />
          </div>
        </div>
      ))}
    </article>
  );
}

// Helper functions for summary table details modal
const summaryAssetLabel = (asset: any) => {
  const parts = [
    asset.telecomAsset || asset.category || "Asset",
    asset.equipmentName,
    asset.rdsoSpec || asset.serialNo,
    asset.stationCode,
  ].filter(Boolean);
  return parts.join(" / ");
};

const summaryRecordAssetLabel = (record: any, assets: any[]) => {
  const asset = (assets || []).find((item: any) => item.id === record.assetId);
  return asset ? summaryAssetLabel(asset) : (record.telecomAsset || "-");
};

const summaryHumanizeFieldName = (key: string) => {
  const labels: Record<string, string> = {
    actionType: "Action",
    checkedAt: "Checked At",
    icmsEntryNo: "ICMS Entry No./Docket No.",
    stationCode: "Station",
    assetId: "Linked Asset",
    majorSection: "Major Section",
    failureTime: "Failure Time",
    rectificationTime: "Rectification Time",
    durationText: "Duration of Failure",
  };
  if (labels[key]) return labels[key];
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, char => char.toUpperCase())
    .trim();
};

const summaryDisplayValue = (value: any, isAllOk = false) => {
  if (value === undefined || value === null || value === "") return isAllOk ? "" : "-";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : formatDateTime24(date);
  }
  return String(value);
};

function DailyPositionDetailsModal({
  detailsRecord,
  detailsTitle,
  selectedDate,
  formatDate,
  onClose,
  role,
  queries,
}: {
  detailsRecord: any[];
  detailsTitle: string;
  selectedDate: string;
  formatDate: (dateStr: string) => string;
  onClose: () => void;
  role: string;
  queries?: any;
}) {
  const isSuperAdmin = role === "SUPER_ADMIN" || role === "ALL_DIVISION_VIEWER";

  return (
    <div className="modal-backdrop dp-modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="modal-card dp-details-modal" onClick={event => event.stopPropagation()} style={{ color: "initial", maxWidth: "600px", width: "90%", maxHeight: "85vh", display: "flex", flexDirection: "column", borderRadius: "12px", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)", overflow: "hidden" }}>
        <button className="modal-close" type="button" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>

        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--line)", background: "#fff" }}>
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "var(--navy)" }}>
            {detailsTitle || detailsRecord[0]?.formType || "Daily Position"}
          </h2>
        </div>

        {/* Content list */}
        <div className="no-scrollbar" style={{ overflowY: "auto", padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: "16px", flex: 1, background: "#fff" }}>
          {detailsRecord.filter((e: any) => e.status !== "DRAFT").map((entry: any, index: number) => {
            const isAllOk = entry.reason === "All OK" || (entry.formData && entry.formData.actionType === "OK");
            const effectiveStatus = entry.positionStatus || entry.status;
            const isFault = effectiveStatus !== "OPERATIONAL" && effectiveStatus !== "RECTIFIED" && !isAllOk;
            const showRemarks = entry.remarks && entry.remarks.trim() !== (entry.reason || "").trim();
            const locationKeys = ["majorSection", "section", "stationCode", "stationCodeOther", "exchangeName", "videoPhoneLocation", "pfNo", "lineNo", "unitNo", "location", "siteName", "kmNo", "sectionYard", "faultyAccessPointLocation"];
            const locationItems = Object.entries(entry.formData || {})
              .filter(([key]) => locationKeys.includes(key))
              .map(([key, value]) => {
                let displayVal = value;
                if (value === "Other" || value === "Others") {
                  displayVal = entry.formData?.[`${key}Other`] || entry.formData?.[`${key}Others`] || value;
                }
                return {
                  key,
                  label: summaryHumanizeFieldName(key),
                  value: summaryDisplayValue(displayVal, isAllOk)
                };
              });

            const howKeys = ["natureOfFault", "nameOfFault", "videoClarity", "audioClarity", "cableCutByWhom", "cableType", "systemType"];
            const howItems = Object.entries(entry.formData || {})
              .filter(([key]) => howKeys.includes(key))
              .map(([key, value]) => {
                let displayVal = value;
                if (value === "Other" || value === "Others") {
                  displayVal = entry.formData?.[`${key}Other`] || entry.formData?.[`${key}Others`] || value;
                }
                return {
                  key,
                  label: summaryHumanizeFieldName(key),
                  value: summaryDisplayValue(displayVal, isAllOk)
                };
              });

            return (
              <Fragment key={entry.id}>
                <div style={{
                  background: "#fff",
                  position: "relative",
                  padding: "12px 0",
                }}>
                 {/* Subtitle / Header inside card */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", gap: "10px" }}>
                  <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 750, color: "var(--navy)", flex: 1, minWidth: 0 }}>
                    {isSuperAdmin
                      ? `${entry.division} / ${entry.stationCode || entry.stationName || entry.section || (isAllOk ? "" : "-")}`
                      : (entry.stationCode || entry.stationName || entry.section || (isAllOk ? "" : "-"))
                    }
                  </h4>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                    {detailsRecord.length > 1 && (
                      <span style={{
                        fontSize: "10px", fontWeight: 700, color: "var(--blue)",
                        background: "var(--blue-soft)", padding: "2px 8px", borderRadius: "12px"
                      }}>
                        Entry #{index + 1}
                      </span>
                    )}
                    <span style={{
                      display: "inline-flex", alignItems: "center",
                      padding: "3px 9px", borderRadius: "20px", fontSize: "10px", fontWeight: 700,
                      color: "#fff",
                      background: isFault ? "var(--red)" : "var(--green)"
                    }}>
                      {isFault ? effectiveStatus : (effectiveStatus === "RECTIFIED" ? "RECTIFIED" : "OPERATIONAL")}
                    </span>
                  </div>
                </div>

                {/* Location Details (Priority 1) */}
                {locationItems.length > 0 && (
                  <div style={{
                    marginBottom: "14px",
                    borderBottom: (entry.failureTime || howItems.length > 0 || entry.remarks || entry.reason) ? "1px dashed var(--line)" : "none",
                    paddingBottom: (entry.failureTime || howItems.length > 0 || entry.remarks || entry.reason) ? "14px" : "0"
                  }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px 16px" }}>
                      {locationItems.map(item => (
                        <div key={item.key}>
                          <span style={{ display: "block", fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>{item.label}</span>
                          <strong style={{ fontSize: "12px", color: "var(--navy)", fontWeight: 700 }}>{item.value}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Main Information: Fault Timing (Priority 2) */}
                {entry.failureTime && (
                  <div style={{
                    marginBottom: "14px",
                    borderBottom: (howItems.length > 0 || entry.remarks || entry.reason) ? "1px dashed var(--line)" : "none",
                    paddingBottom: (howItems.length > 0 || entry.remarks || entry.reason) ? "14px" : "0"
                  }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px 16px" }}>
                      <div>
                        <span style={{ display: "block", fontSize: "11px", color: "#e15241", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>Failure Time</span>
                        <strong style={{ fontSize: "12px", color: "var(--navy)", fontWeight: 700 }}>{formatDateTime24(entry.failureTime)}</strong>
                      </div>
                      <div>
                        <span style={{ display: "block", fontSize: "11px", color: "#2aa667", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>Rectification Time</span>
                        <strong style={{ fontSize: "12px", color: "var(--navy)", fontWeight: 700 }}>{formatDateTime24(entry.rectificationTime)}</strong>
                      </div>
                      {entry.durationText && (
                        <div>
                          <span style={{ display: "block", fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>Duration of Failure</span>
                          <strong style={{ fontSize: "12px", color: "var(--navy)", fontWeight: 700 }}>{entry.durationText}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Nature of Fault (Priority 3) */}
                {howItems.length > 0 && (
                  <div style={{
                    marginBottom: "14px",
                    borderBottom: (entry.remarks || entry.reason) ? "1px dashed var(--line)" : "none",
                    paddingBottom: (entry.remarks || entry.reason) ? "14px" : "0"
                  }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px 16px" }}>
                      {howItems.map(item => (
                        <div key={item.key}>
                          <span style={{ display: "block", fontSize: "11px", color: "#8c5d0a", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>{item.label}</span>
                          <strong style={{ fontSize: "12px", color: "#8c5d0a", fontWeight: 700 }}>{item.value}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Remarks & Reason block (Priority 4 - Shifted to Bottom) */}
                {isFault ? (
                  <div style={{ marginBottom: "14px" }}>
                    <span style={{ display: "block", fontSize: "11px", color: "#002d62", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px", marginBottom: "4px" }}>
                      Reason / Remarks
                    </span>
                    <div style={{ fontSize: "12px", color: "#002d62", lineHeight: "1.5" }}>
                      <strong style={{ fontWeight: 700 }}>
                        {entry.reason || entry.remarks || "No reason specified"}
                        {showRemarks && ` · ${entry.remarks}`}
                      </strong>
                    </div>
                  </div>
                ) : (
                  (entry.remarks || entry.reason) && (
                    <div style={{ marginBottom: "14px" }}>
                      <span style={{ display: "block", fontSize: "11px", color: "#002d62", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px", marginBottom: "4px" }}>
                        Remarks
                      </span>
                      <div style={{ fontSize: "12px", color: "#002d62", lineHeight: "1.5" }}>
                        <strong style={{ fontWeight: 700 }}>{entry.remarks || entry.reason}</strong>
                      </div>
                    </div>
                  )
                )}

                {/* Footer Metadata */}
                <div style={{
                  borderTop: "1px solid #f1f5f9",
                  paddingTop: "10px",
                  marginTop: "12px",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "6px 12px",
                  fontSize: "11px",
                  color: "var(--muted)"
                }}>
                  <span>Submitted: {formatDateTime24(entry.createdAt)}</span>
                  {isSuperAdmin && entry.createdByUsername && (
                    <span>• User: {entry.createdByUsername}</span>
                  )}
                </div>
              </div>
              {index < detailsRecord.filter((e: any) => e.status !== "DRAFT").length - 1 && (
                <div style={{ margin: "20px 0 28px", display: "flex", justifyContent: "center" }}>
                  <svg viewBox="0 0 1000 8" preserveAspectRatio="none" style={{ width: "100%", height: "4px", display: "block" }}>
                    <defs>
                      <linearGradient id={`taperedGrad-${entry.id || index}`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#334155" stopOpacity={0} />
                        <stop offset="15%" stopColor="#1e293b" stopOpacity={0.35} />
                        <stop offset="50%" stopColor="#0f172a" stopOpacity={0.85} />
                        <stop offset="85%" stopColor="#1e293b" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#334155" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <path d="M 0 4 Q 500 0 1000 4 Q 500 8 0 4 Z" fill={`url(#taperedGrad-${entry.id || index})`} />
                  </svg>
                </div>
              )}
            </Fragment>
          );
        })}
        </div>
      </div>
    </div>
  );
}

// Daily Position Summary Table Component
function DailyPositionSummaryTable({
  user,
  queries,
  showToast,
  forceSuperAdminGrid
}: {
  user: any;
  queries?: any;
  showToast: (msg: string) => void;
  forceSuperAdminGrid?: boolean;
}) {
  const { user: storeUser } = useAppStore();
  const currentUser = user || storeUser;
  const isSuperAdmin = forceSuperAdminGrid || currentUser?.role === "SUPER_ADMIN" || currentUser?.role === "ALL_DIVISION_VIEWER";
  const userDivision = currentUser?.division || "Bilaspur";

  const DIVISIONS = ["Bilaspur", "Raipur", "Nagpur"];
  const todayStr = toDateValue();
  const morningDefaultDate = shiftDateText(todayStr, -1);
  const [selectedDate, setSelectedDate] = useState(morningDefaultDate);
  const [selectedDivision, setSelectedDivision] = useState(userDivision);
  const [positionType, setPositionType] = useState<"MORNING" | "CURRENT">("MORNING");

  useEffect(() => {
    setSelectedDivision(userDivision);
  }, [userDivision]);
  const [detailsRecord, setDetailsRecord] = useState<any[] | null>(null);
  const [detailsTitle, setDetailsTitle] = useState("");
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const maxPickerDate = positionType === "MORNING" ? morningDefaultDate : todayStr;
  const selectPositionType = (nextType: "MORNING" | "CURRENT") => {
    setPositionType(nextType);
    setSelectedDate(nextType === "MORNING" ? morningDefaultDate : todayStr);
  };

  // ── Single-division query (non-super-admin) ──────────────────────────
  const dpQuery = useQuery({
    queryKey: ["dp-summary-table", selectedDivision, selectedDate, positionType],
    queryFn: () => api.dailyPosition.positionSummary({ division: selectedDivision, date: selectedDate, positionType }),
    enabled: !isSuperAdmin && !!selectedDivision,
    staleTime: 5 * 60 * 1000,
    refetchInterval: positionType === "CURRENT" ? 60_000 : false,
  });

  // ── Three-division queries (super-admin only) ─────────────────────────
  const bspQuery = useQuery({
    queryKey: ["dp-summary-table", "Bilaspur", selectedDate, positionType],
    queryFn: () => api.dailyPosition.positionSummary({ division: "Bilaspur", date: selectedDate, positionType }),
    enabled: isSuperAdmin,
    staleTime: 5 * 60 * 1000,
    refetchInterval: positionType === "CURRENT" ? 60_000 : false,
  });
  const rprQuery = useQuery({
    queryKey: ["dp-summary-table", "Raipur", selectedDate, positionType],
    queryFn: () => api.dailyPosition.positionSummary({ division: "Raipur", date: selectedDate, positionType }),
    enabled: isSuperAdmin,
    staleTime: 5 * 60 * 1000,
    refetchInterval: positionType === "CURRENT" ? 60_000 : false,
  });
  const ngpQuery = useQuery({
    queryKey: ["dp-summary-table", "Nagpur", selectedDate, positionType],
    queryFn: () => api.dailyPosition.positionSummary({ division: "Nagpur", date: selectedDate, positionType }),
    enabled: isSuperAdmin,
    staleTime: 5 * 60 * 1000,
    refetchInterval: positionType === "CURRENT" ? 60_000 : false,
  });

  const isLoading = isSuperAdmin
    ? (bspQuery.isLoading || rprQuery.isLoading || ngpQuery.isLoading)
    : dpQuery.isLoading;
  const isFetching = isSuperAdmin
    ? (bspQuery.isFetching || rprQuery.isFetching || ngpQuery.isFetching)
    : dpQuery.isFetching;
  const summaryError = isSuperAdmin
    ? (bspQuery.error || rprQuery.error || ngpQuery.error)
    : dpQuery.error;

  // Build entry map helper
  const buildEntriesMap = (rawEntries: any[]): Record<string, any[]> => {
    const map: Record<string, any[]> = {};
    for (const entry of rawEntries) {
      const key = entry.formType || entry.category || "";
      if (key) {
        if (!map[key]) map[key] = [];
        map[key].push(entry);
      }
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }
    return map;
  };

  const entries: any[] = isFetching ? [] : (dpQuery.data?.data?.records || []);
  const entriesByForm = useMemo(() => buildEntriesMap(entries), [entries]);

  const bspEntries: any[] = isFetching ? [] : (bspQuery.data?.data?.records || []);
  const rprEntries: any[] = isFetching ? [] : (rprQuery.data?.data?.records || []);
  const ngpEntries: any[] = isFetching ? [] : (ngpQuery.data?.data?.records || []);
  const bspMap = useMemo(() => buildEntriesMap(bspEntries), [bspEntries]);
  const rprMap = useMemo(() => buildEntriesMap(rprEntries), [rprEntries]);
  const ngpMap = useMemo(() => buildEntriesMap(ngpEntries), [ngpEntries]);
  const divisionMaps: Record<string, Record<string, any[]>> = { Bilaspur: bspMap, Raipur: rprMap, Nagpur: ngpMap };

  const displayedForms = useMemo(() => {
    const base = DAILY_POSITION_FORMS.filter(
      form => form.category !== "Daily Log" && form.name !== "Daily Position Log" && form.name !== "Wi-Fi"
    );
    return base;
  }, []);

  const handleRowClick = (form: typeof DAILY_POSITION_FORMS[0]) => {
    const formEntries = entriesByForm[form.name] || entriesByForm[form.systemCode] || [];
    if (formEntries.length > 0) {
      setDetailsRecord(formEntries);
      setDetailsTitle(form.name);
    } else {
      showToast(`No entry submitted for "${form.name}" on this date.`);
    }
  };

  const handleCellClick = (division: string, form: typeof DAILY_POSITION_FORMS[0]) => {
    const map = divisionMaps[division] || {};
    const fe = map[form.name] || map[form.systemCode] || [];
    if (fe.length > 0) {
      setDetailsRecord(fe);
      setDetailsTitle(`${form.name} — ${division}`);
    } else {
      showToast(`No entry for "${form.name}" in ${division} on this date.`);
    }
  };

  const formatDate = (dateStr: string) => {
    return formatDate24(dateStr);
  };

  const getStatusFromMap = (map: Record<string, any[]>, form: typeof DAILY_POSITION_FORMS[0]): "FAULT" | "RECTIFIED" | "NORMAL" | null => {
    const fe = map[form.name] || map[form.systemCode] || [];
    const activeEntries = fe.filter((e: any) => e.status !== "DRAFT");
    if (activeEntries.length === 0) return null;
    const hasFault = activeEntries.some((e: any) => {
      const s = (e.positionStatus || e.status || "").toUpperCase();
      const isAllOk = e.reason === "All OK" || (e.formData && e.formData.actionType === "OK");
      return s !== "OPERATIONAL" && s !== "RECTIFIED" && !isAllOk;
    });
    if (hasFault) return "FAULT";
    const hasRectified = activeEntries.some((e: any) => {
      const isAllOk = e.reason === "All OK" || (e.formData && e.formData.actionType === "OK");
      return !isAllOk && (e.positionStatus || e.status || "").toUpperCase() === "RECTIFIED";
    });
    return hasRectified ? "RECTIFIED" : "NORMAL";
  };

  // Group forms by category and extract active faults to a top-level section
  const grouped = useMemo(() => {
    const activeFaults: typeof DAILY_POSITION_FORMS = [];
    const normalCats: Record<string, typeof DAILY_POSITION_FORMS> = {};
    let wifiForm: typeof DAILY_POSITION_FORMS[0] | null = null;

    for (const form of displayedForms) {
      if (form.name === "Wi-Fi") {
        wifiForm = form;
        continue;
      }

      let hasFault = false;
      if (isSuperAdmin) {
        hasFault = getStatusFromMap(bspMap, form) === "FAULT" || getStatusFromMap(rprMap, form) === "FAULT" || getStatusFromMap(ngpMap, form) === "FAULT";
      } else {
        hasFault = getStatusFromMap(entriesByForm, form) === "FAULT";
      }

      if (hasFault) {
        activeFaults.push(form);
      } else {
        if (!normalCats[form.category]) normalCats[form.category] = [];
        normalCats[form.category].push(form);
      }
    }

    const result: Record<string, typeof DAILY_POSITION_FORMS> = {};
    if (activeFaults.length > 0) {
      result["ACTIVE FAULTS"] = activeFaults;
    }

    for (const [cat, forms] of Object.entries(normalCats)) {
      if (forms.length > 0) {
        result[cat] = forms;
      }
    }

    if (wifiForm) {
      result["Wi-Fi"] = [wifiForm];
    }

    return result;
  }, [displayedForms, isSuperAdmin, bspMap, rprMap, ngpMap, entriesByForm]);

  const getStatus = (form: typeof DAILY_POSITION_FORMS[0]) => getStatusFromMap(entriesByForm, form);

  const getFaultCount = (map: Record<string, any[]>, form: typeof DAILY_POSITION_FORMS[0]) => {
    const formEntries = map[form.name] || map[form.systemCode] || [];
    const activeEntries = formEntries.filter((e: any) => e.status !== "DRAFT");
    if (activeEntries.length === 0) return "-";

    let totalFaults = 0;
    let hasFaultyState = false;

    for (const entry of activeEntries) {
      const status = (entry.positionStatus || entry.status || "").toUpperCase();
      const isAllOk = entry.reason === "All OK" || (entry.formData && entry.formData.actionType === "OK");
      if (status !== "OPERATIONAL" && status !== "RECTIFIED" && !isAllOk) {
        hasFaultyState = true;
        const fd = entry.formData || {};
        switch (form.name) {
          case "Temporary Joints":
            totalFaults += Number(fd.balanceTemporaryJoints ?? fd.temporaryJointsCount ?? 1);
            break;
          case "Low Insulation":
            totalFaults += Number(fd.balanceInsulationFaults ?? fd.totalInsulationFaults ?? 1);
            break;
          case "CGDB":
            totalFaults += Number(fd.faultyGuidanceBoards ?? 1);
            break;
          case "TIB":
            totalFaults += Number(fd.faultyBoards ?? 1);
            break;
          case "Walkie-Talkie Repairing":
            totalFaults += Number(fd.pendingRepair ?? fd.openingDefective ?? 1);
            break;
          case "CCTV Monitoring":
          case "CCTV Maintenance":
            const cctvVal = fd.totalNotWorkingCctvLoc;
            if (typeof cctvVal === "number") {
              totalFaults += cctvVal;
            } else if (typeof cctvVal === "string") {
              const match = cctvVal.match(/(?:not\s+working|failed|defective|faulty)?\s*:?\s*(\d+)\s*(?:\(|$)/i);
              if (match) {
                totalFaults += Number(match[1]);
              } else {
                const anyNum = cctvVal.match(/\d+/);
                totalFaults += anyNum ? Number(anyNum[0]) : 1;
              }
            } else {
              totalFaults += 1;
            }
            break;
          default:
            totalFaults += 1;
            break;
        }
      }
    }

    if (!hasFaultyState) return "-";
    return totalFaults > 0 ? totalFaults : "-";
  };

  const getRemark = (map: Record<string, any[]>, form: typeof DAILY_POSITION_FORMS[0]) => {
    const formEntries = map[form.name] || map[form.systemCode] || [];
    const activeEntries = formEntries.filter((e: any) => e.status !== "DRAFT");
    if (activeEntries.length === 0) return "";

    const status = getStatusFromMap(map, form);
    if (status === "FAULT") {
      const faultRemarks = activeEntries
        .filter((e: any) => {
          const s = (e.positionStatus || e.status || "").toUpperCase();
          const isAllOk = e.reason === "All OK" || (e.formData && e.formData.actionType === "OK");
          return s !== "OPERATIONAL" && s !== "RECTIFIED" && !isAllOk;
        })
        .map((entry: any) => {
          const failureText = entry.failureTime ? formatDateTime24(entry.failureTime) : "";
          let locLabel = "Station";
          let locValue = "";
          const codeOrName = entry.stationCode || entry.stationName || entry.formData?.stationCode || entry.formData?.stationName;
          if (codeOrName) {
            locLabel = "St. Code";
            const sList = queries?.stationsQuery?.data?.data || [];
            const found = sList.find(
              (s: any) =>
                String(s.code).toLowerCase() === codeOrName.toLowerCase() ||
                String(s.name).toLowerCase() === codeOrName.toLowerCase()
            );
            if (found) {
              locValue = found.code;
            } else {
              locValue = codeOrName;
            }
          } else if (entry.section || entry.formData?.section) {
            locLabel = "Section";
            locValue = entry.section || entry.formData?.section;
          } else if (entry.location || entry.formData?.location) {
            locLabel = "Location";
            locValue = entry.location || entry.formData?.location;
          }

          const rawRemark = entry.reason || entry.remarks || entry.logDetails || entry.descriptionOfCase || "";
          let truncatedRemark = "";
          if (rawRemark) {
            const words = rawRemark.trim().split(/\s+/);
            if (words.length <= 5) {
              truncatedRemark = rawRemark;
            } else {
              truncatedRemark = words.slice(0, 5).join(" ") + "...";
            }
          }
          const parts = [];
          if (failureText) parts.push(`Ft.: ${failureText}`);
          if (locValue) parts.push(`${locLabel} : ${locValue}`);
          if (truncatedRemark) parts.push(`Remark : ${truncatedRemark}`);
          return parts.join(" ");
        })
        .filter(Boolean);
      return Array.from(new Set(faultRemarks)).join(" | ");
    } else if (status === "RECTIFIED") {
      const rectifiedEntry = activeEntries
        .filter((entry: any) => (entry.positionStatus || entry.status) === "RECTIFIED")
        .sort((a: any, b: any) => new Date(b.rectificationTime || 0).getTime() - new Date(a.rectificationTime || 0).getTime())[0];
      return rectifiedEntry
        ? `Rectified ${rectifiedEntry.rectificationTime ? formatDateTime24(rectifiedEntry.rectificationTime) : ""}${rectifiedEntry.remarks ? ` - ${rectifiedEntry.remarks}` : ""}`.trim()
        : "Rectified";
    } else if (status === "NORMAL") {
      const remarks = activeEntries
        .map((entry: any) => entry.reason || entry.remarks || entry.logDetails || entry.descriptionOfCase || "")
        .filter(r => r && r !== "All OK" && r !== "No fault reported.");
      if (remarks.length > 0) {
        return Array.from(new Set(remarks)).join(" | ");
      }
      return "";
    }
    return "";
  };

  const divisionColors: Record<string, string> = { Bilaspur: "#3b82f6", Raipur: "#ef4444", Nagpur: "#10b981" };

  return (
    <>
      {isSuperAdmin ? (
        <DailyPositionSummaryTableSuperAdmin
          grouped={grouped}
          displayedForms={displayedForms}
          DIVISIONS={DIVISIONS}
          divisionMaps={divisionMaps}
          divisionColors={divisionColors}
          selectedDate={selectedDate}
          todayStr={todayStr}
          formatDate={formatDate}
          getStatusFromMap={getStatusFromMap}
          handleCellClick={handleCellClick}
          isLoading={isLoading}
          setSelectedDate={setSelectedDate}
          detailsRecord={detailsRecord}
          setDetailsRecord={setDetailsRecord}
          detailsTitle={detailsTitle}
          queries={queries}
          getRemark={getRemark}
          onPrintClick={() => setIsPrintOpen(true)}
          positionType={positionType}
          setPositionType={selectPositionType}
          maxPickerDate={maxPickerDate}
          isFetching={isFetching}
          summaryError={summaryError}
        />
      ) : (
        <article className="panel list-panel" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", flex: 1, minHeight: 0, height: "100%" }}>
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "flex-start", justifyContent: "space-between",
            padding: "16px 20px 12px", borderBottom: "1px solid var(--line)"
          }}>
            <div>
              <div className="position-summary-title-row">
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--navy)" }}>
                  Position Summary
                </h3>
                <input
                  type="date"
                  value={selectedDate}
                  max={maxPickerDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  onClick={e => { try { e.currentTarget.showPicker(); } catch (err) { } }}
                  className="position-date-picker"
                />
              </div>
              <div className="position-tabs" role="tablist" aria-label="Position period">
                <button type="button" className={positionType === "MORNING" ? "active" : ""} onClick={() => selectPositionType("MORNING")}>Morning Position</button>
                <button type="button" className={positionType === "CURRENT" ? "active" : ""} onClick={() => selectPositionType("CURRENT")}>Current Position</button>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
              <button
                onClick={() => setIsPrintOpen(true)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  border: "1px solid var(--blue)",
                  borderRadius: 8,
                  padding: "6px 12px",
                  fontSize: 12,
                  color: "#fff",
                  background: "var(--blue)",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "background 0.2s"
                }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--blue-hover)"}
                onMouseLeave={e => e.currentTarget.style.background = "var(--blue)"}
              >
                <Printer size={14} /> Print Summary
              </button>
              {isSuperAdmin && (
                <ClearableSelect
                  value={selectedDivision}
                  onChange={setSelectedDivision}
                  style={{
                    border: "1px solid var(--line)", borderRadius: 8, padding: "6px 10px",
                    fontSize: 13, color: "var(--navy)", background: "#fff", cursor: "pointer",
                    fontFamily: "inherit"
                  }}
                >
                  <option value="">Select Division</option>
                  {DIVISIONS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </ClearableSelect>
              )}
              {!isSuperAdmin && (
                <span style={{
                  border: "1px solid var(--blue-soft)", borderRadius: 8, padding: "6px 10px",
                  fontSize: 12, color: "var(--blue)", background: "var(--blue-soft)", fontWeight: 600
                }}>
                  📍 {userDivision}
                </span>
              )}
            </div>
          </div>

          {/* Loading state */}
          {dpQuery.isLoading && (
            <div style={{ padding: "48px 32px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "var(--muted)", fontSize: 13 }}>
              <div className="inline-spinner">
                <div className="loader-outer-ring"></div>
                <div className="loader-spinner-gradient"></div>
                <div className="loader-clock-hand-minute"></div>
                <div className="loader-clock-hand-hour"></div>
                <div className="loader-center-dot"></div>
              </div>
              <span>Loading summary…</span>
            </div>
          )}

          {summaryError && (
            <div className="position-summary-error">Unable to load this position. Please retry or check the backend connection.</div>
          )}

          {!dpQuery.isLoading && (
            <>
              {/* Table header */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 100px 80px 1.5fr 24px",
                padding: "8px 20px",
                background: "var(--page)",
                borderBottom: "1px solid var(--line)",
                gap: 12
              }}>
                {["NAME OF CIRCUIT", "STATUS", "FAULTS", "KEY REMARK", ""].map((col, i) => (
                  <span key={i} style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    {col}
                  </span>
                ))}
              </div>

              {/* Grouped rows */}
              <div className="no-scrollbar" style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
                {Object.entries(grouped).map(([category, forms]) => (
                  <div key={category}>
                    {/* Category divider */}
                    {category !== "Wi-Fi" && (
                      <div style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "6px 20px 5px", background: "#f4f7fb",
                        borderBottom: "1px solid var(--line)"
                      }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          {category}
                        </span>
                      </div>
                    )}

                    {/* Form rows */}
                    {forms.map(form => {
                      const status = getStatus(form);
                      const remark = getRemark(entriesByForm, form);
                      const isFault = status === "FAULT";
                      const isRectified = status === "RECTIFIED";
                      const noData = status === null;
                      const faultCount = isFault ? getFaultCount(entriesByForm, form) : "-";

                      return (
                        <div
                          key={form.systemCode}
                          onClick={() => handleRowClick(form)}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1.2fr 100px 80px 1.5fr 24px",
                            alignItems: "center",
                            padding: "0 20px",
                            height: 44,
                            gap: 12,
                            cursor: "pointer",
                            borderLeft: `3px solid ${isFault ? "var(--red)" : isRectified ? "var(--blue)" : noData ? "var(--line)" : "var(--green)"}`,
                            background: isFault ? "rgba(255,51,40,0.04)" : "#fff",
                            borderBottom: "1px solid var(--line)",
                            transition: "background 0.15s"
                          }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.background = "var(--blue-soft)";
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.background = isFault ? "rgba(255,51,40,0.04)" : "#fff";
                          }}
                        >
                          {/* Form name */}
                          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--navy)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {form.name}
                          </span>

                          {/* Status pill */}
                          <span>
                            {noData ? (
                              <span style={{ fontSize: 11, color: "var(--muted)" }}>No entry</span>
                            ) : (
                              <span style={{
                                display: "inline-flex", alignItems: "center", gap: 4,
                                padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                                color: "#fff",
                                background: isFault ? "var(--red)" : isRectified ? "var(--blue)" : "var(--green)"
                              }}>
                                {isFault ? "FAULTY" : isRectified ? "RECTIFIED" : "ALL OK"}
                              </span>
                            )}
                          </span>

                          {/* Faults count */}
                          <span style={{ fontSize: 13, fontWeight: 700, color: isFault ? "var(--red)" : "var(--muted)", paddingLeft: 4 }}>
                            {faultCount}
                          </span>

                          {/* Key remark */}
                          <span style={{
                            fontSize: 12, color: remark ? "var(--navy)" : "var(--muted)",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                          }}>
                            {remark || "—"}
                          </span>

                          {/* Chevron */}
                          <span style={{ fontSize: 16, color: "var(--line)", textAlign: "right" }}>›</span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div style={{
                padding: "8px 20px", background: "var(--page)",
                borderTop: "1px solid var(--line)",
                display: "flex", justifyContent: "space-between", alignItems: "center"
              }}>
                <div style={{ display: "flex", gap: 12 }}>
                  {[
                    { label: "ALL OK", color: "var(--green)", bg: "var(--green-soft)", count: displayedForms.filter(f => getStatus(f) === "NORMAL").length },
                    { label: "Fault", color: "var(--red)", bg: "var(--red-soft)", count: displayedForms.filter(f => getStatus(f) === "FAULT").length },
                    { label: "Rectified", color: "var(--blue)", bg: "var(--blue-soft)", count: displayedForms.filter(f => getStatus(f) === "RECTIFIED").length },
                    { label: "No Entry", color: "var(--muted)", bg: "var(--line)", count: displayedForms.filter(f => getStatus(f) === null).length },
                  ].map(s => (
                    <span key={s.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.color, display: "inline-block" }} />
                      <span style={{ color: s.color, fontWeight: 700 }}>{s.count}</span>
                      <span style={{ color: "var(--muted)" }}>{s.label}</span>
                    </span>
                  ))}
                </div>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>
                  {formatDate(selectedDate)} · {userDivision} Division
                </span>
              </div>
            </>
          )}

          {/* Details modal */}
          {detailsRecord && (
            <DailyPositionDetailsModal
              detailsRecord={detailsRecord}
              detailsTitle={detailsTitle}
              selectedDate={selectedDate}
              formatDate={formatDate}
              onClose={() => setDetailsRecord(null)}
              role={user?.role}
              queries={queries}
            />
          )}

        </article>
      )}

      {isPrintOpen && (
        <DailyPositionPrintView
          selectedDate={selectedDate}
          onClose={() => setIsPrintOpen(false)}
          filterDivision={isSuperAdmin ? undefined : userDivision}
          positionType={positionType}
        />
      )}
    </>
  );
}

function DailyPositionSummaryTableSuperAdmin({
  grouped, displayedForms, DIVISIONS, divisionMaps, divisionColors, selectedDate, todayStr, formatDate,
  getStatusFromMap, handleCellClick, isLoading, setSelectedDate, detailsRecord, setDetailsRecord, detailsTitle, queries,
  getRemark, onPrintClick, positionType, setPositionType, maxPickerDate, isFetching, summaryError,
}: any) {
  return (
    <article className="panel list-panel" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", flex: 1, minHeight: 0, height: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px 12px", borderBottom: "1px solid var(--line)" }}>
        <div>
          <div className="position-summary-title-row">
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--navy)" }}>Position Summary of</h3>
            <input
              type="date"
              value={selectedDate}
              max={maxPickerDate}
              onChange={(event: any) => setSelectedDate(event.target.value)}
              onClick={(event: any) => { try { event.currentTarget.showPicker(); } catch (err) { } }}
              className="position-date-picker"
            />
          </div>
          <div className="position-tabs" role="tablist" aria-label="Position period">
            <button type="button" className={positionType === "MORNING" ? "active" : ""} onClick={() => setPositionType("MORNING")}>Morning Position</button>
            <button type="button" className={positionType === "CURRENT" ? "active" : ""} onClick={() => setPositionType("CURRENT")}>Current Position</button>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            onClick={onPrintClick}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              border: "1px solid var(--blue)",
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 12,
              color: "#fff",
              background: "var(--blue)",
              fontWeight: 600,
              cursor: "pointer",
              transition: "background 0.2s"
            }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--blue-hover)"}
            onMouseLeave={e => e.currentTarget.style.background = "var(--blue)"}
          >
            <Printer size={14} /> Print Summary
          </button>
        </div>
      </div>

      {/* Division stat strip */}
      {!isLoading && (
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 280px 280px 280px", alignItems: "center", borderBottom: "1px solid var(--line)", gap: 8, padding: "10px 20px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, overflow: "hidden" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--navy)", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
              Division Status Summaries
            </span>
            <span style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
              Real-time status across SECR divisions
            </span>
          </div>
          {DIVISIONS.map((div: string) => {
            const map = divisionMaps[div] || {};
            const normal = displayedForms.filter((f: any) => getStatusFromMap(map, f) === "NORMAL").length;
            const fault = displayedForms.filter((f: any) => getStatusFromMap(map, f) === "FAULT").length;
            const rectified = displayedForms.filter((f: any) => getStatusFromMap(map, f) === "RECTIFIED").length;
            const noEntry = displayedForms.length - normal - fault - rectified;
            const color = divisionColors[div];
            return (
              <div key={div} style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "10px 8px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderTop: `3px solid ${color}`,
                borderRadius: "6px",
                boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
              }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--navy)", letterSpacing: "0.5px" }}>{div.toUpperCase()}</span>
              </div>
            );
          })}
        </div>
      )}

      {isLoading && (
        <div style={{ padding: "48px 32px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "var(--muted)", fontSize: 13 }}>
          <div className="inline-spinner">
            <div className="loader-outer-ring"></div>
            <div className="loader-spinner-gradient"></div>
            <div className="loader-clock-hand-minute"></div>
            <div className="loader-clock-hand-hour"></div>
            <div className="loader-center-dot"></div>
          </div>
          <span>Loading summary…</span>
        </div>
      )}

      {isFetching && !isLoading && <div className="position-refreshing">Refreshing selected position...</div>}
      {summaryError && <div className="position-summary-error">Unable to load this position. Please retry or check the backend connection.</div>}

      {!isLoading && (
        <>

          {/* Grouped rows */}
          <div className="no-scrollbar" style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
            {Object.entries(grouped).map(([category, forms]: [string, any]) => (
              <div key={category}>
                {category !== "ACTIVE FAULTS" && category !== "Wi-Fi" && (
                  <div style={{
                    padding: "6px 20px",
                    background: "#f4f7fb",
                    borderBottom: "1px solid var(--line)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6
                  }}>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>
                      {category}
                    </span>
                  </div>
                )}
                {forms.map((form: any) => (
                  <div key={form.systemCode} style={{
                    display: "grid",
                    gridTemplateColumns: "1.2fr 280px 280px 280px",
                    alignItems: "center",
                    padding: "6px 20px",
                    minHeight: 52,
                    gap: 8,
                    borderBottom: "1px solid var(--line)",
                    background: (category === "ACTIVE FAULTS" || DIVISIONS.some((div: string) => getStatusFromMap(divisionMaps[div], form) === "FAULT")) ? "rgba(239, 68, 68, 0.02)" : "#fff",
                    borderLeft: (category === "ACTIVE FAULTS" || DIVISIONS.some((div: string) => getStatusFromMap(divisionMaps[div], form) === "FAULT")) ? "3px solid var(--red)" : "none"
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--navy)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{form.name}</span>
                    {DIVISIONS.map((div: string) => {
                      const map = divisionMaps[div] || {};
                      const status = getStatusFromMap(map, form);

                      // Pre-calculate faultDetails if status is FAULT
                      let faultDetails: any[] = [];
                      if (status === "FAULT") {
                        const fe = map[form.name] || map[form.systemCode] || [];
                        const activeEntries = fe.filter((e: any) => e.status !== "DRAFT");
                        faultDetails = activeEntries
                          .filter((e: any) => {
                            const s = (e.positionStatus || e.status || "").toUpperCase();
                            const isAllOk = e.reason === "All OK" || (e.formData && e.formData.actionType === "OK");
                            return s !== "OPERATIONAL" && s !== "RECTIFIED" && !isAllOk;
                          })
                          .map((entry: any) => {
                            const failureText = entry.failureTime ? formatDateTime24(entry.failureTime) : "";

                            // Map location to name/code
                            let locLabel = "";
                            let locValue = "";
                            const codeOrName = entry.stationCode || entry.stationName || entry.formData?.stationCode || entry.formData?.stationName;

                            if (codeOrName) {
                              locLabel = "St. Code";
                              const sList = queries?.stationsQuery?.data?.data || [];
                              const found = sList.find(
                                (s: any) =>
                                  String(s.code).toLowerCase() === codeOrName.toLowerCase() ||
                                  String(s.name).toLowerCase() === codeOrName.toLowerCase()
                              );
                              if (found) {
                                locValue = found.code;
                              } else {
                                locValue = codeOrName;
                              }
                            } else if (entry.section || entry.formData?.section) {
                              locLabel = "Section";
                              locValue = entry.section || entry.formData?.section;
                            } else if (entry.formData?.majorSection) {
                              locLabel = "Section";
                              locValue = entry.formData.majorSection;
                            } else if (entry.formData?.exchangeName) {
                              locLabel = "Exchange";
                              locValue = entry.formData.exchangeName;
                            }

                            const rawRemark = entry.reason || entry.remarks || entry.logDetails || entry.descriptionOfCase || "";
                            let truncatedRemark = "";
                            if (rawRemark) {
                              const words = rawRemark.trim().split(/\s+/);
                              if (words.length <= 5) {
                                truncatedRemark = rawRemark;
                              } else {
                                truncatedRemark = words.slice(0, 5).join(" ") + "...";
                              }
                            }
                            return { failureText, locLabel, locValue, remark: truncatedRemark };
                          });
                      }

                      return (
                        <div key={div} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "4px 0", minWidth: 0 }}>
                          {status === null ? (
                            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 72, padding: "3px 0", fontSize: 11, color: "#94a3b8", border: "1.5px dashed #e2e8f0", borderRadius: 20 }}>—</span>
                          ) : (
                            <>
                              {status === "FAULT" ? (
                                <button type="button" onClick={() => handleCellClick(div, form)}
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "flex-start",
                                    justifyContent: "center",
                                    padding: "6px 12px",
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: "#ef4444",
                                    border: "2px dotted #ef4444",
                                    borderRadius: 8,
                                    cursor: "pointer",
                                    background: "#fff",
                                    textAlign: "left",
                                    lineHeight: "1.4",
                                    width: "90%",
                                    minWidth: "150px",
                                    boxShadow: "none",
                                    letterSpacing: "0.2px",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden"
                                  }}
                                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.88"; }}
                                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                                >
                                  {faultDetails.length === 0 ? (
                                    <div style={{ textAlign: "center", width: "100%", fontWeight: 800 }}>FAULT</div>
                                  ) : (
                                    faultDetails.map((detail: any, idx: number) => (
                                      <div key={idx} style={{
                                        width: "100%",
                                        display: "flex",
                                        flexDirection: "row",
                                        alignItems: "center",
                                        gap: "4px",
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis"
                                      }}>
                                        {detail.failureText && (
                                          <span style={{ whiteSpace: "nowrap" }}>
                                            <span>Ft.: </span>
                                            <span style={{ fontWeight: 800 }}>{detail.failureText}</span>
                                          </span>
                                        )}
                                        {detail.failureText && detail.locValue && (
                                          <span style={{ color: "#cbd5e1" }}>|</span>
                                        )}
                                        {detail.locValue && (
                                          <span style={{ whiteSpace: "nowrap" }}>
                                            <span>{detail.locLabel}: </span>
                                            <span style={{ fontWeight: 800 }}>{detail.locValue}</span>
                                          </span>
                                        )}
                                      </div>
                                    ))
                                  )}
                                </button>
                              ) : status === "RECTIFIED" ? (
                                <button type="button" onClick={() => handleCellClick(div, form)}
                                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4, minWidth: 82, padding: "3px 10px", fontSize: 11, fontWeight: 700, color: "#fff", border: "none", borderRadius: 20, cursor: "pointer", background: "var(--blue)", letterSpacing: "0.3px" }}
                                >
                                  RECTIFIED
                                </button>
                              ) : (
                                <button type="button" onClick={() => handleCellClick(div, form)}
                                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4, minWidth: 72, padding: "3px 10px", fontSize: 11, fontWeight: 700, color: "#fff", border: "none", borderRadius: 20, cursor: "pointer", background: "#22c55e", letterSpacing: "0.3px" }}
                                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.82"; }}
                                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                                >
                                  ALL OK
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ padding: "8px 20px", background: "var(--page)", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "flex-end" }}>
            <span style={{ fontSize: 11, color: "var(--muted)" }}>{formatDate(selectedDate)} · All Divisions</span>
          </div>
        </>
      )}

      {/* Details modal */}
      {detailsRecord && (
        <DailyPositionDetailsModal
          detailsRecord={detailsRecord}
          detailsTitle={detailsTitle}
          selectedDate={selectedDate}
          formatDate={formatDate}
          onClose={() => setDetailsRecord(null)}
          role="SUPER_ADMIN"
          queries={queries}
        />
      )}
    </article>
  );
}
function ActivityPanel({ items }: { items: ActivityItem[] }) {

  return (
    <article className="panel list-panel">
      <PanelTitle title="Activity Feed" />
      {items.map((item) => {
        const Icon = activityIcons[item.type as keyof typeof activityIcons] || FileText;
        return (
          <div className="activity-row" key={item.id}>
            <span className={`activity-icon ${item.type}`}><Icon size={17} /></span>
            <div>
              <strong>{item.title}</strong>
              <small>{item.detail}</small>
            </div>
            <time>{item.time}</time>
          </div>
        );
      })}
    </article>
  );
}

// Telecom Systems Coverage Component
function TelecomCoveragePanel({ queries }: { queries: any }) {
  const stations = queries.stationsQuery.data?.data || [];
  const loading = queries.stationsQuery.isLoading;

  if (loading) {
    return (
      <article className="panel distribution-panel" style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "center", alignItems: "center", minHeight: "430px" }}>
        <span style={{ color: "var(--muted)", fontSize: 13 }}>Loading coverage stats...</span>
      </article>
    );
  }

  const systems = [
    { key: "hasWifi", label: "Wi-Fi Coverage" },
    { key: "hasCctv", label: "CCTV Systems" },
    { key: "hasPaSystem", label: "PA System" },
    { key: "hasIpis", label: "IPIS (Passenger Info)" },
    { key: "hasUts", label: "UTS Ticketing" },
    { key: "hasPrs", label: "PRS Reservation" }
  ];

  const coverageStats = systems.map(sys => {
    const total = stations.length;
    if (total === 0) return { label: sys.label, percent: 0, count: 0 };
    const count = stations.filter((s: any) => s[sys.key]).length;
    const percent = Math.round((count / total) * 100);
    return { label: sys.label, percent, count };
  });

  return (
    <article className="panel distribution-panel" style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: "430px" }}>
      <h3 style={{ margin: "0 0 16px 0", fontSize: 17, borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>Telecom Systems Coverage</h3>
      <div style={{ flex: 1, overflowY: "auto", display: "grid", gap: 14 }}>
        {coverageStats.map(stat => (
          <div key={stat.label} style={{ display: "grid", gap: 5 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700 }}>
              <span style={{ color: "var(--navy)" }}>{stat.label}</span>
              <span style={{ color: "var(--blue)" }}>{stat.percent}% <span style={{ fontWeight: 500, color: "var(--muted)" }}>({stat.count}/{stations.length})</span></span>
            </div>
            <div style={{ height: 6, background: "#e2e8f0", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: `${stat.percent}%`, height: "100%", background: "var(--blue)", borderRadius: 3 }} />
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

// Division-wise Asset Health Component
function DivisionDistributionPanel({ queries }: { queries: any }) {
  const stations = queries.stationsQuery.data?.data || [];
  const assets = queries.assetsQuery.data?.data || [];
  const loading = queries.stationsQuery.isLoading || queries.assetsQuery.isLoading;

  if (loading) {
    return (
      <article className="panel distribution-panel" style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "center", alignItems: "center", minHeight: "430px" }}>
        <span style={{ color: "var(--muted)", fontSize: 13 }}>Loading division stats...</span>
      </article>
    );
  }

  const divisions = ["Raipur", "Bilaspur", "Nagpur"];
  const divisionStats = divisions.map(div => {
    const divStations = stations.filter((s: any) => normalizeDivision(s.division) === div);
    const stationCodes = new Set(divStations.map((s: any) => s.code.toUpperCase()));
    const divAssets = assets.filter((a: any) => a.stationCode && stationCodes.has(a.stationCode.toUpperCase()));

    const total = divAssets.length;
    const operational = divAssets.filter((a: any) => a.status === "OPERATIONAL").length;
    const percent = total > 0 ? Math.round((operational / total) * 100) : 0;
    return { name: div, total, operational, percent };
  });

  return (
    <article className="panel distribution-panel" style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: "430px" }}>
      <h3 style={{ margin: "0 0 16px 0", fontSize: 17, borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>Division-wise Asset Health</h3>
      <div style={{ flex: 1, overflowY: "auto", display: "grid", gap: 14 }}>
        {divisionStats.map(stat => (
          <div key={stat.name} style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px 14px", border: "1px solid var(--line)", borderRadius: 8, background: "#f8fafc" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ textAlign: "left" }}>
                <strong style={{ display: "block", fontSize: 14, color: "var(--navy)" }}>{stat.name} Division</strong>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>Total Assets: {stat.total}</span>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ display: "block", fontSize: 13, fontWeight: 800, color: "var(--green)" }}>{stat.operational} Operational</span>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>Health Score: {stat.percent}%</span>
              </div>
            </div>
            <div style={{ height: 6, background: "#e2e8f0", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: `${stat.percent}%`, height: "100%", background: "var(--green)", borderRadius: 3 }} />
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

// Station Category Distribution Component
function CategoryDistributionPanel({ queries }: { queries: any }) {
  const stations = queries.stationsQuery.data?.data || [];
  const loading = queries.stationsQuery.isLoading;

  if (loading) {
    return (
      <article className="panel distribution-panel" style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "center", alignItems: "center", minHeight: "430px" }}>
        <span style={{ color: "var(--muted)", fontSize: 13 }}>Loading category stats...</span>
      </article>
    );
  }

  const categoryCounts: Record<string, number> = {};
  stations.forEach((s: any) => {
    const cat = s.category ? String(s.category).trim().toUpperCase() : "UNSPECIFIED";
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });
  const categoryStats = Object.entries(categoryCounts)
    .map(([name, count]) => ({
      name,
      count,
      percent: stations.length > 0 ? Math.round((count / stations.length) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <article className="panel distribution-panel" style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: "430px" }}>
      <h3 style={{ margin: "0 0 16px 0", fontSize: 17, borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>Station Category Distribution</h3>
      <div style={{ flex: 1, overflowY: "auto", display: "grid", gap: 14 }}>
        {categoryStats.slice(0, 5).map(stat => (
          <div key={stat.name} style={{ display: "grid", gap: 5 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700 }}>
              <span style={{ color: "var(--navy)" }}>Category {stat.name}</span>
              <span style={{ color: "var(--purple)" }}>{stat.count} stations <span style={{ fontWeight: 500, color: "var(--muted)" }}>({stat.percent}%)</span></span>
            </div>
            <div style={{ height: 6, background: "#e2e8f0", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: `${stat.percent}%`, height: "100%", background: "var(--purple)", borderRadius: 3 }} />
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

// Alerts Panel Component
function AlertsPanel({ alerts }: { alerts: AlertItem[] }) {
  return (
    <article className="panel alert-panel">
      <PanelTitle title="Alerts & Notifications" />
      {alerts.map((alert) => (
        <div className="alert-row" key={alert.id}>
          <span className={`alert-icon ${alert.tone}`}>!</span>
          <div>
            <strong>{alert.title}</strong>
            <small>{alert.detail}</small>
          </div>
        </div>
      ))}
    </article>
  );
}

function PanelTitle({ title, action, onClick }: { title: string; action?: string; onClick?: () => void }) {
  return (
    <div className="panel-title">
      <h3>{title}</h3>
      {action && onClick && <button onClick={onClick} type="button">{action}</button>}
    </div>
  );
}

// Bottom Stat Card Component
function BottomStatCard({ stat, openPanel }: { stat: BottomStat; openPanel: () => void }) {
  const Icon = toneIcons[stat.tone];
  return (
    <button className="bottom-card" onClick={openPanel} type="button">
      <div className={`metric-icon ${stat.tone}`}>
        <Icon size={22} />
      </div>
      <div>
        <span>{stat.label}</span>
        <strong>{stat.value}</strong>
        <small>{stat.detail}</small>
      </div>
    </button>
  );
}

function SectionsManagementView({ showToast }: { showToast: (message: string) => void }) {
  const queryClient = useQueryClient();
  const [division, setDivision] = useState("Raipur");
  const [majorSection, setMajorSection] = useState("");
  const [section, setSection] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const pageSize = 10;

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchTerm.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  const sectionsQuery = useQuery({
    queryKey: ["daily-position-sections", currentPage, debouncedSearch],
    queryFn: () => api.dailyPosition.sections({
      page: String(currentPage),
      pageSize: String(pageSize),
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
    }),
    placeholderData: previousData => previousData,
    staleTime: 60_000,
  });

  const rows = sectionsQuery.data?.data || [];
  const divisionOptions = Array.from(new Set(["Raipur", "Bilaspur", "Nagpur", ...rows.map((row: any) => row.division).filter(Boolean)])) as string[];

  const createSectionMutation = useMutation({
    mutationFn: async () => {
      const major = await api.dailyPosition.createMajorSection({ division, name: majorSection });
      return api.dailyPosition.createSection({ division, majorSectionId: major.data.id, name: section });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-position-sections"] });
      queryClient.invalidateQueries({ queryKey: ["daily-position-metadata"] });
      setMajorSection("");
      setSection("");
      setAddSectionOpen(false);
      showToast("Section saved.");
    },
    onError: (err: any) => showToast(err.message || "Failed to save section."),
  });

  const updateSectionMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => api.dailyPosition.updateSection(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-position-sections"] });
      queryClient.invalidateQueries({ queryKey: ["daily-position-metadata"] });
      showToast("Section updated.");
    },
    onError: (err: any) => showToast(err.message || "Failed to update section."),
  });

  const deleteSectionMutation = useMutation({
    mutationFn: (id: string) => api.dailyPosition.deleteSection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-position-sections"] });
      queryClient.invalidateQueries({ queryKey: ["daily-position-metadata"] });
      showToast("Section deleted.");
    },
    onError: (err: any) => showToast(err.message || "Failed to delete section."),
  });

  const importMutation = useMutation({
    mutationFn: (importRows: any[]) => api.dailyPosition.importSections(importRows),
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["daily-position-sections"] });
      queryClient.invalidateQueries({ queryKey: ["daily-position-metadata"] });
      showToast(`Imported ${result.data.imported} sections. ${result.data.skipped} skipped.`);
    },
    onError: (err: any) => showToast(err.message || "Failed to import sections."),
  });

  const pagination = sectionsQuery.data?.pagination;
  const totalRows = pagination?.total || 0;
  const totalPages = pagination?.totalPages || 1;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    if (!division || !majorSection.trim() || !section.trim()) {
      showToast("Please provide division, major section, and section.");
      return;
    }
    createSectionMutation.mutate();
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    const XLSX = (ext === "xlsx" || ext === "xls") ? await import("xlsx") : null;
    const rowsFromFile = await new Promise<any[]>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Unable to read file"));
      reader.onload = (loadEvent) => {
        try {
          if (ext === "xlsx" || ext === "xls") {
            const workbook = XLSX!.read(loadEvent.target?.result, { type: "array" });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            resolve(XLSX!.utils.sheet_to_json(sheet, { defval: "" }));
          } else {
            const parsed = parseCSV(String(loadEvent.target?.result || ""));
            resolve(parsed.rows);
          }
        } catch (error) {
          reject(error);
        }
      };
      if (ext === "xlsx" || ext === "xls") reader.readAsArrayBuffer(file);
      else reader.readAsText(file);
    });
    importMutation.mutate(rowsFromFile);
    event.target.value = "";
  };

  const handleEdit = (row: any) => {
    const nextDivision = window.prompt("Division", row.division);
    if (!nextDivision) return;
    const nextMajor = window.prompt("Major Section", row.majorSection);
    if (!nextMajor) return;
    const nextSection = window.prompt("Section", row.section);
    if (!nextSection) return;
    updateSectionMutation.mutate({
      id: row.id,
      body: { division: nextDivision, majorSection: nextMajor, section: nextSection },
    });
  };

  const renderSectionPagination = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="pagination-bar section-pagination">
        <div className="pagination-info">
          Showing {totalRows === 0 ? 0 : (currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalRows)} of {totalRows} sections
        </div>
        <div className="pagination-controls">
          <button
            type="button"
            className="pagination-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          >
            Previous
          </button>
          {Array.from({ length: totalPages }).map((_, idx) => {
            const pageNum = idx + 1;
            if (totalPages > 7 && pageNum !== 1 && pageNum !== totalPages && Math.abs(pageNum - currentPage) > 1) {
              if (pageNum === 2 && currentPage > 3) return <span key={pageNum} className="pagination-info">...</span>;
              if (pageNum === totalPages - 1 && currentPage < totalPages - 2) return <span key={pageNum} className="pagination-info">...</span>;
              return null;
            }
            return (
              <button
                key={pageNum}
                type="button"
                className={`pagination-btn ${currentPage === pageNum ? "active" : ""}`}
                onClick={() => setCurrentPage(pageNum)}
              >
                {pageNum}
              </button>
            );
          })}
          <button
            type="button"
            className="pagination-btn"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  return (
    <article className="module-page sections-page">
      <section className="tabular-header">
        <div className="header-title-section">
          <h2>Sections</h2>
          <p>Manage Daily Position division, major section, and section master data</p>
        </div>
        <div className="header-controls-section">
          <button type="button" className="export-button" onClick={() => setAddSectionOpen(true)}>
            <Plus size={16} />
            Add Section
          </button>
        </div>
      </section>

      <div className="search-filter-row">
        <input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Filter sections..." />
      </div>

      <div className="table-scroll-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 70 }}>#</th>
              <th>Division</th>
              <th>Major Section</th>
              <th>Section</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any, idx: number) => (
              <tr key={`${row.id}-${idx}`}>
                <td>{(currentPage - 1) * pageSize + idx + 1}</td>
                <td>{row.division}</td>
                <td>{row.majorSection}</td>
                <td>{row.section || "-"}</td>
                <td style={{ textAlign: "right" }}>
                  {row.section ? (
                    <>
                      <button type="button" className="action-btn text-blue" onClick={() => handleEdit(row)}>Edit</button>
                      <button type="button" className="action-btn text-red" onClick={() => deleteSectionMutation.mutate(row.id)}>Delete</button>
                    </>
                  ) : "-"}
                </td>
              </tr>
            ))}
            {!sectionsQuery.isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", color: "var(--muted)", padding: 24 }}>No sections found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {renderSectionPagination()}
      {addSectionOpen && (
        <div className="modal-backdrop" onClick={() => setAddSectionOpen(false)}>
          <div className="modal-card section-modal" onClick={event => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setAddSectionOpen(false)} aria-label="Close">
              <X size={16} />
            </button>
            <h2>Add Section</h2>
            <p>Register division, major section, and section for Daily Position forms.</p>
            <form className="section-modal-form" onSubmit={handleCreate}>
              <label>
                Division
                <ClearableSelect value={division} onChange={setDivision}>
                  <option value="">Select Division</option>
                  {divisionOptions.map(item => <option key={item} value={item}>{item}</option>)}
                </ClearableSelect>
              </label>
              <label>
                Major Section
                <input value={majorSection} onChange={event => setMajorSection(event.target.value)} placeholder="e.g. (BSP-CPH) BILASPUR-CHAMPA" />
              </label>
              <label>
                Section
                <input value={section} onChange={event => setSection(event.target.value)} placeholder="e.g. BSP-GTW" />
              </label>
              <div className="modal-actions">
                <button className="export-button" type="button" onClick={() => setAddSectionOpen(false)}>Cancel</button>
                <button className="export-button" type="submit" disabled={createSectionMutation.isPending}>
                  <Plus size={16} />
                  {createSectionMutation.isPending ? "Saving..." : "Add Section"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </article>
  );
}

function FeedbackFormView({ showToast }: { showToast: (message: string) => void }) {
  const [selectedForm, setSelectedForm] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Flat list of daily position form names
  const flatForms = useMemo(() => {
    const names: string[] = [];
    DAILY_POSITION_FORMS.forEach((form) => {
      if (form.category === "Daily Log" || form.name === "Daily Position Log") return;
      if (!names.includes(form.name)) {
        names.push(form.name);
      }
    });
    return names.sort();
  }, []);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateAndAddFiles = (selectedFiles: FileList) => {
    const allowedExtensions = ["pdf", "jpg", "jpeg", "png", "doc", "docx"];
    const validFiles: File[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const selectedFile = selectedFiles[i];
      const ext = selectedFile.name.split(".").pop()?.toLowerCase();
      if (!ext || !allowedExtensions.includes(ext)) {
        showToast(`Unsupported file format for "${selectedFile.name}"! Please select PDF, JPG, PNG, DOC, or DOCX.`);
        continue;
      }
      if (selectedFile.size > 20 * 1024 * 1024) {
        showToast(`File "${selectedFile.name}" exceeds 20MB limit!`);
        continue;
      }
      validFiles.push(selectedFile);
    }

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndAddFiles(e.target.files);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const removeFile = (indexToRemove: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() && files.length === 0) {
      showToast("Please enter a description or upload at least one file.");
      return;
    }
    setLoading(true);
    try {
      const base64Files = await Promise.all(
        files.map(async (file) => {
          const content = await fileToBase64(file);
          return {
            name: file.name,
            type: file.type,
            size: file.size,
            content,
          };
        })
      );

      await api.feedback.create({
        description: selectedForm ? `[Form: ${selectedForm}]\n${description}` : description,
        files: base64Files,
        formName: selectedForm,
      });

      showToast("Feedback submitted successfully! Thank you for your feedback.");
      setDescription("");
      setSelectedForm("");
      setFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err: any) {
      showToast(err.message || "Failed to submit feedback.");
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <article
      className="feedback-page no-scrollbar"
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      {/* Compact Page Header */}
      <section
        className="tabular-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 24px",
          margin: 0,
          borderLeft: "none",
          borderRight: "none",
          borderRadius: 0,
          background: "#ffffff",
          borderBottom: "1px solid var(--line)"
        }}
      >
        <div
          className="header-title-section"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            width: "100%",
            textAlign: "left",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "#0b6dff",
                display: "grid",
                placeItems: "center",
                color: "#ffffff",
                boxShadow: "0 4px 10px rgba(11, 109, 255, 0.2)",
              }}
            >
              <MessageSquare size={14} />
            </div>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, lineHeight: "1" }}>Feedback Form</h2>
          </div>
        </div>
      </section>

      {/* Main Single Page Form Container */}
      <div
        className="no-scrollbar"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 24px",
          background: "var(--page)",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch"
        }}
      >
        <div
          style={{
            width: "100%",
            background: "#ffffff",
            border: "1px solid var(--line)",
            borderRadius: "12px",
            boxShadow:
              "0 10px 25px -5px rgba(0, 0, 0, 0.03), 0 8px 10px -6px rgba(0, 0, 0, 0.03)",
            padding: "24px 32px",
          }}
        >
          {/* Form Card Header */}
          <div style={{ borderBottom: "1px solid var(--line)", paddingBottom: "12px", marginBottom: "16px" }}>
            <h3 style={{ margin: 0, fontSize: "16px", color: "var(--navy)", fontWeight: 700 }}>Submit Your Feedback</h3>
            <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "var(--muted)" }}>
              Please select the Daily Position form, enter your feedback, and attach any relevant files.
            </p>
          </div>

          <form
            id="feedback-form-element"
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            {/* Form Selection Dropdown */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: 700, color: "var(--navy)" }}>
                Select Daily Position Form <span style={{ color: "var(--muted)", fontWeight: 500 }}>(Optional)</span>
              </label>
              <select
                disabled={loading}
                value={selectedForm}
                onChange={(e) => setSelectedForm(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid var(--line)",
                  background: "#f8fafc",
                  fontSize: "13px",
                  color: "var(--navy)",
                  outline: "none",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  fontFamily: "inherit",
                  appearance: "none",
                  WebkitAppearance: "none",
                  backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`,
                  backgroundPosition: "right 14px center",
                  backgroundSize: "18px",
                  backgroundRepeat: "no-repeat",
                  paddingRight: "36px",
                }}
                className="feedback-select"
              >
                <option value="">Select a Form (None)</option>
                {flatForms.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Feedback Description */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: 700, color: "var(--navy)" }}>
                Feedback Description <span style={{ color: "var(--muted)", fontWeight: 500 }}>(Optional)</span>
              </label>
              <div style={{ position: "relative" }}>
                <textarea
                  disabled={loading}
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
                  placeholder="Enter your feedback here..."
                  style={{
                    width: "100%",
                    height: "120px",
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid var(--line)",
                    background: "#f8fafc",
                    fontSize: "13px",
                    color: "var(--navy)",
                    outline: "none",
                    resize: "none",
                    transition: "all 0.2s ease",
                    fontFamily: "inherit",
                  }}
                  className="feedback-textarea"
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    fontSize: "11px",
                    color: "var(--muted)",
                    marginTop: "4px",
                    fontWeight: 600,
                  }}
                >
                  {description.length} / 2000
                </div>
              </div>
            </div>

            {/* Upload File */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: 700, color: "var(--navy)" }}>
                Upload Files <span style={{ color: "var(--muted)", fontWeight: 500 }}>(Optional)</span>
              </label>

              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={triggerFileSelect}
                style={{
                  border: dragActive ? "2px dashed #0b6dff" : "1.5px dashed #b3d1ff",
                  background: dragActive ? "#edf2ff" : "#fcfdfe",
                  borderRadius: "10px",
                  padding: "20px 16px",
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "8px",
                }}
                className="feedback-dropzone"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  disabled={loading}
                />

                <div style={{ color: "#0b6dff" }}>
                  <UploadCloud size={28} />
                </div>

                <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--navy)", margin: 0 }}>
                  Drag and drop files here or{" "}
                  <span style={{ color: "#0b6dff", textDecoration: "underline" }}>click to browse</span>
                </p>
                <p style={{ fontSize: "11px", color: "var(--muted)", margin: 0, fontWeight: 500 }}>
                  PDF, JPG, PNG, DOC, DOCX (Max 20MB per file)
                </p>
              </div>

              {/* Selected Files List (Compact Tags) */}
              {files.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "4px" }}>
                  {files.map((file, idx) => (
                    <div
                      key={`${file.name}-${idx}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        background: "#f1f5f9",
                        padding: "4px 10px",
                        borderRadius: "20px",
                        border: "1px solid var(--line)",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "var(--navy)",
                          maxWidth: "150px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {file.name}
                      </span>
                      <span style={{ fontSize: "10px", color: "var(--muted)" }}>({formatFileSize(file.size)})</span>
                      <button
                        onClick={(e) => removeFile(idx, e)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--red)",
                          cursor: "pointer",
                          fontSize: "12px",
                          fontWeight: "bold",
                          padding: "0 2px",
                        }}
                        type="button"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button Inside Card */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  background: "#0b6dff",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "10px 24px",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 4px 12px rgba(11, 109, 255, 0.15)",
                  transition: "all 0.2s ease",
                }}
                className="feedback-submit-btn"
              >
                <Send size={14} />
                <span>{loading ? "Submitting..." : "Submit Feedback"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <style>{`
        .feedback-page::-webkit-scrollbar,
        .no-scrollbar::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        .feedback-textarea:focus,
        .feedback-select:focus {
          border-color: #0b6dff !important;
          background: #ffffff !important;
          box-shadow: 0 0 0 3px rgba(11, 109, 255, 0.08);
        }
        .feedback-dropzone:hover {
          border-color: #0b6dff !important;
          background: #f0f7ff !important;
        }
        .feedback-submit-btn:hover:not(:disabled) {
          background: #0056cc !important;
          box-shadow: 0 6px 16px rgba(11, 109, 255, 0.25) !important;
          transform: translateY(-1px);
        }
      `}</style>
    </article>
  );
}

function FeedbackAdminView({ showToast }: { showToast: (message: string) => void }) {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: feedbacksQuery, isLoading } = useQuery({
    queryKey: ["feedback-list"],
    queryFn: () => api.feedback.list(),
  });

  const feedbacks = feedbacksQuery?.data || [];

  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter((fb: any) => {
      const query = searchTerm.toLowerCase();
      const desc = String(fb.description || "").toLowerCase();
      const name = String(fb.createdBy?.name || "").toLowerCase();
      const username = String(fb.createdBy?.username || "").toLowerCase();
      const division = String(fb.createdBy?.division || "").toLowerCase();
      const designation = String(fb.createdBy?.designation || "").toLowerCase();
      const role = String(fb.createdBy?.role || "").toLowerCase();

      return desc.includes(query) ||
        name.includes(query) ||
        username.includes(query) ||
        division.includes(query) ||
        designation.includes(query) ||
        role.includes(query);
    });
  }, [feedbacks, searchTerm]);

  const downloadAttachment = (fileObj: any) => {
    try {
      const link = document.createElement("a");
      link.href = fileObj.content; // Base64 data URL
      link.download = fileObj.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      showToast("Failed to download attachment.");
    }
  };

  return (
    <article className="feedback-page no-scrollbar" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", scrollbarWidth: "none", msOverflowStyle: "none" }}>
      <section className="tabular-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", margin: 0, borderLeft: "none", borderRight: "none", borderRadius: 0 }}>
        <div className="header-title-section" style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", width: "100%", textAlign: "left" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "#0b6dff",
                display: "grid",
                placeItems: "center",
                color: "#ffffff",
                boxShadow: "0 4px 10px rgba(11, 109, 255, 0.2)"
              }}
            >
              <MessageSquare size={16} />
            </div>
            <h2 style={{ margin: 0, fontSize: "22px", lineHeight: "1" }}>User Feedback Inbox</h2>
          </div>
          <p style={{ margin: "6px 0 0 0", fontSize: "13px", color: "var(--muted)" }}>
            Review feedback records submitted by testroom and other system users to track and proceed accordingly.
          </p>
        </div>
      </section>

      {/* Toolbar & Search */}
      <div className="dp-history-filters" style={{ display: "flex", gap: "12px", padding: "12px 24px", background: "#f8fafc", borderBottom: "1px solid var(--line)" }}>
        <div style={{ flex: "1 1 300px" }}>
          <input
            type="text"
            placeholder="Search feedback, description, username, designation, division..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px" }}
          />
        </div>
      </div>

      {/* Feedbacks List */}
      <div className="no-scrollbar" style={{ flex: 1, overflowY: "auto", padding: 0, scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {isLoading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>Loading user feedback...</div>
        ) : filteredFeedbacks.length === 0 ? (
          <div style={{ padding: "60px", textAlign: "center", color: "var(--muted)" }}>
            {searchTerm ? "No feedback records found matching current query." : "No feedback submissions received yet."}
          </div>
        ) : (
          <div className="panel" style={{ padding: 0, background: "#ffffff", border: "none", borderRadius: 0 }}>
            <div className="table-scroll-container">
              <table className="data-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Submitter</th>
                    <th>Role / Designation</th>
                    <th>Division</th>
                    <th style={{ width: "45%" }}>Description</th>
                    <th>Attachments</th>
                    <th>Submitted At</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFeedbacks.map((fb: any) => {
                    const attachments = Array.isArray(fb.files) ? fb.files : [];

                    // Parse form name prefix if exists
                    const match = fb.description?.match(/^\[Form:\s*([^\]]+)\]\n?([\s\S]*)$/);
                    const formName = match ? match[1] : null;
                    const cleanDescription = match ? match[2] : fb.description;

                    return (
                      <tr key={fb.id}>
                        <td>
                          <strong>{fb.createdBy?.name || "Unknown"}</strong>
                          <div style={{ fontSize: "11px", color: "var(--muted)" }}>@{fb.createdBy?.username || "unknown"}</div>
                        </td>
                        <td>
                          <div>{fb.createdBy?.role}</div>
                          {fb.createdBy?.designation && (
                            <div style={{ fontSize: "11px", color: "var(--muted)" }}>{fb.createdBy.designation}</div>
                          )}
                        </td>
                        <td>{fb.createdBy?.division || "HQ"}</td>
                        <td style={{ whiteSpace: "normal", wordBreak: "break-word", fontSize: "13px", lineHeight: "1.5" }}>
                          {formName && (
                            <div style={{ marginBottom: "6px" }}>
                              <span style={{
                                background: "var(--blue-soft)",
                                color: "var(--blue)",
                                padding: "4px 8px",
                                borderRadius: "4px",
                                fontSize: "11px",
                                fontWeight: 700,
                                display: "inline-block"
                              }}>
                                📋 {formName}
                              </span>
                            </div>
                          )}
                          {cleanDescription || <span style={{ color: "var(--muted)", fontStyle: "italic" }}>No description provided.</span>}
                        </td>
                        <td>
                          {attachments.length === 0 ? (
                            <span style={{ color: "var(--muted)" }}>—</span>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              {attachments.map((fileObj: any, fileIdx: number) => (
                                <button
                                  key={fileIdx}
                                  type="button"
                                  onClick={() => downloadAttachment(fileObj)}
                                  className="action-btn text-blue"
                                  style={{
                                    fontSize: "12px",
                                    padding: 0,
                                    background: "none",
                                    border: "none",
                                    textAlign: "left",
                                    cursor: "pointer",
                                    textDecoration: "underline"
                                  }}
                                  title={`Size: ${fileObj.size ? (fileObj.size / 1024).toFixed(1) + " KB" : "Unknown"}`}
                                >
                                  📎 {fileObj.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                        <td>{formatDateTime24(fb.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .feedback-page::-webkit-scrollbar,
        .no-scrollbar::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
      `}</style>
    </article>
  );
}

// Module View Component (Lists and Tables)
// Module View Component (Lists and Tables)
function ModuleView({
  activeNav,
  openPanel,
  queries
}: {
  activeNav: NavKey;
  openPanel: (title: string, itemId?: string | null) => void;
  queries: any;
}) {
  const queryClient = useQueryClient();
  const { assetStatusFilter, setAssetStatusFilter, role } = useAppStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDivision, setFilterDivision] = useState("");
  const [filterState, setFilterState] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [expandedStationCode, setExpandedStationCode] = useState<string | null>(null);
  const [expandedCategoryKey, setExpandedCategoryKey] = useState<string | null>(null); // "stationCode::CATEGORY"
  const [currentPage, setCurrentPage] = useState(1);

  // Click outside handler for station dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (expandedStationCode && !target.closest('.telecom-assets-dropdown-popover') && !target.closest('.action-btn')) {
        setExpandedStationCode(null);
        setExpandedCategoryKey(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [expandedStationCode]);

  // Clear filters when switching activeNav
  useEffect(() => {
    setFilterDivision("");
    setFilterState("");
    setFilterCategory("");
    setFilterPopoverOpen(false);
    setCurrentPage(1);
  }, [activeNav]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterDivision, filterState, filterCategory, assetStatusFilter]);

  const stations = queries.stationsQuery.data?.data || [];
  const uniqueDivisions = Array.from(new Set(stations.map((s: any) => s.division).filter(Boolean).map(normalizeDivision))) as string[];
  const uniqueStates = Array.from(new Set(stations.map((s: any) => s.state).filter(Boolean))) as string[];

  const getCategories = () => {
    if (activeNav === "Master List") {
      return Array.from(new Set((queries.stationsQuery.data?.data || []).map((s: any) => s.category).filter(Boolean))) as string[];
    }
    if (activeNav === "Assets") {
      return Array.from(new Set((queries.assetsQuery.data?.data || []).map((a: any) => getTelecomAssetName(a)).filter(Boolean))) as string[];
    }
    if (activeNav === "LC Gate") {
      return Array.from(new Set((queries.gatesQuery.data?.data || []).map((g: any) => g.category).filter(Boolean))) as string[];
    }
    return [];
  };
  const categoriesList = getCategories();

  // Delete mutations
  const deleteStation = useMutation({
    mutationFn: (code: string) => api.stations.delete(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stations-list"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    }
  });

  const deleteAsset = useMutation({
    mutationFn: (id: string) => api.assets.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets-list"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    }
  });

  const deleteGate = useMutation({
    mutationFn: (id: string) => api.gates.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gates-list"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    }
  });

  const renderPagination = (totalItems: number) => {
    const totalPages = Math.ceil(totalItems / 50);
    if (totalPages <= 1) return null;

    return (
      <div className="pagination-bar">
        <div className="pagination-info">
          Showing {Math.min(totalItems, (currentPage - 1) * 50 + 1)}–{Math.min(totalItems, currentPage * 50)} of {totalItems} records
        </div>
        <div className="pagination-controls">
          <button
            type="button"
            className="pagination-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          >
            Previous
          </button>
          {Array.from({ length: totalPages }).map((_, idx) => {
            const pageNum = idx + 1;
            if (totalPages > 7) {
              if (pageNum !== 1 && pageNum !== totalPages && Math.abs(pageNum - currentPage) > 1) {
                if (pageNum === 2 && currentPage > 3) {
                  return <span key={pageNum} className="pagination-info" style={{ margin: "0 4px" }}>...</span>;
                }
                if (pageNum === totalPages - 1 && currentPage < totalPages - 2) {
                  return <span key={pageNum} className="pagination-info" style={{ margin: "0 4px" }}>...</span>;
                }
                return null;
              }
            }
            return (
              <button
                key={pageNum}
                type="button"
                className={`pagination-btn ${currentPage === pageNum ? "active" : ""}`}
                onClick={() => setCurrentPage(pageNum)}
              >
                {pageNum}
              </button>
            );
          })}
          <button
            type="button"
            className="pagination-btn"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeNav) {
      case "Master List": {
        const rawList = queries.stationsQuery.data?.data || [];
        const list = rawList.filter((s: any) => {
          const normDiv = normalizeDivision(s.division).toLowerCase();
          const matchesSearch =
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.division && s.division.toLowerCase().includes(searchTerm.toLowerCase())) ||
            normDiv.includes(searchTerm.toLowerCase()) ||
            (s.state && s.state.toLowerCase().includes(searchTerm.toLowerCase()));
          const matchesDivision = !filterDivision || normalizeDivision(s.division) === filterDivision;
          const matchesState = !filterState || s.state === filterState;
          const matchesCategory = !filterCategory || s.category === filterCategory;
          return matchesSearch && matchesDivision && matchesState && matchesCategory;
        });
        const paginatedList = list.slice((currentPage - 1) * 50, currentPage * 50);
        return (
          <>
            <div className="table-scroll-container" style={{ overflow: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: "60px" }}>#</th>
                    <th>Division</th>
                    <th>Station Name</th>
                    <th>Code</th>
                    <th>State</th>
                    <th>Category</th>
                    <th>Telecom Assets</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedList.map((s: any, idx: number) => {
                    const isExpanded = expandedStationCode === s.code;
                    return (
                      <Fragment key={s.id}>
                        <tr style={{ background: isExpanded ? "#f8fafd" : undefined }}>
                          <td>{(currentPage - 1) * 50 + idx + 1}</td>
                          <td>{normalizeDivision(s.division)}</td>
                          <td>
                            <strong
                              onClick={() => openPanel("Station Details", s.id)}
                              style={{ cursor: "pointer", color: "var(--blue)" }}
                              className="clickable-link"
                            >
                              {s.name}
                            </strong>
                          </td>
                          <td>
                            <strong
                              onClick={() => openPanel("Station Details", s.id)}
                              style={{ cursor: "pointer", color: "var(--blue)" }}
                              className="clickable-link"
                            >
                              {s.code}
                            </strong>
                          </td>
                          <td>{s.state || "-"}</td>
                          <td>{s.category}</td>
                          <td className="telecom-assets-dropdown-cell">
                            <button
                              className="action-btn text-blue"
                              style={{
                                background: isExpanded ? "var(--blue)" : "var(--blue-soft)",
                                color: isExpanded ? "#fff" : "var(--blue)",
                                padding: "6px 12px",
                                borderRadius: "6px",
                                fontWeight: "700",
                                border: isExpanded ? "1px solid var(--blue)" : "1px solid rgba(11, 109, 255, 0.15)",
                                cursor: "pointer",
                                transition: "all 0.2s ease"
                              }}
                              onClick={() => setExpandedStationCode(isExpanded ? null : s.code)}
                            >
                              {isExpanded ? "Hide Telecom Assets" : "View Telecom Assets"}
                            </button>

                            {isExpanded && (
                              <div className="telecom-assets-dropdown-popover">
                                <div className="telecom-assets-dropdown-body">
                                  {(() => {
                                    const stationAssets = (queries.assetsQuery.data?.data || []).filter((a: any) => a.stationCode === s.code);

                                    const activeTelecomAssets = TELECOM_ASSET_CHECKS.filter(cap => !!s[cap.key]);
                                    const telecomAssetsToShow = activeTelecomAssets.length > 0
                                      ? activeTelecomAssets
                                      : Array.from(new Set(stationAssets.map((asset: any) => getTelecomAssetName(asset)))).map(label => ({ key: label, label }));

                                    if (telecomAssetsToShow.length === 0) {
                                      return (
                                        <div style={{ padding: "16px 20px", border: "1px dashed var(--line)", borderRadius: "10px", textAlign: "center", color: "var(--muted)", background: "#fff" }}>
                                          No active Telecom Assets ticked or registered for this station.
                                        </div>
                                      );
                                    }

                                    const assetsByCategory = telecomAssetsToShow.reduce((acc: Record<string, any[]>, cap: any) => {
                                      acc[cap.label] = stationAssets.filter((asset: any) => isTelecomAssetMatch(getTelecomAssetName(asset), cap.label));
                                      return acc;
                                    }, {});

                                    const catColor: Record<string, { bg: string; border: string; accent: string }> = {
                                      "CCTV": { bg: "#eaf2ff", border: "#b3d1ff", accent: "#0b6dff" },
                                      "IPIS": { bg: "#edf9f0", border: "#a3ddb8", accent: "#0db76b" },
                                      "OFC": { bg: "#fff7e6", border: "#ffd08a", accent: "#d97300" },
                                      "WIFI": { bg: "#f3eeff", border: "#c9b3ff", accent: "#7c3aed" },
                                      "PA SYSTEM": { bg: "#fff0f0", border: "#ffb3b3", accent: "#ef4444" },
                                      "OTHERS": { bg: "#f0f4ff", border: "#c5cfe8", accent: "#4b5e8b" },
                                    };
                                    const getColor = (cat: string) => catColor[cat] || catColor["OTHERS"];

                                    return (
                                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                        {/* Category Cards Row */}
                                        <div style={{
                                          display: "grid",
                                          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                                          gap: 8,
                                          alignItems: "stretch"
                                        }}>
                                          {telecomAssetsToShow.map((cap: any) => {
                                            const categoryName = cap.label;
                                            const assets = assetsByCategory[categoryName] || [];
                                            const key = `${s.code}::${categoryName}`;
                                            const isOpen = expandedCategoryKey === key;
                                            const anyOpen = expandedCategoryKey && expandedCategoryKey.startsWith(`${s.code}::`);
                                            const col = getColor(categoryName);
                                            if (anyOpen && !isOpen) return null;
                                            return (
                                              <button
                                                key={categoryName}
                                                onClick={() => setExpandedCategoryKey(isOpen ? null : key)}
                                                style={{
                                                  display: "flex",
                                                  alignItems: "center",
                                                  justifyContent: "space-between",
                                                  gap: 8,
                                                  minHeight: 36,
                                                  width: "100%",
                                                  padding: "6px 10px",
                                                  background: isOpen ? col.accent : col.bg,
                                                  border: isOpen ? `1px solid ${col.accent}` : `1px solid ${col.border}`,
                                                  borderRadius: 8,
                                                  cursor: "pointer",
                                                  transition: "all 0.2s ease",
                                                  boxShadow: isOpen ? `0 4px 14px ${col.accent}33` : "none",
                                                }}
                                              >
                                                <span style={{
                                                  fontSize: 12,
                                                  fontWeight: 800,
                                                  color: isOpen ? "#fff" : col.accent,
                                                  textTransform: "uppercase",
                                                  overflow: "hidden",
                                                  textOverflow: "ellipsis",
                                                  whiteSpace: "nowrap",
                                                  minWidth: 0,
                                                }}>
                                                  {categoryName}
                                                </span>
                                                {assets.length > 0 && (
                                                  <span style={{
                                                    minWidth: 20,
                                                    height: 18,
                                                    display: "inline-grid",
                                                    placeItems: "center",
                                                    flexShrink: 0,
                                                    fontSize: 10,
                                                    fontWeight: 800,
                                                    background: isOpen ? "rgba(255,255,255,0.24)" : "#fff",
                                                    color: isOpen ? "#fff" : col.accent,
                                                    border: isOpen ? "1px solid rgba(255,255,255,0.28)" : `1px solid ${col.border}`,
                                                    borderRadius: 999,
                                                    padding: "0 5px",
                                                  }}>
                                                    {assets.length}
                                                  </span>
                                                )}
                                              </button>
                                            );
                                          })}
                                        </div>

                                        {/* Expanded Asset Rows */}
                                        {expandedCategoryKey && expandedCategoryKey.startsWith(`${s.code}::`) && (() => {
                                          const openCat = expandedCategoryKey.split("::")[1];
                                          const openAssets: any[] = assetsByCategory[openCat] || [];
                                          const col = getColor(openCat);
                                          return (
                                            <div style={{
                                              border: `1.5px solid ${col.border}`,
                                              borderRadius: 10,
                                              overflow: "hidden",
                                              background: "#fff",
                                              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                                            }}>
                                              <div style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                padding: "8px 12px",
                                                background: col.bg,
                                                borderBottom: `1.5px solid ${col.border}`,
                                              }}>
                                                <span style={{ fontSize: 12, fontWeight: 800, color: col.accent, textTransform: "uppercase" }}>
                                                  {openCat} Details
                                                </span>
                                                <button
                                                  onClick={() => setExpandedCategoryKey(null)}
                                                  style={{ background: "none", border: "none", cursor: "pointer", color: col.accent, fontSize: 16, lineHeight: 1 }}
                                                >✕</button>
                                              </div>

                                              <div style={{ display: "grid", gap: 0, maxHeight: 180, overflowY: "auto" }}>
                                                {openAssets.length === 0 && (
                                                  <div style={{ padding: "10px 12px", color: "var(--muted)", fontSize: 12 }}>
                                                    No details registered.
                                                  </div>
                                                )}
                                                {openAssets.map((asset: any, idx: number) => (
                                                  <div
                                                    key={asset.id}
                                                    style={{
                                                      display: "flex",
                                                      justifyContent: "space-between",
                                                      alignItems: "center",
                                                      padding: "8px 12px",
                                                      borderBottom: idx < openAssets.length - 1 ? `1px solid ${col.border}33` : "none",
                                                      background: "#fff",
                                                      cursor: "pointer",
                                                    }}
                                                    onClick={() => openPanel("Asset Details", asset.id)}
                                                  >
                                                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                                                      <span style={{ fontSize: 11, fontWeight: 800, color: col.accent }}>{idx + 1}.</span>
                                                      <div style={{ minWidth: 0 }}>
                                                        <strong style={{ display: "block", fontSize: 12.5, color: "var(--navy)", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                          {asset.assetMode === ASSET_MODE_HAS_EQUIPMENT ? asset.equipmentName : openCat}
                                                        </strong>
                                                        <small style={{ display: "block", color: "var(--muted)", fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                          {asset.make || "-"} / {asset.model || "-"}
                                                        </small>
                                                      </div>
                                                    </div>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                                                      <span
                                                        className={`pill ${asset.status.toLowerCase()}`}
                                                        style={{ fontSize: 9.5, padding: "1px 5px", fontWeight: 700 }}
                                                      >
                                                        {asset.status}
                                                      </span>
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <button
                              className="action-btn text-blue"
                              onClick={() => openPanel("Station Details", s.id)}
                              style={{ marginRight: 8 }}
                            >
                              View
                            </button>
                            {canEditStations && (
                              <>
                                <button
                                  className="action-btn text-blue"
                                  onClick={() => openPanel("Edit Station", s.id)}
                                  style={{ marginRight: 8 }}
                                >
                                  Edit
                                </button>
                                <button className="action-btn text-red" onClick={() => deleteStation.mutate(s.code)}>Delete</button>
                              </>
                            )}
                          </td>
                        </tr>
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {renderPagination(list.length)}
          </>
        );
      }
      case "Assets": {
        const rawList = queries.assetsQuery.data?.data || [];
        const stations = queries.stationsQuery.data?.data || [];
        const list = rawList.filter((a: any) => {
          const telecomAssetName = getTelecomAssetName(a);
          const matchesSearch =
            (a.rdsoSpec && a.rdsoSpec.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (telecomAssetName && telecomAssetName.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (a.stationCode && a.stationCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (a.make && a.make.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (a.model && a.model.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (a.installLocation && a.installLocation.toLowerCase().includes(searchTerm.toLowerCase()));
          const matchesStatus = !assetStatusFilter || a.status === assetStatusFilter;

          const linkedStation = stations.find((s: any) => s.code === a.stationCode);
          const matchesDivision = !filterDivision || (linkedStation && normalizeDivision(linkedStation.division) === filterDivision);
          const matchesState = !filterState || (linkedStation && linkedStation.state === filterState);
          const matchesCategory = !filterCategory || telecomAssetName === filterCategory;

          return matchesSearch && matchesStatus && matchesDivision && matchesState && matchesCategory;
        });
        const paginatedList = list.slice((currentPage - 1) * 50, currentPage * 50);
        return (
          <>
            <div className="table-scroll-container" style={{ overflow: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: "60px" }}>#</th>
                    <th>Station</th>
                    <th>Telecom Asset</th>
                    <th>RDSO Spec / Version</th>
                    <th>Make</th>
                    <th>Model</th>
                    <th>Install Location</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedList.map((a: any, idx: number) => (
                    <tr key={a.id}>
                      <td>{(currentPage - 1) * 50 + idx + 1}</td>
                      <td>{a.stationCode}</td>
                      <td><span className="pill info">{getTelecomAssetName(a)}</span></td>
                      <td><strong onClick={() => openPanel("Asset Details", a.id)} className="clickable-link">{a.rdsoSpec || "-"}</strong></td>
                      <td>{a.make || "-"}</td>
                      <td>{a.model || "-"}</td>
                      <td><small>{a.installLocation || "-"}</small></td>
                      <td><span className={`pill ${a.status.toLowerCase()}`}>{a.status}</span></td>
                      <td style={{ textAlign: "right" }}>
                        <button className="action-btn text-blue" onClick={() => openPanel("Asset Details", a.id)} style={{ marginRight: 8 }}>View</button>
                        {canEditAssets && (
                          <>
                            <button className="action-btn text-blue" onClick={() => openPanel("Edit Asset", a.id)} style={{ marginRight: 8 }}>Edit</button>
                            <button className="action-btn text-red" onClick={() => deleteAsset.mutate(a.id)}>Delete</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {renderPagination(list.length)}
          </>
        );
      }
      case "LC Gate": {
        const rawList = queries.gatesQuery.data?.data || [];
        const stations = queries.stationsQuery.data?.data || [];
        const list = rawList.filter((g: any) => {
          const matchesSearch =
            (g.gateNumber && g.gateNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (g.name && g.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (g.category && g.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (g.section && g.section.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (g.stationCode && g.stationCode.toLowerCase().includes(searchTerm.toLowerCase()));

          const linkedStation = stations.find((s: any) => s.code === g.stationCode);
          const matchesDivision = !filterDivision || (linkedStation && normalizeDivision(linkedStation.division) === filterDivision);
          const matchesState = !filterState || (linkedStation && linkedStation.state === filterState);
          const matchesCategory = !filterCategory || g.category === filterCategory;

          return matchesSearch && matchesDivision && matchesState && matchesCategory;
        });
        const paginatedList = list.slice((currentPage - 1) * 50, currentPage * 50);
        return (
          <>
            <div className="table-scroll-container" style={{ overflow: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: "60px" }}>#</th>
                    <th>Gate No</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Km</th>
                    <th>Section</th>
                    <th>Location Description</th>
                    <th>Station</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedList.map((g: any, idx: number) => (
                    <tr key={g.id}>
                      <td>{(currentPage - 1) * 50 + idx + 1}</td>
                      <td><strong>{g.gateNumber}</strong></td>
                      <td>{g.name || "-"}</td>
                      <td>{g.category}</td>
                      <td>{g.km || "-"}</td>
                      <td>{g.section || "-"}</td>
                      <td><small>{g.locationName || "-"}</small></td>
                      <td>{g.stationCode || "-"}</td>
                      <td style={{ textAlign: "right" }}>
                        {canEditGates ? (
                          <>
                            <button className="action-btn text-blue" onClick={() => openPanel("Edit LC Gate", g.id)} style={{ marginRight: 8 }}>Edit</button>
                            <button className="action-btn text-red" onClick={() => deleteGate.mutate(g.id)}>Delete</button>
                          </>
                        ) : (
                          <button className="action-btn text-blue" onClick={() => openPanel("Edit LC Gate", g.id)} style={{ marginRight: 8 }}>View</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {renderPagination(list.length)}
          </>
        );
      }

      case "Users & Roles": {
        const rawList = queries.usersQuery.data?.data || [];
        const list = rawList.filter((u: any) => {
          const normDiv = normalizeDivision(u.division).toLowerCase();
          return (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (u.username && u.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (u.role && u.role.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (u.designation && u.designation.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (u.division && u.division.toLowerCase().includes(searchTerm.toLowerCase())) ||
            normDiv.includes(searchTerm.toLowerCase());
        });
        const paginatedList = list.slice((currentPage - 1) * 50, currentPage * 50);
        return (
          <>
            <div className="table-scroll-container" style={{ overflow: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: "60px" }}>#</th>
                    <th>Name</th>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Designation</th>
                    <th>Division</th>
                    <th>Created At</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedList.map((u: any, idx: number) => {
                    const canManage = useAppStore.getState().role === "SUPER_ADMIN" ||
                      (useAppStore.getState().role === "DIVISIONAL_ADMIN" && normalizeDivision(u.division) === normalizeDivision(useAppStore.getState().user?.division));
                    return (
                      <tr key={u.id}>
                        <td>{(currentPage - 1) * 50 + idx + 1}</td>
                        <td>
                          <strong
                            onClick={() => openPanel("User Details", u.id)}
                            style={{ cursor: "pointer", color: "var(--blue)" }}
                            className="clickable-link"
                          >
                            {u.name}
                          </strong>
                        </td>
                        <td>{u.username}</td>
                        <td><span className="pill info">{u.role}</span></td>
                        <td>{u.designation || "-"}</td>
                        <td>{normalizeDivision(u.division) || "HQ"}</td>
                        <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td style={{ textAlign: "right" }}>
                          {canManage ? (
                            <button className="action-btn text-blue" onClick={() => openPanel("Manage User", u.id)}>Manage</button>
                          ) : (
                            <button className="action-btn text-blue" onClick={() => openPanel("User Details", u.id)}>Details</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {renderPagination(list.length)}
          </>
        );
      }
      case "Audit Logs": {
        const rawList = queries.logsQuery.data?.data || [];
        const list = rawList.filter((l: any) =>
          (l.action && l.action.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (l.details && l.details.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (l.user?.name && l.user.name.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        const paginatedList = list.slice((currentPage - 1) * 50, currentPage * 50);
        return (
          <>
            <div className="table-scroll-container" style={{ overflow: "auto" }}>
              <table className="data-table text-left">
                <thead>
                  <tr>
                    <th style={{ width: "60px" }}>#</th>
                    <th>Date & Time</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedList.map((l: any, idx: number) => (
                    <tr key={l.id}>
                      <td>{(currentPage - 1) * 50 + idx + 1}</td>
                      <td><small>{formatDateTime24(l.createdAt)}</small></td>
                      <td><strong>{l.user?.name}</strong> <small>({l.user?.role})</small></td>
                      <td><span className="pill info">{l.action}</span></td>
                      <td>{l.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {renderPagination(list.length)}
          </>
        );
      }

      case "Reports & Analytics": {
        const rawList = queries.stationsQuery.data?.data || [];
        const stats = rawList.filter((s: any) =>
          s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.code.toLowerCase().includes(searchTerm.toLowerCase())
        );
        const paginatedStats = stats.slice((currentPage - 1) * 50, currentPage * 50);

        const checklistCols = [
          { key: "hasIpis", label: "IPIS" },
          { key: "hasPaSystem", label: "PA System" },
          { key: "hasAnalogClock", label: "Analog Clock" },
          { key: "hasGpsClock", label: "GPS Clock" },
          { key: "hasCoachGuidanceDisplay", label: "Coach Guidance Display" },
          { key: "hasTrainIndicationBoard", label: "Train Indication Board" },
          { key: "hasWifi", label: "Wi-Fi" },
          { key: "hasCctv", label: "CCTV" },
          { key: "hasDigitalDisplayHeritage", label: "Digital Display (Heritage)" },
          { key: "hasAtAGlanceBoard", label: "At A Glance Board" },
          { key: "hasPrs", label: "PRS" },
          { key: "hasUts", label: "UTS" },
          { key: "hasAtvm", label: "ATVM" },
          { key: "hasCctvDe", label: "CCTV D&E" },
          { key: "hasTalkback", label: "Talkback" }
        ];

        return (
          <div className="wide-list-container">
            <div className="table-scroll-container" style={{ overflow: "auto" }}>
              <table className="data-table text-center">
                <thead>
                  <tr>
                    <th style={{ width: "60px" }}>#</th>
                    <th style={{ textAlign: "left", whiteSpace: "nowrap" }}>Station Name</th>
                    {checklistCols.map(col => (
                      <th key={col.key} style={{ whiteSpace: "nowrap" }}>{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedStats.map((s: any, idx: number) => (
                    <tr key={s.id}>
                      <td>{(currentPage - 1) * 50 + idx + 1}</td>
                      <td style={{ textAlign: "left", whiteSpace: "nowrap" }}><strong>{s.name} ({s.code})</strong></td>
                      {checklistCols.map(col => (
                        <td key={col.key}>{s[col.key] ? "✅" : "❌"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {renderPagination(stats.length)}
          </div>
        );
      }
      default:
        return <div>View is under development.</div>;
    }
  };

  const handleCreateNew = () => {
    switch (activeNav) {
      case "Master List":
        openPanel("Add Station");
        break;
      case "Assets":
        openPanel("Add Asset");
        break;
      case "LC Gate":
        openPanel("Add LC Gate");
        break;
      case "Users & Roles":
        openPanel("Add User");
        break;
      default:
        break;
    }
  };

  const canEditStations = ["SUPER_ADMIN", "DIVISIONAL_ADMIN", "SSE"].includes(role || "");
  const canEditAssets = ["SUPER_ADMIN", "DIVISIONAL_ADMIN", "SSE", "TECHNICIAN"].includes(role || "");
  const canEditGates = ["SUPER_ADMIN", "DIVISIONAL_ADMIN", "SSE", "TECHNICIAN"].includes(role || "");

  const shouldShowActionButtons = ["Master List", "Assets", "LC Gate", "Users & Roles"].includes(activeNav) && (
    (activeNav === "Master List" && canEditStations) ||
    (activeNav === "Assets" && canEditAssets) ||
    (activeNav === "LC Gate" && canEditGates) ||
    (activeNav === "Users & Roles" && ["SUPER_ADMIN", "DIVISIONAL_ADMIN"].includes(role || ""))
  );

  const getCreateLabel = (nav: NavKey): string => {
    switch (nav) {
      case "Master List": return "+ Add Station";
      case "Assets": return "+ Add Asset";
      case "LC Gate": return "+ Add LC Gate";
      case "Users & Roles": return "+ Add User";
      default: return "Create New";
    }
  };

  return (
    <article className="wide-list-container">
      <div className="tabular-header">
        <div className="header-title-section">
          <h2>{activeNav}</h2>
          <p>{["Asset Dashboard", "Daily Position"].includes(activeNav) ? "Overview of Telecom Assets and Operations" : `${activeNav} operations workspace`}</p>
        </div>
        <div className="header-controls-section">
          <div className="action-buttons-group">
            {shouldShowActionButtons && (
              <>
                <button
                  className="export-button"
                  style={{ background: "#f1f5f9", color: "#334155", borderColor: "#cbd5e1", margin: 0 }}
                  onClick={() => openPanel(`Import ${activeNav}`)}
                  type="button"
                >
                  Import Data
                </button>
                <button
                  className="export-button"
                  style={{ margin: 0 }}
                  onClick={handleCreateNew}
                  type="button"
                >
                  {getCreateLabel(activeNav)}
                </button>
              </>
            )}
          </div>
          <div className="search-filter-row">
            <input
              placeholder="Filter records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <button
              type="button"
              className={`filter-toggle-btn ${filterDivision || filterState || filterCategory || (activeNav === "Assets" && assetStatusFilter) ? "active" : ""}`}
              onClick={() => setFilterPopoverOpen(!filterPopoverOpen)}
            >
              <SlidersHorizontal size={16} />
              <span>Filters</span>
              {(filterDivision || filterState || filterCategory || (activeNav === "Assets" && assetStatusFilter)) && <span className="filter-active-dot" />}
            </button>

            {filterPopoverOpen && (
              <div className="filter-popover">
                <h4 className="filter-popover-title">Filter Records</h4>

                {/* Division Filter */}
                <div className="filter-group">
                  <label>Division</label>
                  <ClearableSelect value={filterDivision} onChange={setFilterDivision}>
                    <option value="">All Divisions</option>
                    {uniqueDivisions.map((div) => (
                      <option key={div} value={div}>{div}</option>
                    ))}
                  </ClearableSelect>
                </div>

                {/* State Filter */}
                <div className="filter-group">
                  <label>State</label>
                  <ClearableSelect value={filterState} onChange={setFilterState}>
                    <option value="">All States</option>
                    {uniqueStates.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </ClearableSelect>
                </div>

                {/* Category / Telecom Asset Filter */}
                <div className="filter-group">
                  <label>{activeNav === "Assets" ? "Telecom Asset" : "Category"}</label>
                  <ClearableSelect value={filterCategory} onChange={setFilterCategory}>
                    <option value="">{activeNav === "Assets" ? "All Telecom Assets" : "All Categories"}</option>
                    {categoriesList.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </ClearableSelect>
                </div>

                {/* Status Filter for Assets */}
                {activeNav === "Assets" && (
                  <div className="filter-group">
                    <label>Status</label>
                    <ClearableSelect
                      value={assetStatusFilter}
                      onChange={setAssetStatusFilter}
                    >
                      <option value="">All Statuses</option>
                      <option value="OPERATIONAL">Operational</option>
                      <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                      <option value="FAULTY">Faulty</option>
                      <option value="OBSOLETE">Obsolete</option>
                    </ClearableSelect>
                  </div>
                )}

                <div className="filter-popover-footer">
                  <button
                    type="button"
                    className="filter-reset-btn"
                    onClick={() => {
                      setFilterDivision("");
                      setFilterState("");
                      setFilterCategory("");
                      if (activeNav === "Assets") setAssetStatusFilter("");
                      setFilterPopoverOpen(false);
                    }}
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    className="filter-apply-btn"
                    onClick={() => setFilterPopoverOpen(false)}
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {renderContent()}
    </article>
  );
}

// Centered Modal for Asset Details
function AssetDetailsModal({ itemId, close, queries }: { itemId: string; close: () => void; queries: any }) {
  const asset = queries.assetsQuery.data?.data.find((a: any) => a.id === itemId);
  if (!asset) return null;

  let specs = {};
  try {
    specs = typeof asset.specifications === "string" ? JSON.parse(asset.specifications) : asset.specifications;
  } catch (e) {
    // ignore
  }

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "OPERATIONAL": return "var(--green)";
      case "UNDER_MAINTENANCE": return "var(--amber)";
      case "FAULTY": return "var(--red)";
      default: return "var(--muted)";
    }
  };

  return (
    <div
      className="modal-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "rgba(10, 20, 42, 0.45)",
        backdropFilter: "blur(8px)",
      }}
      onClick={close}
    >
      <div
        className="modal-card"
        style={{
          width: "min(680px, calc(100vw - 32px))",
          background: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 24px 60px rgba(10, 20, 42, 0.22)",
          border: "1px solid var(--line)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "zoomIn 200ms cubic-bezier(0.16, 1, 0.3, 1)",
          maxHeight: "90vh"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", color: "var(--blue)" }}>
              Telecom Asset Card
            </span>
            <h3 style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 850 }}>
              {asset.rdsoSpec || getTelecomAssetName(asset)}
            </h3>
          </div>
          <button
            onClick={close}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: 0,
              color: "#fff",
              width: 36,
              height: 36,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              transition: "background 0.2s"
            }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="modal-body">
          {/* Main Info Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", background: "#f8fafd", padding: 12, borderRadius: 10, border: "1px solid #edf2f9" }}>
              <div style={{ width: 42, height: 42, borderRadius: 8, background: "var(--blue-soft)", color: "var(--blue)", display: "grid", placeItems: "center" }}>
                <Box size={20} />
              </div>
              <div>
                <small style={{ display: "block", fontSize: 10, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>Telecom Asset</small>
                <strong style={{ fontSize: 14, color: "var(--navy)" }}>{getTelecomAssetName(asset)}</strong>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "center", background: "#f8fafd", padding: 12, borderRadius: 10, border: "1px solid #edf2f9" }}>
              <div style={{ width: 42, height: 42, borderRadius: 8, background: "var(--amber-soft)", color: "var(--amber)", display: "grid", placeItems: "center" }}>
                <FileText size={20} />
              </div>
              <div>
                <small style={{ display: "block", fontSize: 10, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>RDSO Spec / Version</small>
                <strong style={{ fontSize: 14, color: "var(--navy)" }}>{asset.rdsoSpec || "-"}</strong>
              </div>
            </div>

            {/* Station */}
            <div style={{ display: "flex", gap: 12, alignItems: "center", background: "#f8fafd", padding: 12, borderRadius: 10, border: "1px solid #edf2f9" }}>
              <div style={{ width: 42, height: 42, borderRadius: 8, background: "var(--purple-soft)", color: "var(--purple)", display: "grid", placeItems: "center" }}>
                <Train size={20} />
              </div>
              <div>
                <small style={{ display: "block", fontSize: 10, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>Station Link</small>
                <strong style={{ fontSize: 14, color: "var(--navy)" }}>{asset.stationCode}</strong>
              </div>
            </div>

            {/* Make */}
            <div style={{ display: "flex", gap: 12, alignItems: "center", background: "#f8fafd", padding: 12, borderRadius: 10, border: "1px solid #edf2f9" }}>
              <div style={{ width: 42, height: 42, borderRadius: 8, background: "var(--green-soft)", color: "var(--green)", display: "grid", placeItems: "center" }}>
                <RadioTower size={20} />
              </div>
              <div>
                <small style={{ display: "block", fontSize: 10, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>Make</small>
                <strong style={{ fontSize: 14, color: "var(--navy)" }}>{asset.make || "-"}</strong>
              </div>
            </div>

            {/* Model */}
            <div style={{ display: "flex", gap: 12, alignItems: "center", background: "#f8fafd", padding: 12, borderRadius: 10, border: "1px solid #edf2f9" }}>
              <div style={{ width: 42, height: 42, borderRadius: 8, background: "var(--teal-soft)", color: "var(--teal)", display: "grid", placeItems: "center" }}>
                <Box size={20} />
              </div>
              <div>
                <small style={{ display: "block", fontSize: 10, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>Model</small>
                <strong style={{ fontSize: 14, color: "var(--navy)" }}>{asset.model || "-"}</strong>
              </div>
            </div>

            {/* Status */}
            <div style={{ display: "flex", gap: 12, alignItems: "center", background: "#f8fafd", padding: 12, borderRadius: 10, border: "1px solid #edf2f9" }}>
              <div style={{ width: 42, height: 42, borderRadius: 8, background: `${getStatusColor(asset.status)}20`, color: getStatusColor(asset.status), display: "grid", placeItems: "center" }}>
                <ShieldCheck size={20} />
              </div>
              <div>
                <small style={{ display: "block", fontSize: 10, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>Operational Status</small>
                <span className={`pill ${asset.status.toLowerCase()}`} style={{ display: "inline-block", marginTop: 2, fontSize: 11.5 }}>{asset.status}</span>
              </div>
            </div>
          </div>

          {/* Location & Spec Card */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
            <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 16 }}>
              <small style={{ display: "block", fontSize: 11, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>Installation Location</small>
              <p style={{ margin: "6px 0 0", fontSize: 14, fontWeight: 600, color: "var(--navy)" }}>
                {asset.installLocation || "No installation coordinates/location specified."}
              </p>
            </div>

          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            {[
              { label: "Date of Installation", value: asset.dop },
              { label: "Equipment", value: asset.assetMode === ASSET_MODE_HAS_EQUIPMENT ? asset.equipmentName : "" },
              { label: "Work Name", value: asset.workName },
              { label: "Connected With", value: asset.connectedWith },
              { label: "Forward Inspection", value: asset.forwardInspection },
              { label: "Backward Inspection", value: asset.backwardInspection },
              { label: "Display Board", value: asset.displayBoard || (asset.dbCount !== null && asset.dbCount !== undefined ? String(asset.dbCount) : "") },
              { label: "Maintenance Validity", value: asset.maintenanceValidity === MAINTENANCE_NOT_AVAILABLE ? "Not Available" : asset.maintenanceValidity },
              { label: "Maintenance Period", value: asset.maintenanceFrom && asset.maintenanceTo ? `${String(asset.maintenanceFrom).slice(0, 10)} to ${String(asset.maintenanceTo).slice(0, 10)}` : "" },
            ].map(item => (
              <div key={item.label} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 12 }}>
                <small style={{ display: "block", fontSize: 10, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>{item.label}</small>
                <strong style={{ display: "block", marginTop: 4, fontSize: 13, color: "var(--navy)" }}>{item.value || "-"}</strong>
              </div>
            ))}
          </div>

          {/* Remarks Section */}
          <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 16 }}>
            <small style={{ display: "block", fontSize: 11, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>Operational Remarks / Notes</small>
            <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--navy)", lineHeight: 1.5 }}>
              {asset.remarks || "No active warning notes or service remarks logged for this telecom hardware inventory."}
            </p>
          </div>

          {/* Technical Specifications Section */}
          <div>
            <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 800, color: "var(--navy)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Technical Parameters
            </h4>
            {specs && Object.entries(specs).length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                {Object.entries(specs).map(([key, val]: any) => (
                  <div key={key} style={{ background: "#f8fafd", border: "1px solid #edf2f9", borderRadius: 10, padding: "12px 16px" }}>
                    <span style={{ display: "block", fontSize: 11, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>
                      {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}
                    </span>
                    <strong style={{ display: "block", fontSize: 15, color: "var(--navy)", marginTop: 4 }}>
                      {typeof val === "object" ? JSON.stringify(val) : String(val)}
                    </strong>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: "16px 20px", background: "#f8fafd", border: "1px dashed var(--line)", borderRadius: 10, textAlign: "center", color: "var(--muted)" }}>
                No custom technical parameters defined.
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button
            onClick={close}
            className="export-button"
            style={{
              margin: 0,
              minHeight: 38,
              padding: "0 20px",
              background: "var(--blue)",
              border: 0,
              borderRadius: 8,
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            Close Details
          </button>
        </div>
      </div>
      <style>{`
        @keyframes zoomIn {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}



// Centered Modal for User Details
function UserDetailsModal({ itemId, close, queries }: { itemId: string; close: () => void; queries: any }) {
  const userObj = queries.usersQuery.data?.data.find((u: any) => u.id === itemId);
  if (!userObj) return null;

  return (
    <div
      className="modal-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "rgba(10, 20, 42, 0.45)",
        backdropFilter: "blur(8px)",
      }}
      onClick={close}
    >
      <div
        className="modal-card"
        style={{
          width: "min(520px, calc(100vw - 32px))",
          background: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 24px 60px rgba(10, 20, 42, 0.22)",
          border: "1px solid var(--line)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "zoomIn 200ms cubic-bezier(0.16, 1, 0.3, 1)",
          maxHeight: "90vh"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", color: "var(--blue)" }}>
              User Account Card
            </span>
            <h3 style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 850 }}>
              {userObj.name}
            </h3>
          </div>
          <button
            onClick={close}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: 0,
              color: "#fff",
              width: 36,
              height: 36,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              transition: "background 0.2s"
            }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="modal-body" style={{ gap: 20 }}>
          {/* Main profile visual */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, borderBottom: "1px solid var(--line)", paddingBottom: 20 }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "linear-gradient(135deg, var(--blue) 0%, var(--purple) 100%)",
              color: "#fff",
              fontSize: 24,
              fontWeight: 800,
              display: "grid",
              placeItems: "center"
            }}>
              {userObj.name ? userObj.name.charAt(0).toUpperCase() : "?"}
            </div>
            <div>
              <strong style={{ fontSize: 18, color: "var(--navy)", display: "block" }}>{userObj.name}</strong>
              <span style={{ color: "var(--muted)", fontSize: 13 }}>@{userObj.username}</span>
            </div>
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            {/* Role and Division */}
            <div style={{ display: "grid", gridTemplateColumns: (userObj.role === "SUPER_ADMIN" || userObj.role === "ALL_DIVISION_VIEWER") ? "1fr" : "1fr 1fr", gap: 16 }}>
              <div>
                <small style={{ display: "block", fontSize: 10, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>System Role</small>
                <span className="pill info" style={{ display: "inline-block", marginTop: 4, fontSize: 12 }}>{userObj.role}</span>
              </div>
              {userObj.role !== "SUPER_ADMIN" && userObj.role !== "ALL_DIVISION_VIEWER" && (
                <div>
                  <small style={{ display: "block", fontSize: 10, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>Division</small>
                  <strong style={{ display: "block", fontSize: 14, color: "var(--navy)", marginTop: 4 }}>{normalizeDivision(userObj.division) || "HQ"}</strong>
                </div>
              )}
            </div>

            {/* Designation */}
            {userObj.role !== "SUPER_ADMIN" && userObj.role !== "DIVISIONAL_ADMIN" && userObj.role !== "ALL_DIVISION_VIEWER" && (
              <div>
                <small style={{ display: "block", fontSize: 10, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>Designation</small>
                <strong style={{ display: "block", fontSize: 14, color: "var(--navy)", marginTop: 4 }}>{userObj.designation || "-"}</strong>
              </div>
            )}

            {/* Member Since */}
            <div>
              <small style={{ display: "block", fontSize: 10, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>Account Created On</small>
              <strong style={{ display: "block", fontSize: 14, color: "var(--navy)", marginTop: 4 }}>
                {formatDate24(userObj.createdAt)} at {formatTime24(userObj.createdAt)}
              </strong>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button
            onClick={close}
            className="export-button"
            style={{
              margin: 0,
              minHeight: 38,
              padding: "0 20px",
              background: "var(--blue)",
              border: 0,
              borderRadius: 8,
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            Close Details
          </button>
        </div>
      </div>
      <style>{`
        @keyframes zoomIn {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

// Centered Modal for Station Details
function StationDetailsModal({ itemId, close, queries }: { itemId: string; close: () => void; queries: any }) {
  const station = queries.stationsQuery.data?.data.find((s: any) => s.id === itemId || s.code === itemId);
  if (!station) return null;

  const capList = [
    { key: "hasIpis", label: "IPIS" },
    { key: "hasPaSystem", label: "PA System" },
    { key: "hasCctv", label: "CCTV" },
    { key: "hasUts", label: "UTS" },
    { key: "hasPrs", label: "PRS" },
    { key: "hasFois", label: "FOIS" },
    { key: "hasDigitalClock", label: "Digital Clock" },
    { key: "hasWifi", label: "Wi-Fi" },
    { key: "hasExchange", label: "Exchange" },
    { key: "hasTalkback", label: "Talkback" },
    { key: "hasPms", label: "PMS" },
    { key: "hasCms", label: "CMS" },
    { key: "hasAtvm", label: "ATVM" },
    { key: "hasArt", label: "ART" },
    { key: "hasVhf25W", label: "VHF (25W)" },
    { key: "hasControlTelephoneVoip", label: "VoIP Control Phone" },
    { key: "hasCgsCgdb", label: "CGS / CGDB" },
    { key: "hasTib", label: "TIB" },
    { key: "hasAgdb", label: "AGDB" },
    { key: "hasAutoAnnouncement", label: "Auto Announcement" },
    { key: "hasAnalogClock", label: "Analog Clock" },
    { key: "hasGpsClock", label: "GPS Clock" },
    { key: "hasCoachGuidanceDisplay", label: "Coach Guidance Display" },
    { key: "hasTrainIndicationBoard", label: "Train Indication Board" },
    { key: "hasDigitalDisplayHeritage", label: "Heritage Digital Display" },
    { key: "hasAtAGlanceBoard", label: "At A Glance Board" },
    { key: "hasCctvDe", label: "CCTV DE" }
  ];

  return (
    <div
      className="modal-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "rgba(10, 20, 42, 0.45)",
        backdropFilter: "blur(8px)",
      }}
      onClick={close}
    >
      <div
        className="modal-card"
        style={{
          width: "min(720px, calc(100vw - 32px))",
          background: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 24px 60px rgba(10, 20, 42, 0.22)",
          border: "1px solid var(--line)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "zoomIn 200ms cubic-bezier(0.16, 1, 0.3, 1)",
          maxHeight: "90vh"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", color: "var(--blue)" }}>
              Station Master Card
            </span>
            <h3 style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 850 }}>
              {station.name} ({station.code})
            </h3>
          </div>
          <button
            onClick={close}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: 0,
              color: "#fff",
              width: 36,
              height: 36,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              transition: "background 0.2s"
            }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="modal-body">
          {/* Main Info Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
            {/* Division */}
            <div style={{ display: "flex", gap: 12, alignItems: "center", background: "#f8fafd", padding: 12, borderRadius: 10, border: "1px solid #edf2f9" }}>
              <div style={{ width: 42, height: 42, borderRadius: 8, background: "var(--blue-soft)", color: "var(--blue)", display: "grid", placeItems: "center" }}>
                <MapPin size={20} />
              </div>
              <div>
                <small style={{ display: "block", fontSize: 10, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>Division</small>
                <strong style={{ fontSize: 14, color: "var(--navy)" }}>{normalizeDivision(station.division)}</strong>
              </div>
            </div>

            {/* Category */}
            <div style={{ display: "flex", gap: 12, alignItems: "center", background: "#f8fafd", padding: 12, borderRadius: 10, border: "1px solid #edf2f9" }}>
              <div style={{ width: 42, height: 42, borderRadius: 8, background: "var(--purple-soft)", color: "var(--purple)", display: "grid", placeItems: "center" }}>
                <Layers size={20} />
              </div>
              <div>
                <small style={{ display: "block", fontSize: 10, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>Category</small>
                <strong style={{ fontSize: 14, color: "var(--navy)" }}>{station.category || "NSG-2"}</strong>
              </div>
            </div>

            {/* State */}
            <div style={{ display: "flex", gap: 12, alignItems: "center", background: "#f8fafd", padding: 12, borderRadius: 10, border: "1px solid #edf2f9" }}>
              <div style={{ width: 42, height: 42, borderRadius: 8, background: "var(--green-soft)", color: "var(--green)", display: "grid", placeItems: "center" }}>
                <Train size={20} />
              </div>
              <div>
                <small style={{ display: "block", fontSize: 10, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>State</small>
                <strong style={{ fontSize: 14, color: "var(--navy)" }}>{station.state || "-"}</strong>
              </div>
            </div>
          </div>

          {/* Location Description */}
          <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 16 }}>
            <small style={{ display: "block", fontSize: 11, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>Location Description</small>
            <p style={{ margin: "6px 0 0", fontSize: 14, fontWeight: 600, color: "var(--navy)" }}>
              {station.locationName || "No specific location coordinates/description configured."}
            </p>
          </div>

          {/* Commissioned Under Section */}
          <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 16 }}>
            <small style={{ display: "block", fontSize: 11, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>Commissioned Under</small>
            <div style={{ marginTop: 8, display: "grid", gap: 10 }}>
              <div>
                <strong style={{ fontSize: 13, color: "var(--navy)" }}>ABSS: </strong>
                <span style={{ fontSize: 13, color: "var(--navy)", fontWeight: 550 }}>
                  {station.commissionedAbss && station.commissionedAbss.length > 0
                    ? station.commissionedAbss.map((k: string) => TELECOM_ASSET_CHECKS.find(c => c.key === k)?.label || k).join(", ")
                    : "None"
                  }
                </span>
              </div>
              <div>
                <strong style={{ fontSize: 13, color: "var(--navy)" }}>Divisional Work: </strong>
                <span style={{ fontSize: 13, color: "var(--navy)", fontWeight: 550 }}>
                  {station.commissionedDivisional && station.commissionedDivisional.length > 0
                    ? station.commissionedDivisional.map((k: string) => TELECOM_ASSET_CHECKS.find(c => c.key === k)?.label || k).join(", ")
                    : "None"
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Capabilities Grid Checklist */}
          <div>
            <h4 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 800, color: "var(--navy)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Telecom Assets Checklist
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
              {capList.map((cap) => {
                const isEnabled = !!station[cap.key];
                return (
                  <div
                    key={cap.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 14px",
                      borderRadius: 8,
                      background: isEnabled ? "var(--green-soft)" : "#f8fafc",
                      border: isEnabled ? "1px solid rgba(13, 183, 107, 0.25)" : "1px solid var(--line)",
                      opacity: isEnabled ? 1 : 0.65
                    }}
                  >
                    <div style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: isEnabled ? "var(--green)" : "#cbd5e1",
                      color: "#fff",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 11,
                      fontWeight: 800
                    }}>
                      {isEnabled ? "✓" : "✕"}
                    </div>
                    <span style={{
                      fontSize: 13.5,
                      fontWeight: isEnabled ? 700 : 550,
                      color: isEnabled ? "var(--navy)" : "var(--muted)"
                    }}>
                      {cap.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button
            onClick={close}
            className="export-button"
            style={{
              margin: 0,
              minHeight: 38,
              padding: "0 20px",
              background: "var(--blue)",
              border: 0,
              borderRadius: 8,
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            Close Details
          </button>
        </div>
      </div>
      <style>{`
        @keyframes zoomIn {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

// Action Drawer Panel (Form handling and live APIs integration)
function ActionPanel({
  title,
  itemId,
  close,
  queries,
  showToast
}: {
  title: string;
  itemId: string | null;
  close: () => void;
  queries: any;
  showToast: (msg: string) => void;
}) {
  const queryClient = useQueryClient();
  const { role } = useAppStore();
  const canEditStations = ["SUPER_ADMIN", "DIVISIONAL_ADMIN", "SSE"].includes(role || "");
  const canEditAssets = ["SUPER_ADMIN", "DIVISIONAL_ADMIN", "SSE", "TECHNICIAN"].includes(role || "");
  const canEditGates = ["SUPER_ADMIN", "DIVISIONAL_ADMIN", "SSE", "TECHNICIAN"].includes(role || "");
  const stations = queries.stationsQuery?.data?.data || [];
  const uniqueDivisions = Array.from(new Set(stations.map((s: any) => s.division).filter(Boolean).map(normalizeDivision))) as string[];


  // Mutation definitions
  const createAsset = useMutation({
    mutationFn: (body: any) => api.assets.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets-list"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      showToast("Asset registered successfully.");
      close();
    },
    onError: (err: any) => showToast(err.message || "Failed to create asset.")
  });



  const createStation = useMutation({
    mutationFn: (body: any) => api.stations.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stations-list"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      showToast("Master List registered.");
      close();
    },
    onError: (err: any) => showToast(err.message || "Failed to register station.")
  });

  const createLcGate = useMutation({
    mutationFn: (body: any) => api.gates.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gates-list"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      showToast("LC Gate registered.");
      close();
    },
    onError: (err: any) => showToast(err.message || "Failed to register LC gate.")
  });



  const changeUserRole = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => api.auth.updateRole(id, body),
    onSuccess: async (response: any) => {
      // Immediately patch the cache with the fresh values returned by the server.
      // This makes the drawer read the correct state if it is re-opened before
      // the background refetch completes.
      const updatedUser = response?.data;
      if (updatedUser) {
        queryClient.setQueryData(["users-list"], (old: any) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((u: any) =>
              u.id === updatedUser.id ? { ...u, ...updatedUser } : u
            ),
          };
        });
      }
      // Force a full refetch so the cache is fresh from the DB.
      // We do NOT await it — close immediately, the cache is already patched above.
      queryClient.refetchQueries({ queryKey: ["users-list"] });
      showToast("User details updated.");
      close();
    },
    onError: (err: any) => showToast(err.message || "Failed to update role.")
  });

  const createUser = useMutation({
    mutationFn: (body: any) => api.auth.register(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-list"] });
      showToast("User added successfully.");
      close();
    },
    onError: (err: any) => showToast(err.message || "Failed to add user.")
  });

  const updateStation = useMutation({
    mutationFn: ({ code, body }: { code: string; body: any }) => api.stations.update(code, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stations-list"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      showToast("Station details updated.");
      close();
    },
    onError: (err: any) => showToast(err.message || "Failed to update station.")
  });

  const updateAsset = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => api.assets.update(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets-list"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      showToast("Asset updated successfully.");
      close();
    },
    onError: (err: any) => showToast(err.message || "Failed to update asset.")
  });

  const updateLcGate = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => api.gates.update(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gates-list"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      showToast("LC Gate updated successfully.");
      close();
    },
    onError: (err: any) => showToast(err.message || "Failed to update LC Gate.")
  });

  // State definitions for forms
  const [assetCategory, setAssetCategory] = useState("IPIS");
  const [assetMode, setAssetMode] = useState(ASSET_MODE_STANDALONE);
  const [assetEquipmentName, setAssetEquipmentName] = useState("");
  const [assetStation, setAssetStation] = useState("");
  const [assetMake, setAssetMake] = useState("");
  const [assetModel, setAssetModel] = useState("");
  const [assetSerial, setAssetSerial] = useState("");
  const [assetRdsoSpec, setAssetRdsoSpec] = useState("");
  const [assetDop, setAssetDop] = useState("");
  const [assetWorkName, setAssetWorkName] = useState("");
  const [assetConnectedWith, setAssetConnectedWith] = useState<string[]>([]);
  const [assetForwardInspection, setAssetForwardInspection] = useState("");
  const [assetBackwardInspection, setAssetBackwardInspection] = useState("");
  const [assetDbCount, setAssetDbCount] = useState("");
  const [assetMaintenanceValidity, setAssetMaintenanceValidity] = useState(MAINTENANCE_NOT_AVAILABLE);
  const [assetMaintenanceFrom, setAssetMaintenanceFrom] = useState("");
  const [assetMaintenanceTo, setAssetMaintenanceTo] = useState("");
  const [assetLocation, setAssetLocation] = useState("");
  const [assetRemarks, setAssetRemarks] = useState("");
  const [assetSpecs, setAssetSpecs] = useState('{"controllerIp": "10.120.45.15"}');
  const [assetStatus, setAssetStatus] = useState("OPERATIONAL");
  const [assetSpecFields, setAssetSpecFields] = useState<{ key: string; val: string }[]>([]);

  const handleCategoryChange = (cat: string) => {
    setAssetCategory(cat);
    let defaults: { key: string; val: string }[] = [];
    switch (cat) {
      case "IPIS":
        defaults = [
          { key: "controllerIp", val: "" },
          { key: "numberOfCgds", val: "" },
          { key: "numberOfPdds", val: "" }
        ];
        break;
      case "CCTV":
        defaults = [
          { key: "ipAddress", val: "" },
          { key: "numberOfCameras", val: "" },
          { key: "nvrIp", val: "" }
        ];
        break;
      case "PA System":
        defaults = [
          { key: "amplifierWattage", val: "" },
          { key: "numberOfSpeakers", val: "" }
        ];
        break;
      case "UTS":
      case "PRS":
        defaults = [
          { key: "terminalIp", val: "" },
          { key: "printerModel", val: "" }
        ];
        break;
      case "VHF":
        defaults = [
          { key: "frequency", val: "" },
          { key: "powerOutput", val: "" }
        ];
        break;
      case "OFC":
        defaults = [
          { key: "fiberCoreCount", val: "" },
          { key: "interfaceType", val: "" }
        ];
        break;
      default:
        defaults = [{ key: "remarks", val: "" }];
        break;
    }
    setAssetSpecFields(defaults);
  };



  const [stationName, setStationName] = useState("");
  const [stationCode, setStationCode] = useState("");
  const [stationDivision, setStationDivision] = useState("Raipur");
  const [stationCategory, setStationCategory] = useState("NSG-2");
  const [stationState, setStationState] = useState("Chhattisgarh");
  const [stationChecks, setStationChecks] = useState<Record<string, boolean>>({
    hasIpis: false, hasPaSystem: false, hasCctv: false, hasUts: false, hasPrs: false,
    hasFois: false, hasDigitalClock: false, hasWifi: false, hasExchange: false, hasTalkback: false,
    hasPms: false, hasCms: false, hasAtvm: false, hasArt: false, hasVhf25W: false,
    hasControlTelephoneVoip: false, hasCgsCgdb: false, hasTib: false, hasAgdb: false,
    hasAutoAnnouncement: false, hasAnalogClock: false, hasGpsClock: false,
    hasCoachGuidanceDisplay: false, hasTrainIndicationBoard: false,
    hasDigitalDisplayHeritage: false, hasAtAGlanceBoard: false, hasCctvDe: false
  });
  const [commissionedAbss, setCommissionedAbss] = useState<string[]>([]);
  const [commissionedDivisional, setCommissionedDivisional] = useState<string[]>([]);

  const [gateNumber, setGateNumber] = useState("");
  const [gateName, setGateName] = useState("");
  const [gateCategory, setGateCategory] = useState("Interlocked");
  const [gateKm, setGateKm] = useState("");
  const [gateSection, setGateSection] = useState("");
  const [gateLocName, setGateLocName] = useState("");
  const [gateStation, setGateStation] = useState("");

  // Resolving/Assigning states




  // Role edit states
  const [newRole, setNewRole] = useState("SSE");
  const [newDesignation, setNewDesignation] = useState("");
  const [editName, setEditName] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editAccessAssets, setEditAccessAssets] = useState(true);
  const [editAccessDailyPosition, setEditAccessDailyPosition] = useState(true);

  // Add User states
  const [addUsername, setAddUsername] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addName, setAddName] = useState("");
  const [addRole, setAddRole] = useState<UserRole>("SSE");
  const [addDesignation, setAddDesignation] = useState("");
  const [addDivision, setAddDivision] = useState("Raipur");
  const [addAccessAssets, setAddAccessAssets] = useState(true);
  const [addAccessDailyPosition, setAddAccessDailyPosition] = useState(true);

  // Station Details — selected capability key (for inline asset card or "not registered" notice)
  const [selectedCapKey, setSelectedCapKey] = useState<string | null>(null);

  // Populate drop down selections when drawer opens
  useEffect(() => {
    const stations = queries.stationsQuery.data?.data || [];
    const assets = queries.assetsQuery.data?.data || [];
    if (stations.length > 0) {
      setAssetStation(stations[0].code);
      setGateStation(stations[0].code);
    }


    if (title === "Add User") {
      setAddUsername("");
      setAddPassword("");
      setAddName("");
      setAddRole("SSE");
      setAddDesignation("");
      setAddDivision(useAppStore.getState().user?.division || "Raipur");
      setAddAccessAssets(true);
      setAddAccessDailyPosition(true);
    }

    if (title === "Add Station" || title === "Create Station") {
      setStationName("");
      setStationCode("");
      setStationDivision("Raipur");
      setStationCategory("NSG-2");
      setStationState("Chhattisgarh");
      setStationChecks({
        hasIpis: false, hasPaSystem: false, hasCctv: false, hasUts: false, hasPrs: false,
        hasFois: false, hasDigitalClock: false, hasWifi: false, hasExchange: false, hasTalkback: false,
        hasPms: false, hasCms: false, hasAtvm: false, hasArt: false, hasVhf25W: false,
        hasControlTelephoneVoip: false, hasCgsCgdb: false, hasTib: false, hasAgdb: false,
        hasAutoAnnouncement: false, hasAnalogClock: false, hasGpsClock: false,
        hasCoachGuidanceDisplay: false, hasTrainIndicationBoard: false,
        hasDigitalDisplayHeritage: false, hasAtAGlanceBoard: false, hasCctvDe: false
      });
      setCommissionedAbss([]);
      setCommissionedDivisional([]);
    }

    if (title === "Add Asset" || title === "Create Asset") {
      setAssetCategory("IPIS");
      setAssetMode(ASSET_MODE_STANDALONE);
      setAssetEquipmentName("");
      setAssetMake("");
      setAssetModel("");
      setAssetSerial("");
      setAssetRdsoSpec("");
      setAssetDop("");
      setAssetWorkName("");
      setAssetConnectedWith([]);
      setAssetForwardInspection("");
      setAssetBackwardInspection("");
      setAssetDbCount("");
      setAssetMaintenanceValidity(MAINTENANCE_NOT_AVAILABLE);
      setAssetMaintenanceFrom("");
      setAssetMaintenanceTo("");
      setAssetLocation("");
      setAssetRemarks("");
      setAssetSpecs('{"controllerIp": "10.120.45.15"}');
      setAssetStatus("OPERATIONAL");
      setAssetSpecFields([
        { key: "controllerIp", val: "" },
        { key: "numberOfCgds", val: "" },
        { key: "numberOfPdds", val: "" }
      ]);
    }

    if (title === "Add LC Gate" || title === "Create LC Gate") {
      setGateNumber("");
      setGateName("");
      setGateCategory("Interlocked");
      setGateKm("");
      setGateSection("");
      setGateLocName("");
      setGateStation("");
    }

    if (itemId) {
      if (title === "Change User Role" || title === "Manage User") {
        const userObj = queries.usersQuery.data?.data.find((u: any) => u.id === itemId);
        if (userObj) {
          setNewRole(userObj.role);
          setNewDesignation(userObj.designation || "");
          setStationDivision(userObj.division || "Raipur");
          setEditName(userObj.name || "");
          setEditPassword("");
          setEditAccessAssets(userObj.accessAssets !== false);
          setEditAccessDailyPosition(userObj.accessDailyPosition !== false);
        }
      } else if (title === "Edit Station") {
        const s = queries.stationsQuery.data?.data.find((station: any) => station.id === itemId);
        if (s) {
          setStationName(s.name || "");
          setStationCode(s.code || "");
          setStationDivision(s.division || "Raipur");
          setStationCategory(s.category || "NSG-2");
          setStationState(s.state || "Chhattisgarh");

          const checks: Record<string, boolean> = {};
          const defaultChecksKeys = [
            "hasIpis", "hasPaSystem", "hasCctv", "hasUts", "hasPrs",
            "hasFois", "hasDigitalClock", "hasWifi", "hasExchange", "hasTalkback",
            "hasPms", "hasCms", "hasAtvm", "hasArt", "hasVhf25W",
            "hasControlTelephoneVoip", "hasCgsCgdb", "hasTib", "hasAgdb",
            "hasAutoAnnouncement", "hasAnalogClock", "hasGpsClock",
            "hasCoachGuidanceDisplay", "hasTrainIndicationBoard",
            "hasDigitalDisplayHeritage", "hasAtAGlanceBoard", "hasCctvDe"
          ];
          defaultChecksKeys.forEach(key => {
            checks[key] = !!s[key];
          });
          setStationChecks(checks);
          setCommissionedAbss(s.commissionedAbss || []);
          setCommissionedDivisional(s.commissionedDivisional || []);
        }
      } else if (title === "Edit Asset") {
        const a = queries.assetsQuery.data?.data.find((asset: any) => asset.id === itemId);
        if (a) {
          setAssetCategory(getTelecomAssetName(a) || "IPIS");
          setAssetMode(a.assetMode || ASSET_MODE_STANDALONE);
          setAssetEquipmentName(a.equipmentName || "");
          setAssetMake(a.make || "");
          setAssetModel(a.model || "");
          setAssetSerial(a.serialNumber || "");
          setAssetRdsoSpec(a.rdsoSpec || "");
          setAssetDop(a.dop || "");
          setAssetWorkName(a.workName || "");
          setAssetConnectedWith(splitConnectedWith(a.connectedWith));
          setAssetForwardInspection(a.forwardInspection || "");
          setAssetBackwardInspection(a.backwardInspection || "");
          setAssetDbCount(a.displayBoard || (a.dbCount !== null && a.dbCount !== undefined ? String(a.dbCount) : ""));
          setAssetMaintenanceValidity(a.maintenanceValidity || MAINTENANCE_NOT_AVAILABLE);
          setAssetMaintenanceFrom(a.maintenanceFrom ? String(a.maintenanceFrom).slice(0, 10) : "");
          setAssetMaintenanceTo(a.maintenanceTo ? String(a.maintenanceTo).slice(0, 10) : "");
          setAssetLocation(a.installLocation || "");
          setAssetRemarks(a.remarks || "");
          setAssetSpecs(a.specifications ? (typeof a.specifications === "string" ? a.specifications : JSON.stringify(a.specifications, null, 2)) : "{}");
          setAssetStatus(a.status || "OPERATIONAL");

          let parsedFields: { key: string; val: string }[] = [];
          if (a.specifications) {
            try {
              const specsObj = typeof a.specifications === "string" ? JSON.parse(a.specifications) : a.specifications;
              parsedFields = Object.entries(specsObj).map(([k, v]) => ({
                key: k,
                val: typeof v === "object" ? JSON.stringify(v) : String(v)
              }));
            } catch (e) {
              console.error("Failed to parse specifications JSON", e);
            }
          }
          setAssetSpecFields(parsedFields);

          // Populate the asset's linked station if valid
          if (a.stationCode) {
            setAssetStation(a.stationCode);
          }
        }
      } else if (title === "Edit LC Gate") {
        const g = queries.gatesQuery.data?.data.find((gate: any) => gate.id === itemId);
        if (g) {
          setGateNumber(g.gateNumber || "");
          setGateName(g.name || "");
          setGateCategory(g.category || "Interlocked");
          setGateKm(g.km || "");
          setGateSection(g.section || "");
          setGateLocName(g.locationName || "");
          setGateStation(g.stationCode || "");
        }
      }
    }
  }, [itemId, title]); // eslint-disable-line react-hooks/exhaustive-deps


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.startsWith("Add Asset") || title.startsWith("Create Asset")) {
      if (assetConnectedWith.length === 0) {
        showToast("Please select at least one Connected With option.");
        return;
      }

      const specsObj: Record<string, any> = {};
      assetSpecFields.forEach(f => {
        if (f.key.trim()) {
          const valTrim = f.val.trim();
          let parsedVal: any = valTrim;
          if (valTrim.toLowerCase() === "true") parsedVal = true;
          else if (valTrim.toLowerCase() === "false") parsedVal = false;
          else if (!isNaN(Number(valTrim)) && valTrim !== "") parsedVal = Number(valTrim);
          specsObj[f.key.trim()] = parsedVal;
        }
      });

      createAsset.mutate({
        telecomAsset: assetCategory,
        category: assetCategory,
        assetMode,
        equipmentName: assetMode === ASSET_MODE_HAS_EQUIPMENT ? assetEquipmentName : null,
        stationCode: assetStation,
        make: assetMake,
        model: assetModel,
        serialNumber: assetSerial,
        rdsoSpec: assetRdsoSpec,
        dop: assetDop,
        workName: assetWorkName,
        connectedWith: assetConnectedWith.join(", "),
        forwardInspection: assetForwardInspection,
        backwardInspection: assetBackwardInspection,
        displayBoard: assetDbCount,
        maintenanceValidity: assetMaintenanceValidity,
        maintenanceFrom: assetMaintenanceValidity !== MAINTENANCE_NOT_AVAILABLE ? assetMaintenanceFrom : null,
        maintenanceTo: assetMaintenanceValidity !== MAINTENANCE_NOT_AVAILABLE ? assetMaintenanceTo : null,
        installLocation: assetLocation,
        status: assetStatus,
        remarks: assetRemarks,
        specifications: specsObj
      });

    } else if (title.startsWith("Add Station") || title.startsWith("Create Station")) {
      const activeKeys = Object.keys(stationChecks).filter(k => stationChecks[k]);
      createStation.mutate({
        name: stationName,
        code: stationCode,
        division: stationDivision,
        category: stationCategory,
        state: stationState,
        ...stationChecks,
        commissionedAbss: commissionedAbss.filter(k => activeKeys.includes(k)),
        commissionedDivisional: commissionedDivisional.filter(k => activeKeys.includes(k))
      });
    } else if (title.startsWith("Add LC Gate") || title.startsWith("Create LC Gate")) {
      createLcGate.mutate({
        gateNumber,
        name: gateName,
        category: gateCategory,
        km: gateKm,
        section: gateSection,
        locationName: gateLocName,
        stationCode: gateStation || undefined
      });

    } else if (title === "Change User Role" || title === "Manage User") {
      const isSuperOrAllDiv = newRole === "SUPER_ADMIN" || newRole === "ALL_DIVISION_VIEWER";
      const updatePayload: any = {
        role: newRole,
        designation: (newRole === "SUPER_ADMIN" || newRole === "DIVISIONAL_ADMIN" || newRole === "ALL_DIVISION_VIEWER") ? null : (newDesignation || null),
        division: isSuperOrAllDiv ? null : stationDivision,
        name: editName,
        accessAssets: editAccessAssets,
        accessDailyPosition: editAccessDailyPosition
      };
      if (editPassword) {
        updatePayload.password = editPassword;
      }
      changeUserRole.mutate({
        id: itemId!,
        body: updatePayload
      });
    } else if (title === "Add User") {
      const currentRole = useAppStore.getState().role;
      const userDiv = useAppStore.getState().user?.division || "Raipur";
      const isSuperOrAllDiv = addRole === "SUPER_ADMIN" || addRole === "ALL_DIVISION_VIEWER";
      createUser.mutate({
        username: addUsername,
        password: addPassword,
        name: addName,
        role: addRole,
        designation: (addRole === "SUPER_ADMIN" || addRole === "DIVISIONAL_ADMIN" || addRole === "ALL_DIVISION_VIEWER") ? undefined : addDesignation,
        division: isSuperOrAllDiv ? undefined : (currentRole === "SUPER_ADMIN" ? addDivision : userDiv),
        accessAssets: addAccessAssets,
        accessDailyPosition: addAccessDailyPosition
      });
    } else if (title.startsWith("Edit Station")) {
      const activeKeys = Object.keys(stationChecks).filter(k => stationChecks[k]);
      updateStation.mutate({
        code: stationCode,
        body: {
          name: stationName,
          division: stationDivision,
          category: stationCategory,
          state: stationState,
          ...stationChecks,
          commissionedAbss: commissionedAbss.filter(k => activeKeys.includes(k)),
          commissionedDivisional: commissionedDivisional.filter(k => activeKeys.includes(k))
        }
      });
    } else if (title.startsWith("Edit Asset")) {
      if (assetConnectedWith.length === 0) {
        showToast("Please select at least one Connected With option.");
        return;
      }

      const specsObj: Record<string, any> = {};
      assetSpecFields.forEach(f => {
        if (f.key.trim()) {
          const valTrim = f.val.trim();
          let parsedVal: any = valTrim;
          if (valTrim.toLowerCase() === "true") parsedVal = true;
          else if (valTrim.toLowerCase() === "false") parsedVal = false;
          else if (!isNaN(Number(valTrim)) && valTrim !== "") parsedVal = Number(valTrim);
          specsObj[f.key.trim()] = parsedVal;
        }
      });

      updateAsset.mutate({
        id: itemId!,
        body: {
          telecomAsset: assetCategory,
          assetMode,
          equipmentName: assetMode === ASSET_MODE_HAS_EQUIPMENT ? assetEquipmentName : null,
          make: assetMake,
          model: assetModel,
          serialNumber: assetSerial,
          rdsoSpec: assetRdsoSpec,
          dop: assetDop,
          workName: assetWorkName,
          connectedWith: assetConnectedWith.join(", "),
          forwardInspection: assetForwardInspection,
          backwardInspection: assetBackwardInspection,
          displayBoard: assetDbCount,
          maintenanceValidity: assetMaintenanceValidity,
          maintenanceFrom: assetMaintenanceValidity !== MAINTENANCE_NOT_AVAILABLE ? assetMaintenanceFrom : null,
          maintenanceTo: assetMaintenanceValidity !== MAINTENANCE_NOT_AVAILABLE ? assetMaintenanceTo : null,
          installLocation: assetLocation,
          status: assetStatus,
          remarks: assetRemarks,
          specifications: specsObj
        }
      });
    } else if (title.startsWith("Edit LC Gate")) {
      updateLcGate.mutate({
        id: itemId!,
        body: {
          name: gateName,
          category: gateCategory,
          section: gateSection,
          km: gateKm,
          locationName: gateLocName
        }
      });
    }
  };

  const renderForm = () => {
    if (title.startsWith("Import")) {
      const page = title.replace("Import ", "");
      return <ImportDrawerForm page={page} showToast={showToast} close={close} />;
    }

    if (title === "Add User") {
      const currentRole = useAppStore.getState().role;
      const userDiv = useAppStore.getState().user?.division || "Raipur";

      return (
        <form onSubmit={handleSubmit} className="form-drawer">
          <label>
            Full Name
            <input required value={addName} onChange={e => setAddName(e.target.value)} placeholder="e.g. R. K. Sharma" />
          </label>
          <label>
            Username
            <input required value={addUsername} onChange={e => setAddUsername(e.target.value)} placeholder="e.g. rksharma" />
          </label>
          <label>
            Password
            <input required type="password" value={addPassword} onChange={e => setAddPassword(e.target.value)} placeholder="••••••••" />
          </label>
          <label>
            System Role
            <ClearableSelect value={addRole} onChange={val => setAddRole(val as UserRole)}>
              <option value="">Select Role</option>
              {currentRole === "SUPER_ADMIN" ? (
                <>
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  <option value="DIVISIONAL_ADMIN">DIVISIONAL_ADMIN</option>
                  <option value="SSE">SSE</option>
                  <option value="TECHNICIAN">TECHNICIAN</option>
                  <option value="TESTROOM">TESTROOM</option>
                  <option value="DIVISIONAL_VIEWER">DIVISIONAL_VIEWER</option>
                  <option value="ALL_DIVISION_VIEWER">ALL_DIVISION_VIEWER</option>
                </>
              ) : (
                <>
                  <option value="SSE">SSE</option>
                  <option value="TECHNICIAN">TECHNICIAN</option>
                  <option value="TESTROOM">TESTROOM</option>
                </>
              )}
            </ClearableSelect>
          </label>
          {addRole !== "SUPER_ADMIN" && addRole !== "DIVISIONAL_ADMIN" && addRole !== "ALL_DIVISION_VIEWER" && (
            <label>
              Designation
              <input placeholder="e.g. SSE/Tele/Raipur" value={addDesignation} onChange={e => setAddDesignation(e.target.value)} />
            </label>
          )}
          {addRole !== "SUPER_ADMIN" && addRole !== "ALL_DIVISION_VIEWER" && (
            currentRole === "SUPER_ADMIN" ? (
              <label>
                Division
                <ClearableSelect value={addDivision} onChange={setAddDivision}>
                  <option value="">Select Division</option>
                  {uniqueDivisions.length > 0
                    ? uniqueDivisions.map((d: string) => <option key={d} value={d}>{d}</option>)
                    : ["Raipur", "Bilaspur", "Nagpur"].map((d: string) => <option key={d} value={d}>{d}</option>)
                  }
                </ClearableSelect>
              </label>
            ) : (
              <label>
                Division (Locked)
                <input readOnly value={userDiv} />
              </label>
            )
          )}
          <div style={{ margin: "12px 0 15px", display: "grid", gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)" }}>Module Access Privileges</span>
            <div style={{ display: "grid", gap: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 500, cursor: "pointer", userSelect: "none" }}>
                <input type="checkbox" checked={addAccessAssets} onChange={e => setAddAccessAssets(e.target.checked)} />
                Access Assets Module
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 500, cursor: "pointer", userSelect: "none" }}>
                <input type="checkbox" checked={addAccessDailyPosition} onChange={e => setAddAccessDailyPosition(e.target.checked)} />
                Access Daily Position Module
              </label>
            </div>
          </div>
          <button type="submit" className="export-button">Add User</button>
        </form>
      );
    }

    if (title.startsWith("Add Asset") || title.startsWith("Create Asset")) {
      const stations = queries.stationsQuery.data?.data || [];
      const telecomAssetOptions = Array.from(new Set([
        ...TELECOM_ASSET_CHECKS.map(item => item.label),
        ...(queries.assetsQuery.data?.data || []).map((asset: any) => getTelecomAssetName(asset)),
        assetCategory
      ].filter(Boolean))) as string[];
      const isIpisAsset = normalizeAssetText(assetCategory) === "ipis";
      const needsMaintenanceDates = assetMaintenanceValidity === "AMC" || assetMaintenanceValidity === "RMC";
      return (
        <form onSubmit={handleSubmit} className="form-drawer">
          <label>
            {requiredLabel("Telecom Asset")}
            <ClearableSelect required value={assetCategory} onChange={handleCategoryChange}>
              <option value="">Select Asset Category</option>
              {telecomAssetOptions.map(option => <option key={option} value={option}>{option}</option>)}
            </ClearableSelect>
          </label>
          <label>
            {requiredLabel("Station Code")}
            <ClearableSelect required value={assetStation} onChange={setAssetStation}>
              <option value="">Select Station</option>
              {stations.map((s: any) => <option key={s.id} value={s.code}>{s.name} ({s.code})</option>)}
            </ClearableSelect>
          </label>
          <label>
            {requiredLabel("Mode")}
            <ClearableSelect required value={assetMode} onChange={val => {
              setAssetMode(val);
              if (val === ASSET_MODE_STANDALONE) setAssetEquipmentName("");
            }}>
              <option value="">Select Mode</option>
              <option value={ASSET_MODE_STANDALONE}>Standalone</option>
              <option value={ASSET_MODE_HAS_EQUIPMENT}>Has Equipment</option>
            </ClearableSelect>
          </label>
          {assetMode === ASSET_MODE_HAS_EQUIPMENT && (
            <label>
              {requiredLabel("Equipment Name")}
              <input required placeholder="e.g. CGB, TIB, Router" value={assetEquipmentName} onChange={e => setAssetEquipmentName(e.target.value)} />
            </label>
          )}
          <label>
            {requiredLabel("Make")}
            <input required placeholder="e.g. BHEL" value={assetMake} onChange={e => setAssetMake(e.target.value)} />
          </label>
          <label>
            {requiredLabel("Model")}
            <input required placeholder="e.g. B-IPIS-X2" value={assetModel} onChange={e => setAssetModel(e.target.value)} />
          </label>
          <label>
            {requiredLabel("RDSO Spec / Version")}
            <input required placeholder="e.g. RDSO/SPN/TC/108/2019" value={assetRdsoSpec} onChange={e => setAssetRdsoSpec(e.target.value)} />
          </label>
          <label>
            {requiredLabel("Date of Installation")}
            <input required type="date" value={assetDop} onChange={e => setAssetDop(e.target.value)} onClick={e => { try { e.currentTarget.showPicker(); } catch (err) { } }} />
          </label>
          <label>
            {requiredLabel("Work Name")}
            <input required placeholder="e.g. Station telecom upgrade" value={assetWorkName} onChange={e => setAssetWorkName(e.target.value)} />
          </label>
          <MultiSelectDropdown
            label={requiredLabel("Connected With")}
            options={CONNECTED_WITH_OPTIONS}
            selected={assetConnectedWith}
            onChange={setAssetConnectedWith}
            placeholder="Select connection"
          />
          <label>
            {requiredLabel("Forward Inspection")}
            <input required placeholder="Forward inspection details" value={assetForwardInspection} onChange={e => setAssetForwardInspection(e.target.value)} />
          </label>
          <label>
            {requiredLabel("Backward Inspection")}
            <input required placeholder="Backward inspection details" value={assetBackwardInspection} onChange={e => setAssetBackwardInspection(e.target.value)} />
          </label>
          <label>
            Display Board
            <input placeholder="e.g. DB-01, PF1-A" value={assetDbCount} onChange={e => setAssetDbCount(e.target.value)} />
          </label>
          <label>
            {requiredLabel("Maintenance Validity")}
            <ClearableSelect required value={assetMaintenanceValidity} onChange={val => {
              setAssetMaintenanceValidity(val);
              if (val === MAINTENANCE_NOT_AVAILABLE) {
                setAssetMaintenanceFrom("");
                setAssetMaintenanceTo("");
              }
            }}>
              <option value="">Select Maintenance Validity</option>
              {MAINTENANCE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </ClearableSelect>
          </label>
          {needsMaintenanceDates && (
            <>
              <label>
                {requiredLabel("Maintenance From")}
                <input required type="date" value={assetMaintenanceFrom} onChange={e => setAssetMaintenanceFrom(e.target.value)} onClick={e => { try { e.currentTarget.showPicker(); } catch (err) { } }} />
              </label>
              <label>
                {requiredLabel("Maintenance To")}
                <input required type="date" value={assetMaintenanceTo} onChange={e => setAssetMaintenanceTo(e.target.value)} onClick={e => { try { e.currentTarget.showPicker(); } catch (err) { } }} />
              </label>
            </>
          )}
          <label>
            {requiredLabel("Location")}
            <input required placeholder="e.g. Platform 1 Server Room" value={assetLocation} onChange={e => setAssetLocation(e.target.value)} />
          </label>
          <label>
            {requiredLabel("Status")}
            <ClearableSelect required value={assetStatus} onChange={setAssetStatus}>
              <option value="">Select Status</option>
              <option value="OPERATIONAL">OPERATIONAL</option>
              <option value="UNDER_MAINTENANCE">UNDER_MAINTENANCE</option>
              <option value="FAULTY">FAULTY</option>
              <option value="OBSOLETE">OBSOLETE</option>
            </ClearableSelect>
          </label>
          <label>
            Remarks
            <textarea placeholder="Operational notes..." value={assetRemarks} onChange={e => setAssetRemarks(e.target.value)} />
          </label>

          <div style={{ margin: "15px 0 10px 0" }}>
            <strong style={{ display: "block", marginBottom: 8 }}>Specifications Parameters:</strong>
            <div style={{ display: "grid", gap: 10 }}>
              {assetSpecFields.map((field, idx) => (
                <div key={idx} className="spec-parameter-row">
                  <input
                    required
                    style={{ flex: 1, minWidth: 0 }}
                    placeholder="Parameter Name (e.g. controllerIp)"
                    value={field.key}
                    onChange={e => {
                      const updated = [...assetSpecFields];
                      updated[idx].key = e.target.value;
                      setAssetSpecFields(updated);
                    }}
                  />
                  <input
                    required
                    style={{ flex: 1, minWidth: 0 }}
                    placeholder="Value (e.g. 10.120.45.15)"
                    value={field.val}
                    onChange={e => {
                      const updated = [...assetSpecFields];
                      updated[idx].val = e.target.value;
                      setAssetSpecFields(updated);
                    }}
                  />
                  <button
                    type="button"
                    style={{ padding: "8px 12px", background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: 16 }}
                    onClick={() => {
                      const updated = assetSpecFields.filter((_, i) => i !== idx);
                      setAssetSpecFields(updated);
                    }}
                    title="Delete Parameter"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="export-button"
              style={{
                marginTop: 10,
                background: "transparent",
                color: "var(--blue)",
                border: "1px dashed var(--blue)",
                padding: "8px 12px",
                width: "100%",
                cursor: "pointer",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5
              }}
              onClick={() => {
                setAssetSpecFields([...assetSpecFields, { key: "", val: "" }]);
              }}
            >
              + Add Specification Parameter
            </button>
          </div>

          <button type="submit" className="export-button">Save Asset</button>
        </form>
      );
    }



    if (title.startsWith("Add Station") || title.startsWith("Create Station")) {
      return (
        <form onSubmit={handleSubmit} className="form-drawer">
          <label>
            Division
            <ClearableSelect value={stationDivision} onChange={setStationDivision}>
              <option value="">Select Division</option>
              {uniqueDivisions.length > 0
                ? uniqueDivisions.map((d: string) => <option key={d} value={d}>{d}</option>)
                : ["Raipur", "Bilaspur", "Nagpur"].map((d: string) => <option key={d} value={d}>{d}</option>)
              }
            </ClearableSelect>
          </label>
          <label>
            Station Name
            <input required placeholder="e.g. Durg Junction" value={stationName} onChange={e => setStationName(e.target.value)} />
          </label>
          <label>
            Station Code (Unique)
            <input required placeholder="e.g. DURG" value={stationCode} onChange={e => setStationCode(e.target.value.toUpperCase())} />
          </label>
          <label>
            State
            <ClearableSelect value={stationState} onChange={setStationState}>
              <option value="">Select State</option>
              {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </ClearableSelect>
          </label>
          <label>
            Category
            <input required placeholder="e.g. NSG-2" value={stationCategory} onChange={e => setStationCategory(e.target.value)} />
          </label>
          <div style={{ display: "grid", gap: 10, margin: "10px 0" }}>
            <strong>Assets:</strong>
            <div style={{ maxHeight: "200px", overflowY: "auto", padding: "10px", border: "1px solid var(--line)", borderRadius: "6px" }}>
              {Object.keys(stationChecks).map((checkKey) => (
                <label key={checkKey} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <input
                    type="checkbox"
                    style={{ width: "auto", height: "auto" }}
                    checked={stationChecks[checkKey]}
                    onChange={e => setStationChecks({ ...stationChecks, [checkKey]: e.target.checked })}
                  />
                  {CHECKLIST_LABELS[checkKey] || checkKey}
                </label>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gap: 10, margin: "15px 0" }}>
            <strong>Commissioned Under (Optional):</strong>
            <div style={{ display: "grid", gap: 12, padding: "12px", border: "1px solid var(--line)", borderRadius: "6px", background: "#f8fafd" }}>
              {Object.keys(stationChecks).filter(key => stationChecks[key]).map((checkKey) => (
                <div key={checkKey} style={{ display: "grid", gap: 4, paddingBottom: 8, borderBottom: "1px dashed var(--line)" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--navy)" }}>{CHECKLIST_LABELS[checkKey] || checkKey}</span>
                  <div style={{ display: "flex", gap: 15 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, cursor: "pointer", fontWeight: 550 }}>
                      <input
                        type="radio"
                        style={{ width: "auto", height: "auto" }}
                        name={`commission-add-${checkKey}`}
                        checked={commissionedDivisional.includes(checkKey)}
                        onChange={() => {
                          setCommissionedDivisional([...commissionedDivisional.filter(k => k !== checkKey), checkKey]);
                          setCommissionedAbss(commissionedAbss.filter(k => k !== checkKey));
                        }}
                      />
                      Divisional Work
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, cursor: "pointer", fontWeight: 550 }}>
                      <input
                        type="radio"
                        style={{ width: "auto", height: "auto" }}
                        name={`commission-add-${checkKey}`}
                        checked={commissionedAbss.includes(checkKey)}
                        onChange={() => {
                          setCommissionedAbss([...commissionedAbss.filter(k => k !== checkKey), checkKey]);
                          setCommissionedDivisional(commissionedDivisional.filter(k => k !== checkKey));
                        }}
                      />
                      ABSS
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, cursor: "pointer", fontWeight: 550 }}>
                      <input
                        type="radio"
                        style={{ width: "auto", height: "auto" }}
                        name={`commission-add-${checkKey}`}
                        checked={!commissionedDivisional.includes(checkKey) && !commissionedAbss.includes(checkKey)}
                        onChange={() => {
                          setCommissionedDivisional(commissionedDivisional.filter(k => k !== checkKey));
                          setCommissionedAbss(commissionedAbss.filter(k => k !== checkKey));
                        }}
                      />
                      None
                    </label>
                  </div>
                </div>
              ))}
              {Object.keys(stationChecks).filter(key => stationChecks[key]).length === 0 && (
                <span style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>Select assets from above checklist first.</span>
              )}
            </div>
          </div>
          <button type="submit" className="export-button">Register Station</button>
        </form>
      );
    }

    if (title.startsWith("Edit Station")) {
      return (
        <form onSubmit={handleSubmit} className="form-drawer">
          <fieldset disabled={!canEditStations} style={{ border: "none", padding: 0, margin: 0, display: "contents" }}>
            <label>
              Division
              <ClearableSelect value={stationDivision} onChange={setStationDivision}>
                <option value="">Select Division</option>
                {uniqueDivisions.length > 0
                  ? uniqueDivisions.map((d: string) => <option key={d} value={d}>{d}</option>)
                  : ["Raipur", "Bilaspur", "Nagpur"].map((d: string) => <option key={d} value={d}>{d}</option>)
                }
              </ClearableSelect>
            </label>
            <label>
              Station Name
              <input required placeholder="e.g. Durg Junction" value={stationName} onChange={e => setStationName(e.target.value)} />
            </label>
            <label>
              Station Code (Read-Only)
              <input readOnly value={stationCode} />
            </label>
            <label>
              State
              <ClearableSelect value={stationState} onChange={setStationState}>
                <option value="">Select State</option>
                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </ClearableSelect>
            </label>
            <label>
              Category
              <input required placeholder="e.g. NSG-2" value={stationCategory} onChange={e => setStationCategory(e.target.value)} />
            </label>
            <div style={{ display: "grid", gap: 10, margin: "10px 0" }}>
              <strong>Assets:</strong>
              <div style={{ maxHeight: "200px", overflowY: "auto", padding: "10px", border: "1px solid var(--line)", borderRadius: "6px" }}>
                {Object.keys(stationChecks).map((checkKey) => (
                  <label key={checkKey} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <input
                      type="checkbox"
                      style={{ width: "auto", height: "auto" }}
                      checked={stationChecks[checkKey]}
                      onChange={e => setStationChecks({ ...stationChecks, [checkKey]: e.target.checked })}
                    />
                    {CHECKLIST_LABELS[checkKey] || checkKey}
                  </label>
                ))}
              </div>
            </div>
            <div style={{ display: "grid", gap: 10, margin: "15px 0" }}>
              <strong>Commissioned Under (Optional):</strong>
              <div style={{ display: "grid", gap: 12, padding: "12px", border: "1px solid var(--line)", borderRadius: "6px", background: "#f8fafd" }}>
                {Object.keys(stationChecks).filter(key => stationChecks[key]).map((checkKey) => (
                  <div key={checkKey} style={{ display: "grid", gap: 4, paddingBottom: 8, borderBottom: "1px dashed var(--line)" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--navy)" }}>{CHECKLIST_LABELS[checkKey] || checkKey}</span>
                    <div style={{ display: "flex", gap: 15 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, cursor: "pointer", fontWeight: 550 }}>
                        <input
                          type="radio"
                          style={{ width: "auto", height: "auto" }}
                          name={`commission-edit-${checkKey}`}
                          checked={commissionedDivisional.includes(checkKey)}
                          onChange={() => {
                            setCommissionedDivisional([...commissionedDivisional.filter(k => k !== checkKey), checkKey]);
                            setCommissionedAbss(commissionedAbss.filter(k => k !== checkKey));
                          }}
                        />
                        Divisional Work
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, cursor: "pointer", fontWeight: 550 }}>
                        <input
                          type="radio"
                          style={{ width: "auto", height: "auto" }}
                          name={`commission-edit-${checkKey}`}
                          checked={commissionedAbss.includes(checkKey)}
                          onChange={() => {
                            setCommissionedAbss([...commissionedAbss.filter(k => k !== checkKey), checkKey]);
                            setCommissionedDivisional(commissionedDivisional.filter(k => k !== checkKey));
                          }}
                        />
                        ABSS
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, cursor: "pointer", fontWeight: 550 }}>
                        <input
                          type="radio"
                          style={{ width: "auto", height: "auto" }}
                          name={`commission-edit-${checkKey}`}
                          checked={!commissionedDivisional.includes(checkKey) && !commissionedAbss.includes(checkKey)}
                          onChange={() => {
                            setCommissionedDivisional(commissionedDivisional.filter(k => k !== checkKey));
                            setCommissionedAbss(commissionedAbss.filter(k => k !== checkKey));
                          }}
                        />
                        None
                      </label>
                    </div>
                  </div>
                ))}
                {Object.keys(stationChecks).filter(key => stationChecks[key]).length === 0 && (
                  <span style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>Select assets from above checklist first.</span>
                )}
              </div>
            </div>
          </fieldset>
          {canEditStations && <button type="submit" className="export-button">Save Changes</button>}
        </form>
      );
    }

    if (title.startsWith("Edit Asset")) {
      const telecomAssetOptions = Array.from(new Set([
        ...TELECOM_ASSET_CHECKS.map(item => item.label),
        ...(queries.assetsQuery.data?.data || []).map((asset: any) => getTelecomAssetName(asset)),
        assetCategory
      ].filter(Boolean))) as string[];
      const isIpisAsset = normalizeAssetText(assetCategory) === "ipis";
      const needsMaintenanceDates = assetMaintenanceValidity === "AMC" || assetMaintenanceValidity === "RMC";
      return (
        <form onSubmit={handleSubmit} className="form-drawer">
          <fieldset disabled={!canEditAssets} style={{ border: "none", padding: 0, margin: 0, display: "contents" }}>
            <label>
              {requiredLabel("Telecom Asset")}
              <ClearableSelect required value={assetCategory} onChange={handleCategoryChange}>
                <option value="">Select Asset Category</option>
                {telecomAssetOptions.map(option => <option key={option} value={option}>{option}</option>)}
              </ClearableSelect>
            </label>
            <label>
              {requiredLabel("Station Code")} (Read-Only)
              <input readOnly value={assetStation} />
            </label>
            <label>
              {requiredLabel("Mode")}
              <ClearableSelect required value={assetMode} onChange={val => {
                setAssetMode(val);
                if (val === ASSET_MODE_STANDALONE) setAssetEquipmentName("");
              }}>
                <option value="">Select Mode</option>
                <option value={ASSET_MODE_STANDALONE}>Standalone</option>
                <option value={ASSET_MODE_HAS_EQUIPMENT}>Has Equipment</option>
              </ClearableSelect>
            </label>
            {assetMode === ASSET_MODE_HAS_EQUIPMENT && (
              <label>
                {requiredLabel("Equipment Name")}
                <input required placeholder="e.g. CGB, TIB, Router" value={assetEquipmentName} onChange={e => setAssetEquipmentName(e.target.value)} />
              </label>
            )}
            <label>
              {requiredLabel("Make")}
              <input required placeholder="e.g. BHEL" value={assetMake} onChange={e => setAssetMake(e.target.value)} />
            </label>
            <label>
              {requiredLabel("Model")}
              <input required placeholder="e.g. B-IPIS-X2" value={assetModel} onChange={e => setAssetModel(e.target.value)} />
            </label>
            <label>
              {requiredLabel("RDSO Spec / Version")}
              <input required placeholder="e.g. RDSO/SPN/TC/108/2019" value={assetRdsoSpec} onChange={e => setAssetRdsoSpec(e.target.value)} />
            </label>
            <label>
              {requiredLabel("Date of Installation")}
              <input required type="date" value={assetDop} onChange={e => setAssetDop(e.target.value)} onClick={e => { try { e.currentTarget.showPicker(); } catch (err) { } }} />
            </label>
            <label>
              {requiredLabel("Work Name")}
              <input required placeholder="e.g. Station telecom upgrade" value={assetWorkName} onChange={e => setAssetWorkName(e.target.value)} />
            </label>
            <MultiSelectDropdown
              label={requiredLabel("Connected With")}
              options={CONNECTED_WITH_OPTIONS}
              selected={assetConnectedWith}
              onChange={setAssetConnectedWith}
              placeholder="Select connection"
            />
            <label>
              {requiredLabel("Forward Inspection")}
              <input required placeholder="Forward inspection details" value={assetForwardInspection} onChange={e => setAssetForwardInspection(e.target.value)} />
            </label>
            <label>
              {requiredLabel("Backward Inspection")}
              <input required placeholder="Backward inspection details" value={assetBackwardInspection} onChange={e => setAssetBackwardInspection(e.target.value)} />
            </label>
            <label>
              Display Board
              <input placeholder="e.g. DB-01, PF1-A" value={assetDbCount} onChange={e => setAssetDbCount(e.target.value)} />
            </label>
            <label>
              {requiredLabel("Maintenance Validity")}
              <ClearableSelect required value={assetMaintenanceValidity} onChange={val => {
                setAssetMaintenanceValidity(val);
                if (val === MAINTENANCE_NOT_AVAILABLE) {
                  setAssetMaintenanceFrom("");
                  setAssetMaintenanceTo("");
                }
              }}>
                <option value="">Select Maintenance Validity</option>
                {MAINTENANCE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </ClearableSelect>
            </label>
            {needsMaintenanceDates && (
              <>
                <label>
                  {requiredLabel("Maintenance From")}
                  <input required type="date" value={assetMaintenanceFrom} onChange={e => setAssetMaintenanceFrom(e.target.value)} onClick={e => { try { e.currentTarget.showPicker(); } catch (err) { } }} />
                </label>
                <label>
                  {requiredLabel("Maintenance To")}
                  <input required type="date" value={assetMaintenanceTo} onChange={e => setAssetMaintenanceTo(e.target.value)} onClick={e => { try { e.currentTarget.showPicker(); } catch (err) { } }} />
                </label>
              </>
            )}
            <label>
              {requiredLabel("Location")}
              <input required placeholder="e.g. Platform 1 Server Room" value={assetLocation} onChange={e => setAssetLocation(e.target.value)} />
            </label>
            <label>
              {requiredLabel("Status")}
              <ClearableSelect required value={assetStatus} onChange={setAssetStatus}>
                <option value="">Select Status</option>
                <option value="OPERATIONAL">OPERATIONAL</option>
                <option value="UNDER_MAINTENANCE">UNDER_MAINTENANCE</option>
                <option value="FAULTY">FAULTY</option>
                <option value="OBSOLETE">OBSOLETE</option>
              </ClearableSelect>
            </label>
            <label>
              Remarks
              <textarea placeholder="Operational notes..." value={assetRemarks} onChange={e => setAssetRemarks(e.target.value)} />
            </label>

            <div style={{ margin: "15px 0 10px 0" }}>
              <strong style={{ display: "block", marginBottom: 8 }}>Specifications Parameters:</strong>
              <div style={{ display: "grid", gap: 10 }}>
                {assetSpecFields.map((field, idx) => (
                  <div key={idx} className="spec-parameter-row">
                    <input
                      required
                      style={{ flex: 1, minWidth: 0 }}
                      placeholder="Parameter Name (e.g. controllerIp)"
                      value={field.key}
                      onChange={e => {
                        const updated = [...assetSpecFields];
                        updated[idx].key = e.target.value;
                        setAssetSpecFields(updated);
                      }}
                    />
                    <input
                      required
                      style={{ flex: 1, minWidth: 0 }}
                      placeholder="Value (e.g. 10.120.45.15)"
                      value={field.val}
                      onChange={e => {
                        const updated = [...assetSpecFields];
                        updated[idx].val = e.target.value;
                        setAssetSpecFields(updated);
                      }}
                    />
                    <button
                      type="button"
                      style={{ padding: "8px 12px", background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: 16 }}
                      onClick={() => {
                        const updated = assetSpecFields.filter((_, i) => i !== idx);
                        setAssetSpecFields(updated);
                      }}
                      title="Delete Parameter"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="export-button"
                style={{
                  marginTop: 10,
                  background: "transparent",
                  color: "var(--blue)",
                  border: "1px dashed var(--blue)",
                  padding: "8px 12px",
                  width: "100%",
                  cursor: "pointer",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5
                }}
                onClick={() => {
                  setAssetSpecFields([...assetSpecFields, { key: "", val: "" }]);
                }}
              >
                + Add Specification Parameter
              </button>
            </div>
          </fieldset>

          {canEditAssets && <button type="submit" className="export-button">Save Changes</button>}
        </form>
      );
    }

    if (title.startsWith("Add LC Gate") || title.startsWith("Create LC Gate")) {
      const stations = queries.stationsQuery.data?.data || [];
      return (
        <form onSubmit={handleSubmit} className="form-drawer">
          <label>
            Gate Number (Unique)
            <input required placeholder="e.g. Gate No. 12" value={gateNumber} onChange={e => setGateNumber(e.target.value)} />
          </label>
          <label>
            Gate Name
            <input placeholder="e.g. Kumhari crossing" value={gateName} onChange={e => setGateName(e.target.value)} />
          </label>
          <label>
            Category
            <ClearableSelect value={gateCategory} onChange={setGateCategory}>
              <option value="">Select Category</option>
              <option value="Interlocked">Interlocked</option>
              <option value="Manned Non-Interlocked">Manned Non-Interlocked</option>
              <option value="Special / Other Gates">Special / Other Gates</option>
            </ClearableSelect>
          </label>
          <label>
            Section
            <input placeholder="e.g. Raipur-Durg" value={gateSection} onChange={e => setGateSection(e.target.value)} />
          </label>
          <label>
            Km Location
            <input placeholder="e.g. Km 824/2" value={gateKm} onChange={e => setGateKm(e.target.value)} />
          </label>
          <label>
            Location Description
            <input placeholder="e.g. near national highway crossing" value={gateLocName} onChange={e => setGateLocName(e.target.value)} />
          </label>
          <label>
            Station Link
            <ClearableSelect value={gateStation} onChange={setGateStation}>
              <option value="">No Linking Station</option>
              {stations.map((s: any) => <option key={s.id} value={s.code}>{s.name} ({s.code})</option>)}
            </ClearableSelect>
          </label>
          <button type="submit" className="export-button">Register LC Gate</button>
        </form>
      );
    }

    if (title.startsWith("Edit LC Gate")) {
      return (
        <form onSubmit={handleSubmit} className="form-drawer">
          <fieldset disabled={!canEditGates} style={{ border: "none", padding: 0, margin: 0, display: "contents" }}>
            <label>
              Gate Number (Read-Only)
              <input readOnly value={gateNumber} />
            </label>
            <label>
              Gate Name
              <input placeholder="e.g. Kumhari crossing" value={gateName} onChange={e => setGateName(e.target.value)} />
            </label>
            <label>
              Category
              <ClearableSelect value={gateCategory} onChange={setGateCategory}>
                <option value="">Select Category</option>
                <option value="Interlocked">Interlocked</option>
                <option value="Manned Non-Interlocked">Manned Non-Interlocked</option>
                <option value="Special / Other Gates">Special / Other Gates</option>
              </ClearableSelect>
            </label>
            <label>
              Section
              <input placeholder="e.g. Raipur-Durg" value={gateSection} onChange={e => setGateSection(e.target.value)} />
            </label>
            <label>
              Km Location
              <input placeholder="e.g. Km 824/2" value={gateKm} onChange={e => setGateKm(e.target.value)} />
            </label>
            <label>
              Location Description
              <input placeholder="e.g. near national highway crossing" value={gateLocName} onChange={e => setGateLocName(e.target.value)} />
            </label>
            <label>
              Station Link (Read-Only)
              <input readOnly value={gateStation || "No Linking Station"} />
            </label>
          </fieldset>
          {canEditGates && <button type="submit" className="export-button">Save Changes</button>}
        </form>
      );
    }



    if (title === "Change User Role" || title === "Manage User") {
      const userObj = queries.usersQuery.data?.data.find((u: any) => u.id === itemId);
      const currentRole = useAppStore.getState().role;
      if (!userObj) return <div>User details not found.</div>;

      return (
        <form onSubmit={handleSubmit} className="form-drawer">
          <label>
            User Full Name
            <input
              placeholder="e.g. Super Admin User"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              required
            />
          </label>
          <label>
            Username (Read-Only)
            <input readOnly value={userObj.username} />
          </label>
          <label>
            New Password
            <input
              type="password"
              placeholder="Leave blank to keep current password"
              value={editPassword}
              onChange={e => setEditPassword(e.target.value)}
            />
          </label>
          <label>
            System Role
            <ClearableSelect value={newRole} onChange={setNewRole}>
              <option value="">Select Role</option>
              {currentRole === "SUPER_ADMIN" ? (
                <>
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  <option value="DIVISIONAL_ADMIN">DIVISIONAL_ADMIN</option>
                  <option value="SSE">SSE</option>
                  <option value="TECHNICIAN">TECHNICIAN</option>
                  <option value="TESTROOM">TESTROOM</option>
                  <option value="DIVISIONAL_VIEWER">DIVISIONAL_VIEWER</option>
                  <option value="ALL_DIVISION_VIEWER">ALL_DIVISION_VIEWER</option>
                </>
              ) : (
                <>
                  <option value="SSE">SSE</option>
                  <option value="TECHNICIAN">TECHNICIAN</option>
                  <option value="TESTROOM">TESTROOM</option>
                </>
              )}
            </ClearableSelect>
          </label>
          <label>
            Designation
            <input placeholder="e.g. Sr. DSTE/Raipur" value={newDesignation} onChange={e => setNewDesignation(e.target.value)} />
          </label>
          {currentRole === "SUPER_ADMIN" && newRole !== "SUPER_ADMIN" && newRole !== "ALL_DIVISION_VIEWER" && (
            <label>
              Division
              <ClearableSelect value={stationDivision} onChange={setStationDivision}>
                <option value="">Select Division</option>
                {uniqueDivisions.length > 0
                  ? uniqueDivisions.map((d: string) => <option key={d} value={d}>{d}</option>)
                  : ["Raipur", "Bilaspur", "Nagpur"].map((d: string) => <option key={d} value={d}>{d}</option>)
                }
              </ClearableSelect>
            </label>
          )}
          <div style={{ margin: "12px 0 15px", display: "grid", gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)" }}>Module Access Privileges</span>
            <div style={{ display: "grid", gap: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 500, cursor: "pointer", userSelect: "none" }}>
                <input type="checkbox" checked={editAccessAssets} onChange={e => setEditAccessAssets(e.target.checked)} />
                Access Assets Module
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 500, cursor: "pointer", userSelect: "none" }}>
                <input type="checkbox" checked={editAccessDailyPosition} onChange={e => setEditAccessDailyPosition(e.target.checked)} />
                Access Daily Position Module
              </label>
            </div>
          </div>
          <button type="submit" className="export-button">Save Changes</button>
        </form>
      );
    }

    if (title === "Asset Details") {
      const asset = queries.assetsQuery.data?.data.find((a: any) => a.id === itemId);
      if (!asset) return <div style={{ padding: 20, color: "var(--muted)" }}>Asset details not found.</div>;

      const specs = typeof asset.specifications === "string"
        ? (() => { try { return JSON.parse(asset.specifications); } catch { return {}; } })()
        : (asset.specifications || {});

      const statusColor: Record<string, string> = {
        operational: "var(--green)",
        faulty: "#ef4444",
        maintenance: "#f59e0b",
        decommissioned: "#94a3b8"
      };
      const sColor = statusColor[(asset.status || "").toLowerCase()] || "var(--muted)";

      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1, overflowY: "auto" }}>
          {/* Asset identity header */}
          <div style={{
            display: "flex", alignItems: "center", gap: 14,
            padding: "16px 18px",
            background: "#f0f4ff",
            borderRadius: 12,
            border: "1px solid rgba(99,102,241,0.15)",
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: "var(--purple, #6366f1)", color: "#fff",
              display: "grid", placeItems: "center", flexShrink: 0,
              fontSize: 11, fontWeight: 800, letterSpacing: 0,
              boxShadow: "0 4px 12px rgba(99,102,241,0.25)",
              textAlign: "center", lineHeight: 1.2
            }}>
              {getTelecomAssetName(asset).slice(0, 4).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "var(--navy)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {asset.rdsoSpec || getTelecomAssetName(asset)}
              </h4>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: "#fff",
                  background: sColor, borderRadius: 6, padding: "1px 8px"
                }}>{asset.status || "Unknown"}</span>
                <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Telecom Asset Record
                </span>
              </div>
            </div>
          </div>

          {/* Info grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {([
              { label: "Telecom Asset", value: getTelecomAssetName(asset) },
              { label: "RDSO Spec / Version", value: asset.rdsoSpec || "-" },
              { label: "Station", value: asset.stationCode || "-" },
              { label: "Make", value: asset.make || "-" },
              { label: "Model", value: asset.model || "-" },
            ] as { label: string; value: string }[]).map(item => (
              <div key={item.label} style={{
                background: "#f8fafd", padding: "10px 12px", borderRadius: 10,
                border: "1px solid #edf2f9"
              }}>
                <small style={{ display: "block", fontSize: 10, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>{item.label}</small>
                <strong style={{ fontSize: 13, color: "var(--navy)" }}>{item.value}</strong>
              </div>
            ))}
          </div>

          {/* Full-width fields */}
          {[
            { label: "Date of Installation", value: asset.dop },
            { label: "Equipment", value: asset.assetMode === ASSET_MODE_HAS_EQUIPMENT ? asset.equipmentName : "" },
            { label: "Work Name", value: asset.workName },
            { label: "Connected With", value: asset.connectedWith },
            { label: "Forward Inspection", value: asset.forwardInspection },
            { label: "Backward Inspection", value: asset.backwardInspection },
            { label: "Display Board", value: asset.displayBoard || (asset.dbCount !== null && asset.dbCount !== undefined ? String(asset.dbCount) : "") },
            { label: "Maintenance Validity", value: asset.maintenanceValidity === MAINTENANCE_NOT_AVAILABLE ? "Not Available" : asset.maintenanceValidity },
            { label: "Maintenance Period", value: asset.maintenanceFrom && asset.maintenanceTo ? `${String(asset.maintenanceFrom).slice(0, 10)} to ${String(asset.maintenanceTo).slice(0, 10)}` : "" },
            { label: "Location", value: asset.installLocation },
            { label: "Remarks", value: asset.remarks },
          ].filter(f => f.value).map(f => (
            <div key={f.label} style={{ background: "#f8fafd", borderRadius: 10, padding: "12px 14px", border: "1px solid #edf2f9" }}>
              <small style={{ display: "block", fontSize: 10, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>{f.label}</small>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--navy)" }}>{f.value}</span>
            </div>
          ))}

          {/* Tech Specifications */}
          {Object.keys(specs).length > 0 && (
            <div>
              <strong style={{ fontSize: 12, fontWeight: 800, color: "var(--navy)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 10 }}>
                Tech Specifications
              </strong>
              <div style={{ display: "grid", gap: 8 }}>
                {Object.entries(specs).map(([k, v]) => (
                  <div key={k} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    background: "#f8fafd", padding: "9px 12px", borderRadius: 8, border: "1px solid #edf2f9"
                  }}>
                    <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, textTransform: "capitalize" }}>{k.replace(/_/g, " ")}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--navy)" }}>{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (title === "Station Details") {
      const station = queries.stationsQuery.data?.data.find((s: any) => s.id === itemId || s.code === itemId);
      if (!station) return <div style={{ padding: 20, color: "var(--muted)" }}>Station not found.</div>;

      const capList = TELECOM_ASSET_CHECKS;

      const enabledCaps = capList.filter(c => !!(station as any)[c.key]);
      const disabledCaps = capList.filter(c => !(station as any)[c.key]);
      const assetCount = queries.assetsQuery.data?.data.filter((a: any) => a.stationCode === station.code).length ?? 0;

      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1, overflowY: "auto", paddingRight: 2 }}>
          {/* Station identity — light clean header */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "16px 18px",
            background: "var(--blue-soft)",
            borderRadius: 12,
            border: "1px solid rgba(30, 90, 200, 0.12)",
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: "var(--blue)", color: "#fff",
              display: "grid", placeItems: "center", flexShrink: 0,
              fontSize: 18, fontWeight: 900,
              letterSpacing: -1,
              boxShadow: "0 4px 12px rgba(30,90,200,0.25)"
            }}>
              {station.code?.slice(0, 2).toUpperCase() || "ST"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--navy)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {station.name}
              </h4>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--blue)", background: "#fff", border: "1px solid rgba(30,90,200,0.2)", borderRadius: 6, padding: "1px 8px" }}>
                  {station.code}
                </span>
                <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Station Master Card
                </span>
              </div>
            </div>
          </div>

          {/* Info grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {([
              { icon: <MapPin size={15} />, label: "Division", value: station.division || "-", color: "var(--blue)" },
              { icon: <Layers size={15} />, label: "Category", value: station.category || "NSG-2", color: "var(--purple)" },
              { icon: <Train size={15} />, label: "State", value: station.state || "-", color: "var(--green)" },
              { icon: <Building2 size={15} />, label: "Registered Assets", value: String(assetCount), color: "var(--orange)" },
            ] as { icon: React.ReactNode; label: string; value: string; color: string }[]).map(item => (
              <div key={item.label} style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "#f8fafd", padding: "10px 12px", borderRadius: 10,
                border: "1px solid #edf2f9"
              }}>
                <div style={{ color: item.color, flexShrink: 0 }}>{item.icon}</div>
                <div>
                  <small style={{ display: "block", fontSize: 10, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>{item.label}</small>
                  <strong style={{ fontSize: 13, color: "var(--navy)" }}>{item.value}</strong>
                </div>
              </div>
            ))}
          </div>

          {/* Commissioned Under Section */}
          <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 16 }}>
            <small style={{ display: "block", fontSize: 11, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>Commissioned Under</small>
            <div style={{ marginTop: 8, display: "grid", gap: 10 }}>
              <div>
                <strong style={{ fontSize: 13, color: "var(--navy)" }}>ABSS: </strong>
                <span style={{ fontSize: 13, color: "var(--navy)", fontWeight: 550 }}>
                  {station.commissionedAbss && station.commissionedAbss.length > 0
                    ? station.commissionedAbss.map((k: string) => TELECOM_ASSET_CHECKS.find(c => c.key === k)?.label || k).join(", ")
                    : "None"
                  }
                </span>
              </div>
              <div>
                <strong style={{ fontSize: 13, color: "var(--navy)" }}>Divisional Work: </strong>
                <span style={{ fontSize: 13, color: "var(--navy)", fontWeight: 550 }}>
                  {station.commissionedDivisional && station.commissionedDivisional.length > 0
                    ? station.commissionedDivisional.map((k: string) => TELECOM_ASSET_CHECKS.find(c => c.key === k)?.label || k).join(", ")
                    : "None"
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Capabilities checklist */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <strong style={{ fontSize: 12, fontWeight: 800, color: "var(--navy)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Telecom Assets</strong>
              <span style={{ fontSize: 11, background: "var(--green-soft)", color: "var(--green)", padding: "2px 8px", borderRadius: 12, fontWeight: 700 }}>
                {enabledCaps.length}/{capList.length} active
              </span>
            </div>

            {/* Enabled — all clickable */}
            {enabledCaps.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                {enabledCaps.map(cap => {
                  const isSelected = selectedCapKey === cap.key;

                  const asset = (queries.assetsQuery.data?.data || []).find(
                    (a: any) => a.stationCode === station.code &&
                      isTelecomAssetMatch(getTelecomAssetName(a), cap.label)
                  );

                  // Default values for "no asset registered yet"
                  let solidBg = "var(--amber)";
                  let softBg = "#fffbeb";
                  let borderCol = "rgba(245, 158, 11, 0.25)";
                  let textCol = "#b45309";
                  let dotCol = "var(--amber)";

                  if (asset) {
                    const statusStr = (asset.status || "").toLowerCase();
                    if (statusStr === "operational") {
                      solidBg = "var(--green)";
                      softBg = "var(--green-soft)";
                      borderCol = "rgba(13, 183, 107, 0.25)";
                      textCol = "var(--green)";
                      dotCol = "var(--green)";
                    } else if (statusStr === "faulty") {
                      solidBg = "#ef4444";
                      softBg = "#fef2f2";
                      borderCol = "rgba(239, 68, 68, 0.25)";
                      textCol = "#ef4444";
                      dotCol = "#ef4444";
                    } else if (statusStr === "under maintenance" || statusStr === "under_maintenance" || statusStr === "maintenance") {
                      solidBg = "#f97316";
                      softBg = "#fff7ed";
                      borderCol = "rgba(249, 115, 22, 0.25)";
                      textCol = "#f97316";
                      dotCol = "#f97316";
                    } else {
                      solidBg = "#64748b";
                      softBg = "#f8fafc";
                      borderCol = "rgba(100, 116, 139, 0.25)";
                      textCol = "#64748b";
                      dotCol = "#64748b";
                    }
                  }

                  return (
                    <div
                      key={cap.key}
                      onClick={() => setSelectedCapKey(isSelected ? null : cap.key)}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "7px 10px", borderRadius: 8,
                        background: isSelected ? solidBg : softBg,
                        border: isSelected ? `1px solid ${solidBg}` : `1px solid ${borderCol}`,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        userSelect: "none",
                      }}
                      title="Click to view asset details"
                    >
                      <div style={{
                        width: 15, height: 15, borderRadius: "50%",
                        background: isSelected ? "#fff" : dotCol,
                        color: isSelected ? textCol : "#fff",
                        display: "grid", placeItems: "center", fontSize: 10, fontWeight: 800, flexShrink: 0
                      }}>✓</div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: isSelected ? "#fff" : "var(--navy)", flex: 1 }}>{cap.label}</span>
                      <span style={{ fontSize: 10, color: isSelected ? "rgba(255,255,255,0.8)" : textCol, fontWeight: 800 }}>
                        {isSelected ? "▴" : "▾"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Inline card — asset details or "not registered" notice */}
            {selectedCapKey && (() => {
              const selectedCap = enabledCaps.find(c => c.key === selectedCapKey);
              if (!selectedCap) return null;

              const matchingAssets = (queries.assetsQuery.data?.data || []).filter(
                (a: any) => a.stationCode === station.code &&
                  isTelecomAssetMatch(getTelecomAssetName(a), selectedCap.label)
              );
              const asset = matchingAssets[0];

              if (!asset) {
                // No asset registered for this capability
                return (
                  <div style={{
                    marginBottom: 8, borderRadius: 12, overflow: "hidden",
                    border: "1.5px solid #fbbf24",
                    background: "#fffbeb",
                    animation: "fadeSlideIn 180ms ease"
                  }}>
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 14px",
                      background: "#f59e0b", color: "#fff"
                    }}>
                      <div>
                        <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.85, display: "block", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          {selectedCap.label}
                        </span>
                        <strong style={{ fontSize: 14, fontWeight: 800 }}>Telecom Asset Ticked</strong>
                      </div>
                      <button
                        onClick={() => setSelectedCapKey(null)}
                        style={{ background: "rgba(255,255,255,0.2)", border: 0, color: "#fff", width: 22, height: 22, borderRadius: "50%", display: "grid", placeItems: "center", cursor: "pointer", fontSize: 12 }}
                      >✕</button>
                    </div>
                    <div style={{ padding: "14px", display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <span style={{ fontSize: 20 }}>⚠️</span>
                      <div>
                        <strong style={{ fontSize: 13, color: "#92400e", display: "block", marginBottom: 4 }}>
                          No details registered yet
                        </strong>
                        <span style={{ fontSize: 12, color: "#78350f", lineHeight: 1.5 }}>
                          The station has <strong>{selectedCap.label}</strong> ticked as a Telecom Asset,
                          but no details have been registered for station <strong>{station.code}</strong>.
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }

              // Asset found — show details with dynamic color coding based on status
              const statusStr = (asset.status || "").toLowerCase();
              let headerBg = "var(--green)";
              let cardBg = "#f0fdf4";
              let cardBorder = "rgba(13,183,107,0.35)";
              let innerBg = "rgba(13,183,107,0.1)";

              if (statusStr === "faulty") {
                headerBg = "#ef4444";
                cardBg = "#fef2f2";
                cardBorder = "rgba(239,68,68,0.35)";
                innerBg = "rgba(239,68,68,0.1)";
              } else if (statusStr === "under maintenance" || statusStr === "under_maintenance" || statusStr === "maintenance") {
                headerBg = "#f97316";
                cardBg = "#fff7ed";
                cardBorder = "rgba(249,115,22,0.35)";
                innerBg = "rgba(249,115,22,0.1)";
              } else if (statusStr !== "operational") {
                headerBg = "#64748b";
                cardBg = "#f8fafc";
                cardBorder = "rgba(100,116,139,0.35)";
                innerBg = "rgba(100,116,139,0.1)";
              }

              return (
                <div style={{
                  marginBottom: 8, borderRadius: 12,
                  border: `1.5px solid ${cardBorder}`,
                  background: cardBg,
                  overflow: "hidden",
                  animation: "fadeSlideIn 180ms ease"
                }}>
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 14px", background: headerBg, color: "#fff"
                  }}>
                    <div>
                      <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.85, display: "block", textTransform: "uppercase", letterSpacing: "0.5px" }}>Telecom Asset - {getTelecomAssetName(asset)}</span>
                      <strong style={{ fontSize: 14, fontWeight: 800 }}>{asset.rdsoSpec || asset.id.slice(0, 12)}</strong>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700,
                        background: "rgba(255,255,255,0.2)", padding: "2px 8px", borderRadius: 20
                      }}>{asset.status}</span>
                      <button
                        onClick={() => setSelectedCapKey(null)}
                        style={{ background: "rgba(255,255,255,0.15)", border: 0, color: "#fff", width: 22, height: 22, borderRadius: "50%", display: "grid", placeItems: "center", cursor: "pointer", fontSize: 12 }}
                      >✕</button>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: innerBg }}>
                    {[
                      { label: "Make", value: asset.make || "-" },
                      { label: "Model", value: asset.model || "-" },
                      { label: "Install Location", value: asset.installLocation || "-" },
                      { label: "RDSO Spec / Version", value: asset.rdsoSpec || "-" },
                    ].map(f => (
                      <div key={f.label} style={{ background: cardBg, padding: "8px 14px" }}>
                        <small style={{ display: "block", fontSize: 10, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>{f.label}</small>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--navy)" }}>{f.value}</span>
                      </div>
                    ))}
                  </div>
                  {asset.remarks && (
                    <div style={{ padding: "8px 14px", background: cardBg, borderTop: `1px solid ${cardBorder}` }}>
                      <small style={{ display: "block", fontSize: 10, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>Remarks</small>
                      <span style={{ fontSize: 12, color: "var(--navy)", fontWeight: 600 }}>{asset.remarks}</span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      );
    }

    return (
      <div>
        <p>Connected workspace for {title}. This panel is bound with the live backend API endpoint for CRUD actions.</p>
        <label>
          Reference ID
          <input value={`SECR-${title.replace(/\s+/g, "-").toUpperCase().slice(0, 18)}`} readOnly />
        </label>
        <label>
          Notes
          <textarea placeholder="Add operational notes..." />
        </label>
        <button className="export-button" onClick={close} type="button">Save</button>
      </div>
    );
  };

  return (
    <div className="drawer-backdrop" role="presentation" onClick={close}>
      <aside className="drawer" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <button className="drawer-close" onClick={close} type="button" aria-label="Close panel">
          <X size={20} />
        </button>
        <h3>{title}</h3>
        <div style={{ marginTop: 20, flex: 1, display: "flex", flexDirection: "column", overflowY: "auto" }}>{renderForm()}</div>
      </aside>
    </div>
  );
}

// Authentication View (Glassmorphism layout overlay)
function AuthView({ showToast }: { showToast: (msg: string) => void }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [roleInput, setRoleInput] = useState<UserRole>("SSE");
  const [designation, setDesignation] = useState("");
  const [divisionInput, setDivisionInput] = useState("Raipur");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const { setToken, setUser } = useAppStore();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);
    try {
      if (isRegister) {
        await api.auth.register({
          username,
          password,
          name,
          role: roleInput,
          designation: (roleInput === "SUPER_ADMIN" || roleInput === "DIVISIONAL_ADMIN") ? undefined : designation,
          division: roleInput === "SUPER_ADMIN" ? undefined : divisionInput
        });
        showToast("Registration successful! Logging in.");
      }

      const loginRes = await api.auth.login({ username, password });
      setToken(loginRes.token);
      setUser(loginRes.data);
      showToast("Access granted. SECR Telecom active.");
    } catch (err: any) {
      setErrorMsg(err.message || "Authentication failed. Check details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <style>{`
        .auth-container {
          display: grid;
          place-items: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          padding: 20px;
        }
        .auth-box {
          width: 100%;
          max-width: 400px;
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.3), 0 0 40px rgba(11, 109, 255, 0.1);
          border-radius: 16px;
          padding: 40px 32px;
          text-align: center;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .auth-box:hover {
          transform: translateY(-4px);
          box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.35), 0 0 50px rgba(11, 109, 255, 0.15);
        }
        .auth-logo {
          width: 54px;
          height: 54px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ef4444 0%, #991b1b 100%);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 850;
          font-size: 19px;
          margin: 0 auto 20px;
          box-shadow: 0 8px 20px rgba(239, 68, 68, 0.35);
          border: 2px solid #fff;
          transition: transform 0.5s ease;
        }
        .auth-box:hover .auth-logo {
          transform: rotate(360deg);
        }
        .auth-box h2 {
          margin: 0;
          font-size: 24px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.5px;
        }
        .auth-box p {
          color: #64748b;
          margin: 6px 0 24px;
          font-size: 14px;
          font-weight: 500;
        }
        .auth-box form {
          display: grid;
          gap: 16px;
          text-align: left;
        }
        .auth-box label {
          display: grid;
          gap: 6px;
          font-weight: 650;
          font-size: 13px;
          color: #334155;
        }
        .auth-box input, .auth-box select {
          width: 100%;
          height: 44px;
          padding: 0 14px;
          border: 1.5px solid #cbd5e1;
          border-radius: 8px;
          background: #ffffff;
          outline: 0;
          font-size: 14.5px;
          color: #0f172a;
          transition: all 0.2s ease;
        }
        .auth-box input:hover {
          border-color: #94a3b8;
        }
        .auth-box input:focus {
          border-color: var(--blue);
          box-shadow: 0 0 0 3px rgba(11, 109, 255, 0.15);
        }
        .auth-box button[type="submit"] {
          height: 46px;
          background: linear-gradient(135deg, #0b6dff 0%, #0052cc 100%);
          color: #fff;
          border: 0;
          border-radius: 8px;
          font-weight: 700;
          font-size: 15px;
          margin-top: 10px;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(11, 109, 255, 0.35);
          transition: all 0.2s ease;
        }
        .auth-box button[type="submit"]:hover {
          background: linear-gradient(135deg, #257eff 0%, #0b6dff 100%);
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(11, 109, 255, 0.45);
        }
        .auth-box button[type="submit"]:active {
          transform: translateY(0);
        }
        .auth-error {
          background: #fef2f2;
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #dc2626;
          padding: 12px;
          border-radius: 8px;
          font-size: 13px;
          margin-bottom: 18px;
          text-align: left;
          font-weight: 500;
        }
        .sidebar-footer {
          margin-top: auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px;
          border-top: 1px solid var(--line);
          background: rgba(255, 255, 255, 0.4);
          border-radius: 8px;
        }
        .user-info {
          display: flex;
          flex-direction: column;
          text-align: left;
        }
        .logout-btn {
          background: transparent;
          border: 0;
          color: var(--red);
          cursor: pointer;
          padding: 6px;
          border-radius: 4px;
        }
        .logout-btn:hover {
          background: rgba(255, 51, 40, 0.1);
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 14px;
          margin-top: 10px;
        }
        .data-table th, .data-table td {
          padding: 12px;
          border-bottom: 1px solid #edf1f7;
        }
        .data-table th {
          font-weight: 750;
          color: var(--muted);
          background: #f7faff;
        }
        .capabilities-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }
        .cap-badge {
          font-size: 10px;
          font-weight: 850;
          padding: 2px 6px;
          border-radius: 4px;
          color: #fff;
        }
        .cap-badge.blue { background: var(--blue); }
        .cap-badge.green { background: var(--green); }
        .cap-badge.amber { background: var(--amber); }
        .cap-badge.purple { background: var(--purple); }
        .cap-badge.teal { background: var(--teal); }
        .action-btn {
          background: transparent;
          border: 0;
          font-weight: 750;
          font-size: 13.5px;
          cursor: pointer;
          margin-left: 8px;
        }
        .text-blue { color: var(--blue); }
        .text-red { color: var(--red); }
        .clickable-link {
          color: var(--blue);
          cursor: pointer;
        }
        .clickable-link:hover {
          text-decoration: underline;
        }
        .form-drawer {
          display: grid;
          gap: 15px;
        }
        .form-drawer label, .form-field {
          display: grid;
          gap: 5px;
          font-weight: 700;
          font-size: 13.5px;
        }
        .field-label {
          display: inline-flex;
          align-items: baseline;
          gap: 2px;
          width: fit-content;
        }
        .required-mark {
          color: var(--red);
          font-weight: 900;
          line-height: 1;
        }
        .form-drawer input, .form-drawer select, .form-drawer textarea {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid var(--line);
          border-radius: 6px;
          outline: 0;
          font-size: 14px;
        }
        .form-drawer input[type="checkbox"] {
          width: 16px;
          height: 16px;
          padding: 0;
          margin: 0;
          cursor: pointer;
          accent-color: var(--blue);
        }
        .multi-dropdown {
          position: relative;
        }
        .multi-dropdown-trigger {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          width: 100%;
          min-height: 38px;
          padding: 8px 12px;
          border: 1px solid var(--line);
          border-radius: 6px;
          background: #fff;
          cursor: pointer;
          font-weight: 700;
          font-size: 14px;
          color: var(--ink);
          text-align: left;
        }
        .multi-dropdown-trigger.open {
          border-color: var(--blue);
          box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.12);
        }
        .multi-dropdown-value {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: var(--ink);
        }
        .multi-dropdown-placeholder {
          color: var(--muted);
          font-weight: 650;
        }
        .multi-dropdown-menu {
          position: absolute;
          z-index: 20;
          top: calc(100% - 1px);
          left: 0;
          right: 0;
          display: grid;
          gap: 0;
          max-height: 220px;
          overflow-y: auto;
          padding: 0;
          border: 1px solid #9ca3af;
          border-radius: 0;
          background: #fff;
          box-shadow: none;
        }
        .form-drawer .multi-dropdown-option {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 8px;
          width: 100%;
          margin: 0;
          padding: 6px 14px;
          min-height: 26px;
          border: 0;
          border-radius: 0;
          background: #fff;
          color: var(--ink);
          font-weight: 600;
          font-size: 13px;
          text-align: left;
          font-family: inherit;
          cursor: pointer;
        }
        .form-drawer .multi-dropdown-option:hover {
          background: #e5e7eb;
        }
        .form-drawer .multi-dropdown-option.selected {
          background: #777;
          color: #fff;
        }
        .form-drawer textarea {
          height: 80px;
          resize: vertical;
        }
        .open { color: var(--red); }
        .in-progress { color: var(--amber); }
        .resolved { color: var(--green); }
        .closed { color: var(--green); }
        .table-responsive {
          overflow-x: auto;
          width: 100%;
        }
      `}</style>
      <div className="auth-box">
        <div className="railway-mark auth-logo">IR</div>
        <h2>Login to Access</h2>
        <p>{isRegister ? "Register New Account" : "Sign In to Management Portal"}</p>

        {errorMsg && <div className="auth-error">{errorMsg}</div>}

        <form onSubmit={handleAuth}>
          {isRegister && (
            <>
              <label>
                Full Name
                <input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. R. K. Sharma" />
              </label>
              {(roleInput as string) !== "SUPER_ADMIN" && (roleInput as string) !== "DIVISIONAL_ADMIN" && (
                <label>
                  Designation
                  <input required={(roleInput as string) !== "SUPER_ADMIN" && (roleInput as string) !== "DIVISIONAL_ADMIN"} value={designation} onChange={e => setDesignation(e.target.value)} placeholder="e.g. SSE/Tele/Raipur" />
                </label>
              )}
              <label>
                System Role
                <ClearableSelect value={roleInput} onChange={val => setRoleInput(val as UserRole)}>
                  <option value="">Select Role</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                  <option value="DIVISIONAL_ADMIN">Divisional Admin</option>
                  <option value="SSE">SSE (Senior Section Engineer)</option>
                  <option value="TECHNICIAN">Technician</option>
                  <option value="TESTROOM">Testroom</option>
                </ClearableSelect>
              </label>
              {(roleInput as string) !== "SUPER_ADMIN" && (
                <label>
                  Division
                  <ClearableSelect value={divisionInput} onChange={setDivisionInput}>
                    <option value="">Select Division</option>
                    {["Raipur", "Bilaspur", "Nagpur"].map((d: string) => <option key={d} value={d}>{d}</option>)}
                  </ClearableSelect>
                </label>
              )}
            </>
          )}
          <label>
            Username
            <input required value={username} onChange={e => setUsername(e.target.value)} placeholder="username" />
          </label>
          <label>
            Password
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input
                required
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="password"
                style={{ paddingRight: "44px" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "12px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "4px"
                }}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>
          <button type="submit" disabled={loading}>
            {loading ? "Please wait..." : isRegister ? "Register & Login" : "Sign In"}
          </button>
        </form>

        {/* Registration is disabled */}
      </div>
    </div>
  );
}

function Toast({ message }: { message: string }) {
  if (!message) return null;
  return <div className="toast" style={{ position: "fixed", bottom: 20, right: 20, background: "#333", color: "#fff", padding: "12px 20px", borderRadius: 8, boxShadow: "0 10px 30px rgba(0,0,0,0.15)", zIndex: 1000, fontWeight: 700, fontSize: 13 }}>{message}</div>;
}

export default App;

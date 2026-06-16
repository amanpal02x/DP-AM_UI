import { useState, useEffect, Fragment, useRef } from "react";
import type { ReactNode } from "react";
import * as XLSX from "xlsx";
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
  X,
  LogOut,
  Layers,
  Building2,
  Map as MapIcon,
  Menu,
  SlidersHorizontal,
  Filter,
  Edit
} from "lucide-react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayersControl,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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
  hasIpis:                  "IPIS (Integrated Passenger Information System)",
  hasPaSystem:              "P.A. System",
  hasCctv:                  "CCTV",
  hasUts:                   "UTS (Unreserved Ticketing System)",
  hasPrs:                   "PRS (Passenger Reservation System)",
  hasFois:                  "FOIS (Freight Operations Info System)",
  hasDigitalClock:          "Digital Clock",
  hasWifi:                  "High Speed Wi-Fi",
  hasExchange:              "Exchange / EPABX",
  hasTalkback:              "Talkback System",
  hasPms:                   "PMS (Power Management System)",
  hasCms:                   "CMS (Control Management System)",
  hasAtvm:                  "ATVM (Automatic Ticket Vending Machine)",
  hasArt:                   "ART (Accident Relief Train)",
  hasVhf25W:                "VHF 25W Set",
  hasControlTelephoneVoip:  "Control Telephone (VoIP)",
  hasCgsCgdb:               "CGS / CGDB",
  hasTib:                   "Train Indication Board (TIB)",
  hasAgdb:                  "AGDB / At-A-Glance Display Board",
  hasAutoAnnouncement:      "Auto Announcement System",
  hasAnalogClock:           "Analog Clock",
  hasGpsClock:              "GPS Clock",
  hasCoachGuidanceDisplay:  "Coach Guidance Display",
  hasTrainIndicationBoard:  "Train Indication Board",
  hasDigitalDisplayHeritage:"Digital Display (Under Heritage Museum)",
  hasAtAGlanceBoard:        "At A Glance Board",
  hasCctvDe:                "CCTV D&E",
};

// Map Excel column header → DB boolean field key (case-insensitive partial match)
const EXCEL_COL_MAP: Array<{ match: string; field: string }> = [
  { match: "pa system",                field: "hasPaSystem" },
  { match: "p.a. system",              field: "hasPaSystem" },
  { match: "analog clock",             field: "hasAnalogClock" },
  { match: "gpsclock",                 field: "hasGpsClock" },
  { match: "gps clock",                field: "hasGpsClock" },
  { match: "coach guidance",           field: "hasCoachGuidanceDisplay" },
  { match: "train indication board",   field: "hasTrainIndicationBoard" },
  { match: "high speed wi-fi",         field: "hasWifi" },
  { match: "high speed wifi",          field: "hasWifi" },
  { match: "wi-fi",                    field: "hasWifi" },
  { match: "cctv d",                   field: "hasCctvDe" },
  { match: "cctv",                     field: "hasCctv" },
  { match: "digital display",          field: "hasDigitalDisplayHeritage" },
  { match: "at a glance",              field: "hasAtAGlanceBoard" },
  { match: "prs",                      field: "hasPrs" },
  { match: "uts",                      field: "hasUts" },
  { match: "atvm",                     field: "hasAtvm" },
  { match: "ipis",                     field: "hasIpis" },
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
        >
          <span className={selected.length ? "multi-dropdown-value" : "multi-dropdown-placeholder"}>
            {selected.length ? selected.join(", ") : placeholder}
          </span>
          <ChevronDown size={16} />
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
import DailyPositionView from "./DailyPositionView";
import { DAILY_POSITION_CATEGORIES, DAILY_POSITION_FORMS } from "./dailyPositionForms";
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
  | "Dashboard"
  | "Master List"
  | "Assets"
  | "LC Gate"
  | "GIS Mapping"
  | "Daily Position"
  | "Daily Position History"
  | "Sections"
  | "Reports & Analytics"
  | "Users & Roles"
  | "Audit Logs";

const navToHash: Record<NavKey, string> = {
  "Dashboard": "#/dashboard",
  "Master List": "#/stations",
  "Assets": "#/assets",
  "LC Gate": "#/gates",
  "GIS Mapping": "#/gis",
  "Daily Position": "#/daily-position",
  "Daily Position History": "#/daily-position-history",
  "Sections": "#/sections",
  "Reports & Analytics": "#/reports",
  "Users & Roles": "#/users",
  "Audit Logs": "#/audit-logs"
};

const hashToNav: Record<string, NavKey> = {
  "#/dashboard": "Dashboard",
  "#/stations": "Master List",
  "#/assets": "Assets",
  "#/gates": "LC Gate",
  "#/gis": "GIS Mapping",
  "#/daily-position": "Daily Position",
  "#/daily-position-history": "Daily Position History",
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
  setActiveNav: (activeNav: NavKey) => void;
  setDivision: (division: string) => void;
  setToken: (token: string | null) => void;
  setUser: (user: any | null) => void;
  setSidebarOpen: (sidebarOpen: boolean) => void;
  setAssetStatusFilter: (status: string) => void;
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
  activeNav: "Dashboard",
  role: getCachedUser() ? getCachedUser().role : "VIEWER",
  division: getCachedUser() ? (getCachedUser().division || "Raipur") : "Raipur",
  sidebarOpen: false,
  token: getAuthToken(),
  user: getCachedUser(),
  assetStatusFilter: "",
  setActiveNav: (activeNav) => set({ activeNav, sidebarOpen: false, assetStatusFilter: "" }),
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
  logout: () => {
    setAuthToken(null);
    setCachedUser(null);
    set({ token: null, user: null, role: "VIEWER", activeNav: "Dashboard", assetStatusFilter: "" });
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
  purple: ShieldCheck,
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
  { label: "Dashboard", icon: Home, roles: ["SUPER_ADMIN", "DIVISIONAL_ADMIN", "SSE", "TECHNICIAN", "TESTROOM", "VIEWER"] },
  { label: "Master List", icon: Train, roles: ["SUPER_ADMIN", "DIVISIONAL_ADMIN", "SSE", "VIEWER"] },
  { label: "Assets", icon: Box, roles: ["SUPER_ADMIN", "DIVISIONAL_ADMIN", "SSE", "TECHNICIAN", "VIEWER"] },
  { label: "LC Gate", icon: RadioTower, roles: ["SUPER_ADMIN", "DIVISIONAL_ADMIN", "SSE", "TECHNICIAN", "VIEWER"] },
  { label: "Daily Position", icon: ClipboardList, roles: ["TESTROOM"] },
  { label: "Daily Position History", icon: FileClock, roles: ["SUPER_ADMIN", "DIVISIONAL_ADMIN", "TESTROOM"] },
  { label: "Sections", icon: Layers, roles: ["SUPER_ADMIN"] },
  { label: "Reports & Analytics", icon: BarChart3, roles: ["SUPER_ADMIN", "DIVISIONAL_ADMIN", "SSE"] },
  { label: "Users & Roles", icon: Users, roles: ["SUPER_ADMIN", "DIVISIONAL_ADMIN", "SSE"] },
  { label: "Audit Logs", icon: FileClock, roles: ["SUPER_ADMIN", "DIVISIONAL_ADMIN", "SSE"] }
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

  // Parse Excel file using SheetJS
  const parseExcel = (file: File): Promise<{ headers: string[]; rows: any[]; isMasterExcel: boolean }> => {
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
      if (colLower === "station")  { row.name = String(val).trim(); continue; }
      if (colLower === "code")     { row.code = String(val).trim().toUpperCase(); continue; }
      if (colLower === "division") { row.division = String(val).trim(); continue; }
      if (colLower === "state")    { row.state = String(val).trim(); continue; }
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
          <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid var(--line)", borderRadius: 6 }}>
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
      if (profileQuery.data.role === "SUPER_ADMIN") {
        setDivision("");
      } else {
        setDivision(profileQuery.data.division || "Raipur");
      }
    }
  }, [profileQuery.data, setUser, setDivision]);

  const queryClient = useQueryClient();

  // All Queries for dynamic data - Lazy-loaded based on active tab to prevent pool exhaustion!
  const stationsQuery = useQuery({
    queryKey: ["stations-list"],
    queryFn: () => api.stations.list(),
    enabled: !!token && ["Dashboard", "Master List", "Assets", "LC Gate", "GIS Mapping"].includes(activeNav)
  });

  const assetsQuery = useQuery({
    queryKey: ["assets-list"],
    queryFn: () => api.assets.list(),
    enabled: !!token && ["Dashboard", "Assets", "Master List"].includes(activeNav)
  });

  const gatesQuery = useQuery({
    queryKey: ["gates-list"],
    queryFn: () => api.gates.list(),
    enabled: !!token && (activeNav === "LC Gate" || activeNav === "GIS Mapping")
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

  const gisFeaturesQuery = useQuery({
    queryKey: ["gis-features-list"],
    queryFn: () => api.gis.list(),
    enabled: !!token && activeNav === "GIS Mapping"
  });

  // Dashboard Aggregated Query
  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError } = useQuery({
    queryKey: ["dashboard-summary", division, token],
    queryFn: () => getDashboardSummary(division),
    enabled: !!token && activeNav === "Dashboard"
  });

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
  if (isProfileLoading || (activeNav === "Dashboard" && dashboardLoading)) {
    return <div className="app-loading">Loading telecom asset dashboard...</div>;
  }

  if (activeNav === "Dashboard" && (dashboardError || !dashboardData)) {
    return (
      <div className="app-loading">
        <div>
          <h3>Dashboard API unavailable.</h3>
          <p>Please check backend connections or Supabase configurations.</p>
          <button className="export-button" onClick={() => logout()} style={{ marginTop: 12 }}>Sign Out & Retry</button>
        </div>
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
    logsQuery,
    gisFeaturesQuery
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
        {activeNav === "GIS Mapping" ? <PageHeader activeNav={activeNav} /> : null}
        {activeNav === "Dashboard" ? (
          <DashboardView data={dashboardData!} openPanel={openPanel} queries={queries} />
        ) : activeNav === "GIS Mapping" ? (
          <GisView openPanel={openPanel} queries={queries} />
        ) : activeNav === "Daily Position" ? (
          <DailyPositionView role={role} division={division} user={user} mode="form" showToast={showToast} />
        ) : activeNav === "Daily Position History" ? (
          <DailyPositionView role={role} division={division} user={user} mode="history" showToast={showToast} />
        ) : activeNav === "Sections" ? (
          <SectionsManagementView showToast={showToast} />
        ) : (
          <ModuleView activeNav={activeNav} openPanel={openPanel} queries={queries} />
        )}
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
          width: "min(460px, calc(100vw - 32px))",
          background: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 24px 60px rgba(10, 20, 42, 0.22)",
          border: "1px solid var(--line)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "zoomIn 200ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{
          background: "linear-gradient(135deg, var(--navy) 0%, #1e294b 100%)",
          color: "#fff",
          padding: "20px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", color: "var(--blue)" }}>
              Account Settings
            </span>
            <h3 style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 850 }}>
              Edit Profile Credentials
            </h3>
          </div>
          <button 
            onClick={close}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: 0,
              color: "#fff",
              width: 32,
              height: 32,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
            }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} style={{ padding: 24, display: "grid", gap: 16 }}>
          <label style={{ display: "grid", gap: 6, fontWeight: 700, fontSize: 13, color: "var(--navy)", textAlign: "left" }}>
            Full Name
            <input 
              required 
              style={{ padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 8, background: "#f8fafc", color: "var(--navy)", fontWeight: 550 }}
              value={name} 
              onChange={e => setName(e.target.value)} 
            />
          </label>
          
          <label style={{ display: "grid", gap: 6, fontWeight: 700, fontSize: 13, color: "var(--navy)", textAlign: "left" }}>
            Username (Read-Only)
            <input 
              readOnly
              style={{ padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 8, background: "#f1f5f9", color: "var(--muted)", cursor: "not-allowed", fontWeight: 550 }}
              value={user?.username || ""} 
            />
          </label>

          {showDesignationField && (
            <label style={{ display: "grid", gap: 6, fontWeight: 700, fontSize: 13, color: "var(--navy)", textAlign: "left" }}>
              Designation
              <input 
                style={{ padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 8, background: "#f8fafc", color: "var(--navy)", fontWeight: 550 }}
                value={designation} 
                onChange={e => setDesignation(e.target.value)} 
              />
            </label>
          )}

          <label style={{ display: "grid", gap: 6, fontWeight: 700, fontSize: 13, color: "var(--navy)", textAlign: "left" }}>
            New Password
            <input 
              type="password"
              placeholder="Leave blank to keep current password"
              style={{ padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 8, background: "#f8fafc", color: "var(--navy)", fontWeight: 550 }}
              value={password} 
              onChange={e => setPassword(e.target.value)} 
            />
          </label>

          {/* Footer Actions */}
          <div style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 12,
            borderTop: "1px solid var(--line)",
            paddingTop: 16,
            marginTop: 8
          }}>
            <button 
              type="button"
              className="export-button" 
              onClick={close}
              style={{ background: "#f1f5f9", color: "#334155", borderColor: "#cbd5e1", margin: 0, minHeight: 38 }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="export-button"
              disabled={loading}
              style={{ margin: 0, minHeight: 38 }}
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SidebarDailyPositionAccordion() {
  const {
    dpSelectedCategory,
    dpSelectedFormName,
    dpOpenCategory,
    dpCircuitSearch,
    setDpSelectedCategory,
    setDpSelectedFormName,
    setDpOpenCategory,
    setDpCircuitSearch
  } = useAppStore();

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
                  return (
                    <button
                      key={form.name}
                      type="button"
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        borderRadius: "4px",
                        border: "none",
                        background: isActive ? "var(--blue)" : "transparent",
                        color: isActive ? "#ffffff" : "var(--navy)",
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
                      <span>{form.name}</span>
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

// Sidebar Component
function Sidebar({ onEditProfile }: { onEditProfile: () => void }) {
  const { activeNav, role, sidebarOpen, setActiveNav, logout, user } = useAppStore();
  const visibleNav = navItems.filter((item) => item.roles.includes(role));
  const [showProfileCard, setShowProfileCard] = useState(false);
  const [dpDropdownOpen, setDpDropdownOpen] = useState(true);

  return (
    <aside className={`sidebar ${sidebarOpen ? "show" : ""}`}>
      <div className="brand">
        <div className="railway-mark">IR</div>
        <div>
          <h1>SECR</h1>
          <p>Telecom Asset Management</p>
        </div>
      </div>

      <nav className="nav-list" aria-label="Primary">
        {visibleNav.map((item) => (
          <Fragment key={item.label}>
            <button
              className={`nav-item ${item.label === activeNav ? "active" : ""}`}
              onClick={() => {
                if (item.label === "Daily Position") {
                  if (activeNav === "Daily Position") {
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
              <span>{item.label}</span>
              {item.badge ? <b>{item.badge}</b> : null}
              {item.expandable ? <ChevronDown className="nav-caret" size={16} /> : null}
            </button>
            {item.label === "Daily Position" && activeNav === "Daily Position" && dpDropdownOpen && (
              <SidebarDailyPositionAccordion />
            )}
          </Fragment>
        ))}
      </nav>

      {user && (
        <div 
          className="sidebar-footer"
          onMouseEnter={() => setShowProfileCard(true)}
          onMouseLeave={() => setShowProfileCard(false)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "10px 14px",
            borderRadius: "10px",
            border: "1px solid var(--line)",
            background: "rgba(255, 255, 255, 0.6)",
            marginTop: "auto"
          }}
        >
          {/* Visual Avatar */}
          <div 
            className="profile-avatar" 
            style={{ 
              width: 38, 
              height: 38, 
              fontSize: 14, 
              fontWeight: 700, 
              borderRadius: "50%", 
              display: "grid", 
              placeItems: "center",
              background: "linear-gradient(135deg, var(--blue) 0%, var(--purple) 100%)",
              color: "#fff",
              flexShrink: 0
            }}
          >
            {user.name[0].toUpperCase()}
          </div>

          {/* User Details */}
          <div className="user-info" style={{ cursor: "pointer", flex: 1, minWidth: 0 }}>
            <strong style={{ display: "block", fontSize: 13, color: "var(--navy)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</strong>
            <small style={{ display: "block", fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.designation || user.role}</small>
          </div>

          {/* Actions Button Group */}
          <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
            <button 
              className="logout-btn" 
              onClick={onEditProfile} 
              title="Edit Profile"
              style={{
                background: "transparent",
                border: 0,
                color: "var(--blue)",
                padding: "6px",
                borderRadius: "4px",
                cursor: "pointer",
                display: "grid",
                placeItems: "center"
              }}
            >
              <Edit size={16} />
            </button>
            <button 
              className="logout-btn" 
              onClick={logout} 
              title="Sign Out"
              style={{
                background: "transparent",
                border: 0,
                color: "var(--red)",
                padding: "6px",
                borderRadius: "4px",
                cursor: "pointer",
                display: "grid",
                placeItems: "center"
              }}
            >
              <LogOut size={16} />
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
  const { division, setDivision, role } = useAppStore();
  const stationsQ = useQuery({ queryKey: ["stations-list"], queryFn: () => api.stations.list(), staleTime: 60000 });
  const divs: string[] = Array.from(new Set((stationsQ.data?.data || []).map((s: any) => s.division).filter(Boolean).map(normalizeDivision))) as string[];
  const divOptions = divs.length > 0 ? divs : ["Raipur", "Bilaspur", "Nagpur"];

  if (role === "DIVISIONAL_ADMIN") {
    return (
      <section className="page-title">
        <div>
          <h2>{activeNav}</h2>
          <p>{activeNav === "Dashboard" ? "Overview of Telecom Assets and Operations" : `${activeNav} operations workspace`}</p>
        </div>
        <label className="division-select title-division">
          <span>Division</span>
          <select value={division} onChange={(event) => setDivision(event.target.value)}>
            {divOptions.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
      </section>
    );
  }

  return (
    <section className="page-title">
      <div>
        <h2>{activeNav}</h2>
        <p>{activeNav === "Dashboard" ? "Overview of Telecom Assets and Operations" : `${activeNav} operations workspace`}</p>
      </div>
      {role !== "SUPER_ADMIN" && (
        <div style={{ textTransform: "uppercase", fontWeight: 700, fontSize: 13, background: "#eef2f6", padding: "8px 16px", borderRadius: 6, color: "var(--muted)" }}>
          {`Division: ${normalizeDivision(division)}`}
        </div>
      )}
    </section>
  );
}

// Dashboard View
function DashboardView({
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
    if (label === "Stations") {
      setActiveNav("Master List");
    } else if (label === "Gates" || label === "LC Gate" || label === "LC Gates") {
      setActiveNav("LC Gate");
    } else if (label === "OFC Route (KM)") {
      setActiveNav("GIS Mapping");
    } else {
      setActiveNav(label as any);
    }
  };

  return (
    <>
      <section className="kpi-grid">
        {data.kpis.map((kpi, index) => (
          <KpiCard key={kpi.id} kpi={kpi} index={index} />
        ))}
      </section>
 
      <section className="dashboard-grid">
        <ChartPanel title="Assets by Category" total={data.bottomStats[1].value} metrics={data.categories} openPanel={() => useAppStore.getState().setActiveNav("Assets")} />
        <MapPanel openPanel={openPanel} compact queries={queries} />
        <StatusPanel statuses={data.statuses} />
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

    </>
  );
}
 
// KPI Card Component
function KpiCard({ kpi, index }: { kpi: KpiMetric; index: number }) {
  const Icon = toneIcons[kpi.tone];
  const { setActiveNav, setAssetStatusFilter } = useAppStore();

  const handleClick = () => {
    if (kpi.label === "Total Assets") {
      setActiveNav("Assets");
      setAssetStatusFilter("");
    } else if (kpi.label === "Operational Assets") {
      setActiveNav("Assets");
      setAssetStatusFilter("OPERATIONAL");
    } else if (kpi.label === "Under Maintenance") {
      setActiveNav("Assets");
      setAssetStatusFilter("UNDER_MAINTENANCE");
    } else if (kpi.label === "Faulty Assets") {
      setActiveNav("Assets");
      setAssetStatusFilter("FAULTY");
    } else if (kpi.label === "Operational Health") {
      setActiveNav("Reports & Analytics");
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
  return (
    <article className={`panel chart-panel ${className}`}>
      <h3>{title}</h3>
      <div className="donut-layout">
        <div className="donut-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={metrics}
                dataKey="value"
                innerRadius="52%"
                outerRadius="82%"
                paddingAngle={1}
              >
                {metrics.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
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
              <i style={{ background: metric.color }} />
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

// Leaflet Map Panel Component
function MapPanel({
  className = "",
  compact = false,
  openPanel,
  queries
}: {
  className?: string;
  compact?: boolean;
  openPanel: (title: string) => void;
  queries: any;
}) {
  const markerIcon = (type: string) =>
    L.divIcon({
      className: `map-pin ${type}`,
      html: "<span></span>",
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

  const stations = queries.stationsQuery.data?.data || [];
  const gates = queries.gatesQuery.data?.data || [];
  const gisFeatures = queries.gisFeaturesQuery.data?.data || [];

  // Generate markers list
  const markers: Array<{ name: string; type: string; position: [number, number] }> = [];
  stations.forEach((s: any) => {
    // Raipur Junction position, generate nearby for others or use location name coordinates if parsed
    let pos: [number, number] = [21.2514, 81.6296];
    if (s.code === "BSP") pos = [22.0797, 82.1391];
    else if (s.code === "DURG") pos = [21.1904, 81.2849];
    else if (s.code === "R") pos = [21.2514, 81.6296];
    else {
      // Offset slightly to spread out
      pos = [21.2514 + (Math.random() - 0.5) * 0.4, 81.6296 + (Math.random() - 0.5) * 0.4];
    }
    markers.push({ name: s.name, type: "station", position: pos });
  });

  gates.forEach((g: any) => {
    let pos: [number, number] = [21.2668, 81.5185];
    pos = [pos[0] + (Math.random() - 0.5) * 0.25, pos[1] + (Math.random() - 0.5) * 0.25];
    markers.push({ name: g.gateNumber + (g.name ? ` - ${g.name}` : ""), type: "lc", position: pos });
  });

  const polyLines: Array<{ id: string; name: string; color: string; coords: [number, number][] }> = [];
  gisFeatures.forEach((f: any) => {
    try {
      const coords = typeof f.coordinates === "string" ? JSON.parse(f.coordinates) : f.coordinates;
      if (Array.isArray(coords)) {
        polyLines.push({
          id: f.id,
          name: f.name,
          color: f.type === "OFC_ROUTE" ? "#0b6dff" : "#ff8a00",
          coords: coords as [number, number][]
        });
      }
    } catch (e) {
      // invalid coordinates format
    }
  });

  return (
    <article className={`panel map-panel ${compact ? "" : "map-full-panel"} ${className}`}>
      <h3>Live Telecom Infrastructure Map</h3>
      <div className="leaflet-shell">
        <MapContainer center={[21.315, 81.63]} zoom={9} scrollWheelZoom className="leaflet-map">
          <TileLayer
            attribution="OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LayersControl position="topright">
            <LayersControl.Overlay checked name="OFC routes">
              <>
                {polyLines.filter(p => p.color === "#0b6dff").map(p => (
                  <Polyline key={p.id} pathOptions={{ color: p.color, weight: 5 }} positions={p.coords}>
                    <Popup><strong>OFC Line:</strong> {p.name}</Popup>
                  </Polyline>
                ))}
                {polyLines.length === 0 && (
                  <Polyline pathOptions={{ color: "#0b6dff", weight: 5 }} positions={fallbackRouteLines} />
                )}
              </>
            </LayersControl.Overlay>
            <LayersControl.Overlay checked name="LC Cabin links">
              <>
                {polyLines.filter(p => p.color === "#ff8a00").map(p => (
                  <Polyline key={p.id} pathOptions={{ color: p.color, weight: 4 }} positions={p.coords}>
                    <Popup><strong>LC Link:</strong> {p.name}</Popup>
                  </Polyline>
                ))}
              </>
            </LayersControl.Overlay>
            <LayersControl.Overlay checked name="Telecom Points">
              <>
                {markers.map((point, index) => (
                  <Marker icon={markerIcon(point.type)} key={`${point.name}-${index}`} position={point.position}>
                    <Popup>
                      <strong>{point.name}</strong>
                      <br />
                      Type: {point.type.toUpperCase()}
                    </Popup>
                  </Marker>
                ))}
                {markers.length === 0 && defaultStationPoints.map((point) => (
                  <Marker icon={markerIcon(point.type)} key={point.name} position={point.position}>
                    <Popup>
                      <strong>{point.name}</strong>
                      <br />
                      Type: {point.type.toUpperCase()}
                    </Popup>
                  </Marker>
                ))}
              </>
            </LayersControl.Overlay>
          </LayersControl>
          <MapResize />
        </MapContainer>
        <div className="map-legend">
          <span><i className="blue-dot" />Stations</span>
          <span><i className="green-dot" />LC Gates</span>
          <span><i className="amber-dot" />Assets</span>
          <span><i className="red-dot" />Faults</span>
        </div>
      </div>
    </article>
  );
}

function MapResize() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
  }, [map]);
  return null;
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

// Activity Panel Component
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

// GIS View Component
function GisView({ openPanel, queries }: { openPanel: (title: string) => void; queries: any }) {
  const queryClient = useQueryClient();
  const [featureName, setFeatureName] = useState("");
  const [featureType, setFeatureType] = useState("OFC_ROUTE");
  const [coordinatesText, setCoordinatesText] = useState("");

  const addGisMutation = useMutation({
    mutationFn: (body: any) => api.gis.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gis-features-list"] });
      setFeatureName("");
      setCoordinatesText("");
    }
  });

  const deleteGisMutation = useMutation({
    mutationFn: (id: string) => api.gis.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gis-features-list"] });
    }
  });

  const handleAddFeature = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsed = JSON.parse(coordinatesText);
      addGisMutation.mutate({
        name: featureName,
        type: featureType,
        coordinates: parsed,
        division: useAppStore.getState().division
      });
    } catch (err) {
      alert("Invalid JSON format for coordinates. E.g. [[21.2, 81.6], [21.3, 81.7]]");
    }
  };

  const gisFeatures = queries.gisFeaturesQuery.data?.data || [];

  return (
    <section className="module-grid gis-page">
      <MapPanel openPanel={openPanel} queries={queries} />
      <article className="panel">
        <h3>Map Polyline Features</h3>
        <form onSubmit={handleAddFeature} style={{ display: "grid", gap: 10, margin: "10px 0 20px" }}>
          <label style={{ fontSize: 12, fontWeight: 700 }}>
            Feature Name
            <input required placeholder="e.g. OFC Link Raipur to Durg" style={{ width: "100%", padding: 6, border: "1px solid var(--line)", borderRadius: 4 }} value={featureName} onChange={e => setFeatureName(e.target.value)} />
          </label>
          <label style={{ fontSize: 12, fontWeight: 700 }}>
            Type
            <select style={{ width: "100%", padding: 6, border: "1px solid var(--line)", borderRadius: 4 }} value={featureType} onChange={e => setFeatureType(e.target.value)}>
              <option value="OFC_ROUTE">OFC Route</option>
              <option value="QUAD_CABLE_ROUTE">Quad Cable Route</option>
              <option value="MAST">Mast Layer</option>
            </select>
          </label>
          <label style={{ fontSize: 12, fontWeight: 700 }}>
            Coordinates (JSON format)
            <textarea required placeholder="[[21.251, 81.62], [21.19, 81.28]]" style={{ width: "100%", padding: 6, border: "1px solid var(--line)", borderRadius: 4, height: 60 }} value={coordinatesText} onChange={e => setCoordinatesText(e.target.value)} />
          </label>
          <button type="submit" className="export-button" style={{ minHeight: 32 }}>Add Feature</button>
        </form>

        <div className="features-list" style={{ overflowY: "auto", maxHeight: 240 }}>
          {gisFeatures.map((f: any) => (
            <div key={f.id} className="module-row" style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #eee" }}>
              <div>
                <strong>{f.name}</strong>
                <small style={{ display: "block", color: "var(--muted)" }}>{f.type} • {f.division}</small>
              </div>
              <button style={{ background: "transparent", border: 0, color: "var(--red)", fontWeight: 700 }} onClick={() => deleteGisMutation.mutate(f.id)}>Delete</button>
            </div>
          ))}
        </div>
      </article>
    </section>
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

  const sectionsQuery = useQuery({
    queryKey: ["daily-position-sections"],
    queryFn: () => api.dailyPosition.sections(),
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

  const filteredRows = rows.filter((row: any) => {
    const text = `${row.division} ${row.majorSection} ${row.section}`.toLowerCase();
    return text.includes(searchTerm.toLowerCase());
  });
  const pageSize = 10;
  const totalPages = Math.ceil(filteredRows.length / pageSize);
  const paginatedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
    const rowsFromFile = await new Promise<any[]>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Unable to read file"));
      reader.onload = (loadEvent) => {
        try {
          if (ext === "xlsx" || ext === "xls") {
            const workbook = XLSX.read(loadEvent.target?.result, { type: "array" });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            resolve(XLSX.utils.sheet_to_json(sheet, { defval: "" }));
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
          Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length} sections
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

      {renderSectionPagination()}

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
            {paginatedRows.map((row: any, idx: number) => (
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
            {filteredRows.length === 0 && (
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
            <button className="modal-close" type="button" onClick={() => setAddSectionOpen(false)}>X</button>
            <h2>Add Section</h2>
            <p>Register division, major section, and section for Daily Position forms.</p>
            <form className="section-modal-form" onSubmit={handleCreate}>
              <label>
                Division
                <select value={division} onChange={event => setDivision(event.target.value)}>
                  {divisionOptions.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
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
  const { assetStatusFilter, setAssetStatusFilter } = useAppStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDivision, setFilterDivision] = useState("");
  const [filterState, setFilterState] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [expandedStationCode, setExpandedStationCode] = useState<string | null>(null);
  const [expandedCategoryKey, setExpandedCategoryKey] = useState<string | null>(null); // "stationCode::CATEGORY"
  const [currentPage, setCurrentPage] = useState(1);

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
                        <td>
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
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button 
                            className="action-btn text-blue" 
                            onClick={() => openPanel("Edit Station", s.id)}
                            style={{ marginRight: 8 }}
                          >
                            Edit
                          </button>
                          <button className="action-btn text-red" onClick={() => deleteStation.mutate(s.code)}>Delete</button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr style={{ background: "#f8fafd" }}>
                          <td colSpan={8} style={{ padding: "20px 28px", borderTop: "none" }}>
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

                              // Category icon map
                              const catIcon: Record<string, string> = {
                                "CCTV": "📷",
                                "IPIS": "📺",
                                "OFC": "🔌",
                                "WIFI": "📶",
                                "PA SYSTEM": "🔊",
                                "OTHERS": "📦",
                              };
                              const catColor: Record<string, { bg: string; border: string; accent: string }> = {
                                "CCTV":     { bg: "#eaf2ff", border: "#b3d1ff", accent: "#0b6dff" },
                                "IPIS":     { bg: "#edf9f0", border: "#a3ddb8", accent: "#0db76b" },
                                "OFC":      { bg: "#fff7e6", border: "#ffd08a", accent: "#d97300" },
                                "WIFI":     { bg: "#f3eeff", border: "#c9b3ff", accent: "#7c3aed" },
                                "PA SYSTEM":{ bg: "#fff0f0", border: "#ffb3b3", accent: "#ef4444" },
                                "OTHERS":   { bg: "#f0f4ff", border: "#c5cfe8", accent: "#4b5e8b" },
                              };
                              const getColor = (cat: string) => catColor[cat] || catColor["OTHERS"];

                              return (
                                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                                  {/* ── Category Cards Row ── */}
                                  <div style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                                    gap: 10,
                                    alignItems: "stretch"
                                  }}>
                                    {telecomAssetsToShow.map((cap: any) => {
                                      const categoryName = cap.label;
                                      const assets = assetsByCategory[categoryName] || [];
                                      const key = `${s.code}::${categoryName}`;
                                      const isOpen = expandedCategoryKey === key;
                                      const anyOpen = expandedCategoryKey && expandedCategoryKey.startsWith(`${s.code}::`);
                                      const col = getColor(categoryName);
                                      // Hide other cards when one is selected
                                      if (anyOpen && !isOpen) return null;
                                      return (
                                        <button
                                          key={categoryName}
                                          onClick={() => setExpandedCategoryKey(isOpen ? null : key)}
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            gap: 10,
                                            minHeight: 42,
                                            width: "100%",
                                            padding: "9px 12px",
                                            background: isOpen ? col.accent : col.bg,
                                            border: isOpen ? `1px solid ${col.accent}` : `1px solid ${col.border}`,
                                            borderRadius: 8,
                                            cursor: "pointer",
                                            transition: "all 0.2s ease",
                                            boxShadow: isOpen ? `0 4px 14px ${col.accent}33` : "none",
                                          }}
                                        >
                                          <span style={{
                                            fontSize: 13,
                                            fontWeight: 800,
                                            letterSpacing: "0.4px",
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
                                              minWidth: 24,
                                              height: 22,
                                              display: "inline-grid",
                                              placeItems: "center",
                                              flexShrink: 0,
                                              fontSize: 11,
                                              fontWeight: 800,
                                              background: isOpen ? "rgba(255,255,255,0.24)" : "#fff",
                                              color: isOpen ? "#fff" : col.accent,
                                              border: isOpen ? "1px solid rgba(255,255,255,0.28)" : `1px solid ${col.border}`,
                                              borderRadius: 999,
                                              padding: "0 7px",
                                            }}>
                                              {assets.length}
                                            </span>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>

                                  {/* ── Expanded Asset Rows (for the open category) ── */}
                                  {expandedCategoryKey && expandedCategoryKey.startsWith(`${s.code}::`) && (() => {
                                    const openCat = expandedCategoryKey.split("::")[1];
                                    const openAssets: any[] = assetsByCategory[openCat] || [];
                                    const col = getColor(openCat);
                                    return (
                                      <div style={{
                                        border: `1.5px solid ${col.border}`,
                                        borderRadius: 12,
                                        overflow: "hidden",
                                        background: "#fff",
                                        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                                        animation: "fadeSlideIn 0.2s ease",
                                      }}>
                                        {/* subheader */}
                                        <div style={{
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "space-between",
                                          padding: "10px 16px",
                                          background: col.bg,
                                          borderBottom: `1.5px solid ${col.border}`,
                                        }}>
                                          <span style={{ fontSize: 13, fontWeight: 800, color: col.accent, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                            {openCat} - Telecom Asset Details
                                          </span>
                                          <button
                                            onClick={() => setExpandedCategoryKey(null)}
                                            style={{ background: "none", border: "none", cursor: "pointer", color: col.accent, fontSize: 18, lineHeight: 1, padding: "0 4px" }}
                                          >✕</button>
                                        </div>

                                        {/* asset rows */}
                                        <div style={{ display: "grid", gap: 0 }}>
                                          {openAssets.length === 0 && (
                                            <div style={{ padding: "14px 16px", color: "var(--muted)", fontSize: 13 }}>
                                              This Telecom Asset is ticked for the station, but no details are registered yet.
                                            </div>
                                          )}
                                          {openAssets.map((asset: any, idx: number) => (
                                            <div
                                              key={asset.id}
                                              style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                padding: "11px 16px",
                                                borderBottom: idx < openAssets.length - 1 ? `1px solid ${col.border}55` : "none",
                                                background: "#fff",
                                                transition: "background 0.15s ease",
                                                cursor: "pointer",
                                              }}
                                              onMouseEnter={(e) => { e.currentTarget.style.background = col.bg; }}
                                              onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}
                                              onClick={() => openPanel("Asset Details", asset.id)}
                                            >
                                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                <div style={{ width: 7, height: 7, borderRadius: "50%", background: col.accent, flexShrink: 0 }} />
                                                <span style={{ fontSize: 12, fontWeight: 800, color: col.accent }}>{idx + 1}.</span>
                                                <div>
                                                  <strong style={{ fontSize: 14, color: "var(--navy)", fontWeight: 700 }}>
                                                    {asset.assetMode === ASSET_MODE_HAS_EQUIPMENT ? asset.equipmentName : openCat}
                                                  </strong>
                                                  <small style={{ display: "block", color: "var(--muted)", fontSize: 11 }}>
                                                    {asset.make || "-"} / {asset.model || "-"}
                                                  </small>
                                                </div>
                                                {asset.rdsoSpec && (
                                                  <span style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 500 }}>
                                                    RDSO: {asset.rdsoSpec}
                                                  </span>
                                                )}
                                              </div>
                                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                <span
                                                  className={`pill ${asset.status.toLowerCase()}`}
                                                  style={{ fontSize: 11, padding: "2px 8px", fontWeight: 700 }}
                                                >
                                                  {asset.status}
                                                </span>
                                                <button
                                                  className="action-btn text-blue"
                                                  style={{ fontSize: 13, fontWeight: 700, textDecoration: "none", border: "none", padding: 0 }}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    openPanel("Asset Details", asset.id);
                                                  }}
                                                >
                                                  View Details
                                                </button>
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
                          </td>
                        </tr>
                      )}
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
                        <button className="action-btn text-blue" onClick={() => openPanel("Edit Asset", a.id)} style={{ marginRight: 8 }}>Edit</button>
                        <button className="action-btn text-red" onClick={() => deleteAsset.mutate(a.id)}>Delete</button>
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
                        <button className="action-btn text-blue" onClick={() => openPanel("Edit LC Gate", g.id)} style={{ marginRight: 8 }}>Edit</button>
                        <button className="action-btn text-red" onClick={() => deleteGate.mutate(g.id)}>Delete</button>
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
                      <td><small>{new Date(l.createdAt).toLocaleString()}</small></td>
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

  const shouldShowActionButtons = ["Master List", "Assets", "LC Gate", "Users & Roles"].includes(activeNav);

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
          <p>{activeNav === "Dashboard" ? "Overview of Telecom Assets and Operations" : `${activeNav} operations workspace`}</p>
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
                  <select value={filterDivision} onChange={(e) => setFilterDivision(e.target.value)}>
                    <option value="">All Divisions</option>
                    {uniqueDivisions.map((div) => (
                      <option key={div} value={div}>{div}</option>
                    ))}
                  </select>
                </div>

                {/* State Filter */}
                <div className="filter-group">
                  <label>State</label>
                  <select value={filterState} onChange={(e) => setFilterState(e.target.value)}>
                    <option value="">All States</option>
                    {uniqueStates.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                {/* Category / Telecom Asset Filter */}
                <div className="filter-group">
                  <label>{activeNav === "Assets" ? "Telecom Asset" : "Category"}</label>
                  <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                    <option value="">{activeNav === "Assets" ? "All Telecom Assets" : "All Categories"}</option>
                    {categoriesList.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Status Filter for Assets */}
                {activeNav === "Assets" && (
                  <div className="filter-group">
                    <label>Status</label>
                    <select 
                      value={assetStatusFilter} 
                      onChange={(e) => setAssetStatusFilter(e.target.value)}
                    >
                      <option value="">All Statuses</option>
                      <option value="OPERATIONAL">Operational</option>
                      <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                      <option value="FAULTY">Faulty</option>
                      <option value="OBSOLETE">Obsolete</option>
                    </select>
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
        <div style={{
          background: "linear-gradient(135deg, var(--navy) 0%, #1e294b 100%)",
          color: "#fff",
          padding: "24px 28px",
          position: "relative",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
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
        <div style={{ padding: 28, overflowY: "auto", display: "grid", gap: 24 }}>
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
        <div style={{
          background: "#f8fafd",
          padding: "16px 28px",
          borderTop: "1px solid var(--line)",
          display: "flex",
          justifyContent: "flex-end"
        }}>
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
        <div style={{
          background: "linear-gradient(135deg, var(--navy) 0%, #1e294b 100%)",
          color: "#fff",
          padding: "24px 28px",
          position: "relative",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
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
        <div style={{ padding: 28, overflowY: "auto", display: "grid", gap: 20 }}>
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
            <div style={{ display: "grid", gridTemplateColumns: userObj.role === "SUPER_ADMIN" ? "1fr" : "1fr 1fr", gap: 16 }}>
              <div>
                <small style={{ display: "block", fontSize: 10, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>System Role</small>
                <span className="pill info" style={{ display: "inline-block", marginTop: 4, fontSize: 12 }}>{userObj.role}</span>
              </div>
              {userObj.role !== "SUPER_ADMIN" && (
                <div>
                  <small style={{ display: "block", fontSize: 10, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>Division</small>
                  <strong style={{ display: "block", fontSize: 14, color: "var(--navy)", marginTop: 4 }}>{normalizeDivision(userObj.division) || "HQ"}</strong>
                </div>
              )}
            </div>

            {/* Designation */}
            {userObj.role !== "SUPER_ADMIN" && userObj.role !== "DIVISIONAL_ADMIN" && (
              <div>
                <small style={{ display: "block", fontSize: 10, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>Designation</small>
                <strong style={{ display: "block", fontSize: 14, color: "var(--navy)", marginTop: 4 }}>{userObj.designation || "-"}</strong>
              </div>
            )}

            {/* Member Since */}
            <div>
              <small style={{ display: "block", fontSize: 10, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>Account Created On</small>
              <strong style={{ display: "block", fontSize: 14, color: "var(--navy)", marginTop: 4 }}>
                {new Date(userObj.createdAt).toLocaleDateString()} at {new Date(userObj.createdAt).toLocaleTimeString()}
              </strong>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{
          background: "#f8fafd",
          padding: "16px 28px",
          borderTop: "1px solid var(--line)",
          display: "flex",
          justifyContent: "flex-end"
        }}>
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
        <div style={{
          background: "linear-gradient(135deg, var(--navy) 0%, #1e294b 100%)",
          color: "#fff",
          padding: "24px 28px",
          position: "relative",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
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
        <div style={{ padding: 28, overflowY: "auto", display: "grid", gap: 24 }}>
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
        <div style={{
          background: "#f8fafd",
          padding: "16px 28px",
          borderTop: "1px solid var(--line)",
          display: "flex",
          justifyContent: "flex-end"
        }}>
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-list"] });
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

  // Add User states
  const [addUsername, setAddUsername] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addName, setAddName] = useState("");
  const [addRole, setAddRole] = useState<UserRole>("SSE");
  const [addDesignation, setAddDesignation] = useState("");
  const [addDivision, setAddDivision] = useState("Raipur");

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
  }, [itemId, title, queries]);

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
      const isSuper = newRole === "SUPER_ADMIN";
      const isDivAdmin = newRole === "DIVISIONAL_ADMIN";
      changeUserRole.mutate({
        id: itemId!,
        body: { 
          role: newRole, 
          designation: (isSuper || isDivAdmin) ? null : newDesignation, 
          division: isSuper ? null : stationDivision 
        }
      });
    } else if (title === "Add User") {
      const currentRole = useAppStore.getState().role;
      const userDiv = useAppStore.getState().user?.division || "Raipur";
      const isSuper = addRole === "SUPER_ADMIN";
      const isDivAdmin = addRole === "DIVISIONAL_ADMIN";
      createUser.mutate({
        username: addUsername,
        password: addPassword,
        name: addName,
        role: addRole,
        designation: (isSuper || isDivAdmin) ? undefined : addDesignation,
        division: isSuper ? undefined : (currentRole === "SUPER_ADMIN" ? addDivision : userDiv)
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
            <select value={addRole} onChange={e => setAddRole(e.target.value as UserRole)}>
              {currentRole === "SUPER_ADMIN" ? (
                <>
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  <option value="DIVISIONAL_ADMIN">DIVISIONAL_ADMIN</option>
                  <option value="SSE">SSE</option>
                  <option value="TECHNICIAN">TECHNICIAN</option>
                  <option value="TESTROOM">TESTROOM</option>
                </>
              ) : (
                <>
                  <option value="SSE">SSE</option>
                  <option value="TECHNICIAN">TECHNICIAN</option>
                  <option value="TESTROOM">TESTROOM</option>
                </>
              )}
            </select>
          </label>
          {addRole !== "SUPER_ADMIN" && addRole !== "DIVISIONAL_ADMIN" && (
            <label>
              Designation
              <input placeholder="e.g. SSE/Tele/Raipur" value={addDesignation} onChange={e => setAddDesignation(e.target.value)} />
            </label>
          )}
          {addRole !== "SUPER_ADMIN" && (
            currentRole === "SUPER_ADMIN" ? (
              <label>
                Division
                <select value={addDivision} onChange={e => setAddDivision(e.target.value)}>
                  {uniqueDivisions.length > 0
                    ? uniqueDivisions.map((d: string) => <option key={d} value={d}>{d}</option>)
                    : ["Raipur", "Bilaspur", "Nagpur"].map((d: string) => <option key={d} value={d}>{d}</option>)
                  }
                </select>
              </label>
            ) : (
              <label>
                Division (Locked)
                <input readOnly value={userDiv} />
              </label>
            )
          )}
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
            <select required value={assetCategory} onChange={e => handleCategoryChange(e.target.value)}>
              {telecomAssetOptions.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label>
            {requiredLabel("Station Code")}
            <select required value={assetStation} onChange={e => setAssetStation(e.target.value)}>
              <option value="">Select Station</option>
              {stations.map((s: any) => <option key={s.id} value={s.code}>{s.name} ({s.code})</option>)}
            </select>
          </label>
          <label>
            {requiredLabel("Mode")}
            <select required value={assetMode} onChange={e => {
              setAssetMode(e.target.value);
              if (e.target.value === ASSET_MODE_STANDALONE) setAssetEquipmentName("");
            }}>
              <option value={ASSET_MODE_STANDALONE}>Standalone</option>
              <option value={ASSET_MODE_HAS_EQUIPMENT}>Has Equipment</option>
            </select>
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
            <input required type="date" value={assetDop} onChange={e => setAssetDop(e.target.value)} />
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
            <select required value={assetMaintenanceValidity} onChange={e => {
              setAssetMaintenanceValidity(e.target.value);
              if (e.target.value === MAINTENANCE_NOT_AVAILABLE) {
                setAssetMaintenanceFrom("");
                setAssetMaintenanceTo("");
              }
            }}>
              {MAINTENANCE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          {needsMaintenanceDates && (
            <>
              <label>
                {requiredLabel("Maintenance From")}
                <input required type="date" value={assetMaintenanceFrom} onChange={e => setAssetMaintenanceFrom(e.target.value)} />
              </label>
              <label>
                {requiredLabel("Maintenance To")}
                <input required type="date" value={assetMaintenanceTo} onChange={e => setAssetMaintenanceTo(e.target.value)} />
              </label>
            </>
          )}
          <label>
            {requiredLabel("Location")}
            <input required placeholder="e.g. Platform 1 Server Room" value={assetLocation} onChange={e => setAssetLocation(e.target.value)} />
          </label>
          <label>
            {requiredLabel("Status")}
            <select required value={assetStatus} onChange={e => setAssetStatus(e.target.value)}>
              <option value="OPERATIONAL">OPERATIONAL</option>
              <option value="UNDER_MAINTENANCE">UNDER_MAINTENANCE</option>
              <option value="FAULTY">FAULTY</option>
              <option value="OBSOLETE">OBSOLETE</option>
            </select>
          </label>
          <label>
            Remarks
            <textarea placeholder="Operational notes..." value={assetRemarks} onChange={e => setAssetRemarks(e.target.value)} />
          </label>

          <div style={{ margin: "15px 0 10px 0" }}>
            <strong style={{ display: "block", marginBottom: 8 }}>Specifications Parameters:</strong>
            <div style={{ display: "grid", gap: 10 }}>
              {assetSpecFields.map((field, idx) => (
                <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
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
            <select value={stationDivision} onChange={e => setStationDivision(e.target.value)}>
              {uniqueDivisions.length > 0
                ? uniqueDivisions.map((d: string) => <option key={d} value={d}>{d}</option>)
                : ["Raipur", "Bilaspur", "Nagpur"].map((d: string) => <option key={d} value={d}>{d}</option>)
              }
            </select>
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
            <select value={stationState} onChange={e => setStationState(e.target.value)}>
              {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
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
          <label>
            Division
            <select value={stationDivision} onChange={e => setStationDivision(e.target.value)}>
              {uniqueDivisions.length > 0
                ? uniqueDivisions.map((d: string) => <option key={d} value={d}>{d}</option>)
                : ["Raipur", "Bilaspur", "Nagpur"].map((d: string) => <option key={d} value={d}>{d}</option>)
              }
            </select>
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
            <select value={stationState} onChange={e => setStationState(e.target.value)}>
              {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
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
          <button type="submit" className="export-button">Save Changes</button>
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
          <label>
            {requiredLabel("Telecom Asset")}
            <select required value={assetCategory} onChange={e => handleCategoryChange(e.target.value)}>
              {telecomAssetOptions.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label>
            {requiredLabel("Station Code")} (Read-Only)
            <input readOnly value={assetStation} />
          </label>
          <label>
            {requiredLabel("Mode")}
            <select required value={assetMode} onChange={e => {
              setAssetMode(e.target.value);
              if (e.target.value === ASSET_MODE_STANDALONE) setAssetEquipmentName("");
            }}>
              <option value={ASSET_MODE_STANDALONE}>Standalone</option>
              <option value={ASSET_MODE_HAS_EQUIPMENT}>Has Equipment</option>
            </select>
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
            <input required type="date" value={assetDop} onChange={e => setAssetDop(e.target.value)} />
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
            <select required value={assetMaintenanceValidity} onChange={e => {
              setAssetMaintenanceValidity(e.target.value);
              if (e.target.value === MAINTENANCE_NOT_AVAILABLE) {
                setAssetMaintenanceFrom("");
                setAssetMaintenanceTo("");
              }
            }}>
              {MAINTENANCE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          {needsMaintenanceDates && (
            <>
              <label>
                {requiredLabel("Maintenance From")}
                <input required type="date" value={assetMaintenanceFrom} onChange={e => setAssetMaintenanceFrom(e.target.value)} />
              </label>
              <label>
                {requiredLabel("Maintenance To")}
                <input required type="date" value={assetMaintenanceTo} onChange={e => setAssetMaintenanceTo(e.target.value)} />
              </label>
            </>
          )}
          <label>
            {requiredLabel("Location")}
            <input required placeholder="e.g. Platform 1 Server Room" value={assetLocation} onChange={e => setAssetLocation(e.target.value)} />
          </label>
          <label>
            {requiredLabel("Status")}
            <select required value={assetStatus} onChange={e => setAssetStatus(e.target.value)}>
              <option value="OPERATIONAL">OPERATIONAL</option>
              <option value="UNDER_MAINTENANCE">UNDER_MAINTENANCE</option>
              <option value="FAULTY">FAULTY</option>
              <option value="OBSOLETE">OBSOLETE</option>
            </select>
          </label>
          <label>
            Remarks
            <textarea placeholder="Operational notes..." value={assetRemarks} onChange={e => setAssetRemarks(e.target.value)} />
          </label>

          <div style={{ margin: "15px 0 10px 0" }}>
            <strong style={{ display: "block", marginBottom: 8 }}>Specifications Parameters:</strong>
            <div style={{ display: "grid", gap: 10 }}>
              {assetSpecFields.map((field, idx) => (
                <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
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

          <button type="submit" className="export-button">Save Changes</button>
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
            <select value={gateCategory} onChange={e => setGateCategory(e.target.value)}>
              <option value="Interlocked">Interlocked</option>
              <option value="Manned Non-Interlocked">Manned Non-Interlocked</option>
              <option value="Special / Other Gates">Special / Other Gates</option>
            </select>
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
            <select value={gateStation} onChange={e => setGateStation(e.target.value)}>
              <option value="">No Linking Station</option>
              {stations.map((s: any) => <option key={s.id} value={s.code}>{s.name} ({s.code})</option>)}
            </select>
          </label>
          <button type="submit" className="export-button">Register LC Gate</button>
        </form>
      );
    }

    if (title.startsWith("Edit LC Gate")) {
      return (
        <form onSubmit={handleSubmit} className="form-drawer">
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
            <select value={gateCategory} onChange={e => setGateCategory(e.target.value)}>
              <option value="Interlocked">Interlocked</option>
              <option value="Manned Non-Interlocked">Manned Non-Interlocked</option>
              <option value="Special / Other Gates">Special / Other Gates</option>
            </select>
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
          <button type="submit" className="export-button">Save Changes</button>
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
            <input readOnly value={userObj.name} />
          </label>
          <label>
            Username
            <input readOnly value={userObj.username} />
          </label>
          <label>
            System Role
            <select value={newRole} onChange={e => setNewRole(e.target.value)}>
              {currentRole === "SUPER_ADMIN" ? (
                <>
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  <option value="DIVISIONAL_ADMIN">DIVISIONAL_ADMIN</option>
                  <option value="SSE">SSE</option>
                  <option value="TECHNICIAN">TECHNICIAN</option>
                  <option value="TESTROOM">TESTROOM</option>
                </>
              ) : (
                <>
                  <option value="SSE">SSE</option>
                  <option value="TECHNICIAN">TECHNICIAN</option>
                  <option value="TESTROOM">TESTROOM</option>
                </>
              )}
            </select>
          </label>
          {newRole !== "SUPER_ADMIN" && newRole !== "DIVISIONAL_ADMIN" && (
            <label>
              Designation
              <input placeholder="e.g. Sr. DSTE/Raipur" value={newDesignation} onChange={e => setNewDesignation(e.target.value)} />
            </label>
          )}
          {currentRole === "SUPER_ADMIN" && newRole !== "SUPER_ADMIN" && (
            <label>
              Division
              <select value={stationDivision} onChange={e => setStationDivision(e.target.value)}>
                {uniqueDivisions.length > 0
                  ? uniqueDivisions.map((d: string) => <option key={d} value={d}>{d}</option>)
                  : ["Raipur", "Bilaspur", "Nagpur"].map((d: string) => <option key={d} value={d}>{d}</option>)
                }
              </select>
            </label>
          )}
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
          background: radial-gradient(circle at 10% 20%, #e8f0fe 0%, #cce0ff 90%);
          padding: 20px;
        }
        .auth-box {
          width: 100%;
          max-width: 440px;
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.5);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
          border-radius: 12px;
          padding: 30px;
          text-align: center;
        }
        .auth-logo {
          margin: 0 auto 16px;
        }
        .auth-box h2 {
          margin: 0;
          font-size: 22px;
          font-weight: 850;
        }
        .auth-box p {
          color: var(--muted);
          margin: 4px 0 20px;
          font-size: 14px;
        }
        .auth-box form {
          display: grid;
          gap: 14px;
          text-align: left;
        }
        .auth-box label {
          display: grid;
          gap: 4px;
          font-weight: 700;
          font-size: 13px;
        }
        .auth-box input, .auth-box select {
          width: 100%;
          height: 42px;
          padding: 0 12px;
          border: 1px solid var(--line);
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.8);
          outline: 0;
        }
        .auth-box button[type="submit"] {
          height: 44px;
          background: var(--blue);
          color: #fff;
          border: 0;
          border-radius: 6px;
          font-weight: 700;
          margin-top: 8px;
          box-shadow: 0 4px 12px rgba(11, 109, 255, 0.2);
        }
        .auth-toggle {
          margin-top: 18px;
        }
        .auth-toggle button {
          background: transparent;
          border: 0;
          color: var(--blue);
          font-weight: 750;
          font-size: 13px;
        }
        .auth-error {
          background: #ffebe9;
          border: 1px solid rgba(255, 51, 40, 0.2);
          color: var(--red);
          padding: 10px;
          border-radius: 6px;
          font-size: 13px;
          margin-bottom: 16px;
          text-align: left;
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
        <h2>SECR Telecom Admin</h2>
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
                <select value={roleInput} onChange={e => setRoleInput(e.target.value as UserRole)}>
                  <option value="SUPER_ADMIN">Super Admin</option>
                  <option value="DIVISIONAL_ADMIN">Divisional Admin</option>
                  <option value="SSE">SSE (Senior Section Engineer)</option>
                  <option value="TECHNICIAN">Technician</option>
                  <option value="TESTROOM">Testroom</option>
                </select>
              </label>
              {(roleInput as string) !== "SUPER_ADMIN" && (
                <label>
                  Division
                  <select value={divisionInput} onChange={e => setDivisionInput(e.target.value)}>
                    {["Raipur", "Bilaspur", "Nagpur"].map((d: string) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </label>
              )}
            </>
          )}
          <label>
            Username
            <input required value={username} onChange={e => setUsername(e.target.value)} placeholder="admin" />
          </label>
          <label>
            Password
            <input required type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? "Please wait..." : isRegister ? "Register & Login" : "Sign In"}
          </button>
        </form>
        
        <div className="auth-toggle">
          <button onClick={() => { setIsRegister(!isRegister); setErrorMsg(""); }} type="button">
            {isRegister ? "Already have an account? Sign In" : "Need to register? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Toast({ message }: { message: string }) {
  if (!message) return null;
  return <div className="toast" style={{ position: "fixed", bottom: 20, right: 20, background: "#333", color: "#fff", padding: "12px 20px", borderRadius: 8, boxShadow: "0 10px 30px rgba(0,0,0,0.15)", zIndex: 1000, fontWeight: 700, fontSize: 13 }}>{message}</div>;
}

export default App;

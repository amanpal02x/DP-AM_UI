import React, { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, CheckCircle2, Edit, Eye, Plus, Send, Trash2, ChevronDown, X, Paperclip, Filter, Calendar } from "lucide-react";
import { api } from "../../api/apiClient";
import { formatDate24, formatDateTime24, formatTime24, toDateValue, toLocalDateTimeValue, toUTCFromISTString } from "../../utils/dateTime";
import type { UserRole } from "../../types";
import {
  DAILY_POSITION_CATEGORIES,
  DAILY_POSITION_FORMS,
  DailyPositionField,
  DailyPositionFormDefinition,
  RAILNET_DIVISIONAL_FIELDS,
  RAILNET_HQ_FIELDS,
} from "./dailyPositionForms";
import { useAppStore } from "../../App";

type DailyPositionViewProps = {
  role: UserRole;
  division: string;
  user?: any;
  mode?: "form" | "history";
  showToast: (message: string) => void;
};

const formatDateTimeInput = (value?: string | null) => {
  if (!value) return "";
  // Check if value already has timezone/offset info, if not assume IST
  const hasOffset = value.includes("Z") || /\+\d{2}:?\d{2}$/.test(value) || /-\d{2}:?\d{2}$/.test(value);
  const dateStr = hasOffset ? value : `${value}+05:30`;
  const date = new Date(dateStr);
  return Number.isNaN(date.getTime()) ? "" : toLocalDateTimeValue(date);
};

const calcDurationText = (failureTime?: string | null, rectificationTime?: string | null) => {
  if (!failureTime || !rectificationTime) return "";
  const startStr = toUTCFromISTString(failureTime);
  const endStr = toUTCFromISTString(rectificationTime);
  const start = startStr ? new Date(startStr) : null;
  const end = endStr ? new Date(endStr) : null;
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return "";
  const minutes = Math.floor((end.getTime() - start.getTime()) / 60000);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
};

const statusFromForm = (form: DailyPositionFormDefinition, values: Record<string, any>) => {
  if (form.statusMode === "log") {
    if (!values.rectificationTime) return "FAULTY";
    return "All Ok";
  }
  if (form.statusMode === "maintenance") {
    if (values.balanceTemporaryJoints !== undefined) {
      return Number(values.balanceTemporaryJoints) > 0 ? "UNDER_MAINTENANCE" : "All Ok";
    }
    if (values.balanceInsulationFaults !== undefined) {
      return Number(values.balanceInsulationFaults) > 0 ? "UNDER_MAINTENANCE" : "All Ok";
    }
    if (values.balanceWalkieTalkies !== undefined) {
      return Number(values.balanceWalkieTalkies) > 0 ? "UNDER_MAINTENANCE" : "All Ok";
    }
    if (values.pendingRepair !== undefined) {
      return Number(values.pendingRepair) > 0 ? "UNDER_MAINTENANCE" : "All Ok";
    }
    const pending = Number(values.temporaryJointsCount || values.totalInsulationFaults || values.defectiveSets || 0);
    const done = Number(values.rectifiedJoints || values.rectifiedFaults || values.repairedSets || 0);
    return pending > done ? "UNDER_MAINTENANCE" : "All Ok";
  }
  if (values.failureTime && !values.rectificationTime) return "FAULTY";
  if (values.failureTime && values.rectificationTime) return "RECTIFIED";
  if (!values.rectificationTime) return "FAULTY";
  return "All Ok";
};

const isTodayRecord = (record: any) => {
  if (!record?.date) return false;
  return toDateValue(new Date(record.date)) === toDateValue();
};

const assetLabel = (asset: any) => {
  const parts = [
    asset.telecomAsset || asset.category || "Asset",
    asset.equipmentName,
    asset.rdsoSpec || asset.serialNo,
    asset.stationCode,
  ].filter(Boolean);
  return parts.join(" / ");
};

const recordAssetLabel = (record: any, metadata: any) => {
  const asset = (metadata?.assets || []).find((item: any) => item.id === record.assetId);
  return asset ? assetLabel(asset) : (record.telecomAsset || "-");
};

const DIVISION_ALIASES: Record<string, string[]> = {
  bilaspur: ["Bilaspur", "BSP"],
  bsp: ["Bilaspur", "BSP"],
  raipur: ["Raipur", "R"],
  r: ["Raipur", "R"],
  nagpur: ["Nagpur", "NGP"],
  ngp: ["Nagpur", "NGP"],
};

const divisionAliases = (division?: string) => {
  const raw = String(division || "").trim();
  if (!raw) return [];
  return Array.from(new Set([raw, ...(DIVISION_ALIASES[raw.toLowerCase()] || [])]));
};

const sectionStationCodes = (section?: string) => {
  return Array.from(new Set(String(section || "").toUpperCase().match(/[A-Z]{2,5}/g) || []));
};

const divisionOptionLabel = (division: string) => {
  const aliases = divisionAliases(division);
  const longName = aliases.find(item => item.length > 3) || division;
  const code = aliases.find(item => item.length <= 3 && item !== longName);
  return code ? `${longName} (${code})` : division;
};

const humanizeFieldName = (key: string, formType?: string) => {
  const labels: Record<string, string> = {
    actionType: "Action",
    checkedAt: "Checked At",
    icmsEntryNo: formType === "CFTM Conference"
      ? "Failure Reg. Entry No."
      : (formType === "Video Conferencing with Divisions" ? "Docket No." : "ICMS Entry No./Docket No."),
    stationCode: "Station",
    assetId: "Linked Asset",
    majorSection: "Major Section",
    failureTime: "Failure Time",
    rectificationTime: "Rectification Time",
    durationText: "Duration of Failure",
    remarks: "Failures details",
  };
  if (labels[key]) return labels[key];
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, char => char.toUpperCase())
    .trim();
};

const displayValue = (value: any, isAllOk = false) => {
  if (value === undefined || value === null || value === "") return isAllOk ? "" : "-";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : formatDateTime24(date);
  }
  return String(value);
};

function SearchableStationDropdown({
  stations,
  value,
  onChange,
  placeholder,
  required,
  readOnly,
}: {
  stations: any[];
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  required?: boolean;
  readOnly?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const toggleDropdown = () => {
    if (readOnly) return;
    if (!isOpen) {
      setSearchTerm("");
    }
    setIsOpen(!isOpen);
  };

  const sortedStations = useMemo(() => {
    const list = [...stations];
    list.sort((a, b) => {
      const nameA = a.name || "";
      const nameB = b.name || "";
      return nameA.localeCompare(nameB, undefined, { sensitivity: "base", numeric: true });
    });
    return list;
  }, [stations]);

  const selectedStation = value === "Others" ? { code: "Others", name: "Others" } : sortedStations.find((s) => s.code === value);

  const filteredStations = sortedStations.filter((station: any) => {
    const term = searchTerm.toLowerCase();
    return (
      (station.name || "").toLowerCase().includes(term) ||
      (station.code || "").toLowerCase().includes(term)
    );
  });

  if (!filteredStations.some(s => s.code === "Others")) {
    filteredStations.push({ code: "Others", name: "Others" });
  }

  return (
    <div className="multi-dropdown" ref={dropdownRef} style={{ position: "relative" }}>
      <button
        type="button"
        className="multi-dropdown-trigger"
        disabled={readOnly}
        onClick={toggleDropdown}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          minHeight: "42px",
          padding: "10px 14px",
          border: "1px solid #cbd5e1",
          borderRadius: "8px",
          background: readOnly ? "#f8fafc" : "#ffffff",
          color: readOnly ? "#64748b" : "#1e293b",
          fontSize: "14px",
          textAlign: "left",
          cursor: readOnly ? "not-allowed" : "pointer"
        }}
      >
        <span style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          marginRight: value && !readOnly ? "24px" : "0px",
          color: value ? (readOnly ? "#64748b" : "#1e293b") : "#94a3b8"
        }}>
          {selectedStation ? (selectedStation.code === "Others" ? "Others" : `${selectedStation.name} (${selectedStation.code})`) : placeholder}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {value && !readOnly && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              style={{
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
              <X size={14} />
            </span>
          )}
          <ChevronDown size={16} style={{ color: "#64748b" }} />
        </div>
      </button>

      {/* Hidden select for HTML5 native validation */}
      <select
        required={required}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        tabIndex={-1}
        style={{
          position: "absolute",
          opacity: 0,
          pointerEvents: "none",
          width: "100%",
          bottom: 0,
          left: 0,
          height: 1
        }}
      >
        <option value="">{placeholder}</option>
        {sortedStations.map((s: any) => (
          <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
        ))}
        <option value="Others">Others</option>
      </select>

      {isOpen && !readOnly && (
        <div
          className="multi-dropdown-menu"
          style={{
            position: "absolute",
            zIndex: 100,
            top: "100%",
            left: 0,
            right: 0,
            marginTop: "4px",
            maxHeight: "280px",
            display: "flex",
            flexDirection: "column",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            background: "#ffffff",
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
            padding: "6px"
          }}
        >
          {/* Search Input Box */}
          <div style={{ padding: "4px 4px 8px 4px" }}>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search station..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                minHeight: "36px",
                padding: "8px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontSize: "13px",
                outline: "none"
              }}
              onClick={(e) => e.stopPropagation()} // Prevent closing dropdown when clicking input
            />
          </div>

          {/* Scrollable list */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {filteredStations.map((station: any) => {
              const isSelected = station.code === value;
              return (
                <div
                  key={station.code}
                  style={{
                    padding: "8px 10px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: isSelected ? 600 : 500,
                    color: isSelected ? "var(--blue)" : "#1e293b",
                    background: isSelected ? "var(--blue-soft)" : "transparent",
                    margin: "2px 0",
                    transition: "background 0.15s, color 0.15s"
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "#f1f5f9";
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                  onClick={() => {
                    onChange(station.code);
                    setIsOpen(false);
                  }}
                >
                  {station.code === "Others" ? "Others" : `${station.name} (${station.code})`}
                </div>
              );
            })}
            {filteredStations.length === 0 && (
              <div style={{ padding: "12px", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
                No stations found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ClearableSelect({
  value,
  onChange,
  children,
  style,
  disabled
}: {
  value: string;
  onChange: (val: string) => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
  disabled?: boolean;
}) {
  return (
    <div className="clearable-select-wrapper" style={{ position: "relative", width: "100%", display: "inline-block" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{
          ...style,
          width: "100%",
          paddingRight: value && !disabled ? "36px" : style?.paddingRight,
        }}
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
            right: "26px",
            top: "50%",
            transform: "translateY(-50%)",
            cursor: "pointer",
            color: "#94a3b8",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "4px",
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
          <X size={12} />
        </span>
      )}
    </div>
  );
}

function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder,
  required,
  readOnly,
  clearable = true,
  searchable = true,
}: {
  options: Array<string | { value: string; label: string }>;
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  required?: boolean;
  readOnly?: boolean;
  clearable?: boolean;
  searchable?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const toggleDropdown = () => {
    if (readOnly) return;
    if (!isOpen) {
      setSearchTerm("");
    }
    setIsOpen(!isOpen);
  };

  const sortedOptions = useMemo(() => {
    const mapped = options.map(item => {
      if (typeof item === "string") {
        return { value: item, label: item };
      }
      return item;
    });

    mapped.sort((a, b) => {
      const isOtherA = a.label.toLowerCase() === "other" || a.label.toLowerCase() === "others" || a.value.toLowerCase() === "others" || a.value.toLowerCase() === "other";
      const isOtherB = b.label.toLowerCase() === "other" || b.label.toLowerCase() === "others" || b.value.toLowerCase() === "others" || b.value.toLowerCase() === "other";

      if (isOtherA && !isOtherB) return 1;
      if (!isOtherA && isOtherB) return -1;

      return a.label.localeCompare(b.label, undefined, { sensitivity: "base", numeric: true });
    });

    return mapped;
  }, [options]);

  const selectedOpt = sortedOptions.find(opt => opt.value === value);

  const filteredOptions = sortedOptions.filter(opt =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    opt.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="multi-dropdown" ref={dropdownRef} style={{ position: "relative" }}>
      <button
        type="button"
        className="multi-dropdown-trigger"
        disabled={readOnly}
        onClick={toggleDropdown}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          minHeight: "42px",
          padding: "10px 14px",
          border: "1px solid #cbd5e1",
          borderRadius: "8px",
          background: readOnly ? "#f8fafc" : "#ffffff",
          color: readOnly ? "#64748b" : "#1e293b",
          fontSize: "14px",
          textAlign: "left",
          cursor: readOnly ? "not-allowed" : "pointer"
        }}
      >
        <span style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          marginRight: value && !readOnly && clearable ? "24px" : "0px",
          color: value ? (readOnly ? "#64748b" : "#1e293b") : "#94a3b8"
        }}>
          {selectedOpt ? selectedOpt.label : placeholder}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {value && !readOnly && clearable && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              style={{
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
              <X size={14} />
            </span>
          )}
          <ChevronDown size={16} style={{ color: "#64748b" }} />
        </div>
      </button>

      {/* Hidden select for HTML5 native validation */}
      <select
        required={required}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        tabIndex={-1}
        style={{
          position: "absolute",
          opacity: 0,
          pointerEvents: "none",
          width: "100%",
          bottom: 0,
          left: 0,
          height: 1
        }}
      >
        <option value="">{placeholder}</option>
        {sortedOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      {isOpen && !readOnly && (
        <div
          className="multi-dropdown-menu"
          style={{
            position: "absolute",
            zIndex: 100,
            top: "100%",
            left: 0,
            right: 0,
            marginTop: "4px",
            maxHeight: "280px",
            display: "flex",
            flexDirection: "column",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            background: "#ffffff",
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
            padding: "6px"
          }}
        >
          {/* Search Input Box */}
          {searchable && (
            <div style={{ padding: "4px 4px 8px 4px" }}>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  minHeight: "36px",
                  padding: "8px 12px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  fontSize: "13px",
                  outline: "none"
                }}
                onClick={(e) => e.stopPropagation()} // Prevent closing dropdown when clicking input
              />
            </div>
          )}

          {/* Scrollable list */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {filteredOptions.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <div
                  key={opt.value}
                  style={{
                    padding: "8px 10px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: isSelected ? 600 : 500,
                    color: isSelected ? "var(--blue)" : "#1e293b",
                    background: isSelected ? "var(--blue-soft)" : "transparent",
                    margin: "2px 0",
                    transition: "background 0.15s, color 0.15s"
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "#f1f5f9";
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                >
                  {opt.label}
                </div>
              );
            })}
            {filteredOptions.length === 0 && (
              <div style={{ padding: "12px", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function WalkieTalkieSerialSelect({
  field,
  value,
  setValue,
  values,
  readOnly,
}: {
  field: DailyPositionField;
  value: any;
  setValue: (name: string, val: any) => void;
  values: Record<string, any>;
  readOnly: boolean;
}) {
  const faultsQuery = useQuery({
    queryKey: ["daily-position-active-faults"],
    queryFn: () => api.dailyPosition.list({ limit: 500, isFaulty: "true" }).then((res: any) => res.data || []),
    staleTime: 5000,
  });

  const activeFaults = faultsQuery.data || [];
  const selectedLobby = values.stationCode || "";

  // Get active faulty serial numbers for the selected lobby/stationCode
  const serials = activeFaults
    .filter((r: any) => 
      r.formType === "Walkie-Talkie Testing" && 
      (r.stationCode || "").toLowerCase().trim() === selectedLobby.toLowerCase().trim() &&
      r.formData?.serialNo
    )
    .map((r: any) => r.formData.serialNo);

  // De-duplicate serial numbers
  const uniqueSerials = Array.from(new Set(serials));

  const isLoading = faultsQuery.isLoading;

  return (
    <div className="dp-field">
      <label>
        {field.label}
        {field.required && <span>*</span>}
      </label>
      <select
        value={value || ""}
        onChange={e => setValue(field.name, e.target.value)}
        disabled={readOnly || isLoading || !selectedLobby}
        required={field.required}
        style={{
          width: "100%",
          padding: "10px 14px",
          borderRadius: "8px",
          border: "1px solid #cbd5e1",
          fontSize: "14px",
          background: readOnly || !selectedLobby ? "#f8fafc" : "#fff",
          color: value ? "#1e293b" : "#94a3b8",
          cursor: readOnly || !selectedLobby ? "not-allowed" : "pointer",
        }}
      >
        <option value="" disabled>
          {!selectedLobby 
            ? "Please select Station / Lobby first" 
            : isLoading 
              ? "Loading serial numbers..." 
              : uniqueSerials.length === 0 
                ? "No faulty serial numbers found" 
                : (field.placeholder || "Select Serial Number")}
        </option>
        {uniqueSerials.map((s: any) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    </div>
  );
}

function WalkieTalkieLobbySelect({
  field,
  value,
  setValue,
  readOnly,
}: {
  field: DailyPositionField;
  value: any;
  setValue: (name: string, val: any) => void;
  readOnly: boolean;
}) {
  const lobbiesQuery = useQuery({
    queryKey: ["walkie-talkie-lobbies-select"],
    queryFn: () => api.walkieTalkie.listLobbies().then((res: any) => res.data || []),
    staleTime: 5000,
  });

  const faultsQuery = useQuery({
    queryKey: ["daily-position-active-faults"],
    queryFn: () => api.dailyPosition.list({ limit: 500, isFaulty: "true" }).then((res: any) => res.data || []),
    staleTime: 5000,
  });

  const lobbies = lobbiesQuery.data || [];
  const activeFaults = faultsQuery.data || [];
  const isLoadingLobbies = lobbiesQuery.isLoading || faultsQuery.isLoading;

  const getFaultCount = (lobbyName: string) => {
    return activeFaults.filter((r: any) => 
      r.formType === "Walkie-Talkie Testing" && 
      (r.stationCode || "").toLowerCase().trim() === lobbyName.toLowerCase().trim()
    ).length;
  };

  const handleChange = (lobbyName: string) => {
    setValue(field.name, lobbyName);
    const lobby = lobbies.find((l: any) => l.lobbyName === lobbyName);
    if (lobby) {
      if (field.name === "stationLobby") {
        setValue("toBeTestedCount", lobby.totalWalkieTalkies);
        setValue("testedCount", lobby.testedCount);
      } else if (field.name === "stationCode") {
        setValue("openingDefective", getFaultCount(lobbyName));
      }
    }
  };

  // Sync effect when lobbies or faults data changes
  useEffect(() => {
    if (value && lobbies.length > 0) {
      const lobby = lobbies.find((l: any) => l.lobbyName === value);
      if (lobby) {
        if (field.name === "stationLobby") {
          setValue("toBeTestedCount", lobby.totalWalkieTalkies);
          setValue("testedCount", lobby.testedCount);
        } else if (field.name === "stationCode") {
          setValue("openingDefective", getFaultCount(value));
        }
      }
    }
  }, [lobbies, activeFaults, value, field.name, setValue]);

  return (
    <div className="dp-field">
      <label>
        {field.label}
        {field.required && <span>*</span>}
      </label>
      <select
        value={value || ""}
        onChange={e => handleChange(e.target.value)}
        disabled={readOnly || isLoadingLobbies}
        required={field.required}
        style={{
          width: "100%",
          padding: "10px 14px",
          borderRadius: "8px",
          border: "1px solid #cbd5e1",
          fontSize: "14px",
          background: readOnly ? "#f8fafc" : "#fff",
          color: value ? "#1e293b" : "#94a3b8",
          cursor: readOnly ? "not-allowed" : "pointer",
        }}
      >
        <option value="" disabled>
          {isLoadingLobbies ? "Loading lobbies..." : (field.placeholder || "Select Station / Lobby")}
        </option>
        {lobbies.map((l: any) => {
          const faultCount = getFaultCount(l.lobbyName);
          const displayText = field.name === "stationCode"
            ? `${l.lobbyName} (${faultCount} fault${faultCount !== 1 ? "s" : ""})`
            : `${l.lobbyName} (${l.totalWalkieTalkies} sets)`;
          return (
            <option key={l.id} value={l.lobbyName}>
              {displayText}
            </option>
          );
        })}
      </select>
    </div>
  );
}
function DailyPositionFieldInput({

  field,
  value,
  values,
  setValue,
  metadata,
  selectedDivision,
  readOnly,
  formName,
}: {
  field: DailyPositionField;
  value: any;
  values: Record<string, any>;
  setValue: (name: string, value: any) => void;
  metadata: any;
  selectedDivision: string;
  readOnly: boolean;
  formName: string;
}) {
  const majorSections = metadata?.majorSections || [];
  const selectedMajor = majorSections.find((section: any) => section.name === values.majorSection);

  const sections = selectedMajor?.sections || [];
  const selectedDivisionAliases = divisionAliases(selectedDivision);
  const selectedSectionCodes = sectionStationCodes(values.section);
  const stations = (metadata?.stations || []).filter((station: any) => {
    const matchesDivision = !selectedDivisionAliases.length || selectedDivisionAliases.includes(station.division);
    const matchesSection = !selectedSectionCodes.length || selectedSectionCodes.includes(String(station.code || "").toUpperCase());
    return matchesDivision && matchesSection;
  });
  const assets = (metadata?.assets || []).filter((asset: any) => {
    const matchesStation = !values.stationCode || asset.stationCode === values.stationCode;
    const matchesSection = !values.stationCode && selectedSectionCodes.length
      ? selectedSectionCodes.includes(String(asset.stationCode || "").toUpperCase())
      : true;
    return matchesStation && matchesSection;
  });

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  // FOIS two-level dropdown state
  const [foisCategory, setFoisCategory] = useState<string>("");
  const [foisSubOpen, setFoisSubOpen] = useState(false);
  const [foisSubSearch, setFoisSubSearch] = useState("");
  const foisSubRef = useRef<HTMLDivElement>(null);
  const foisSubSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
      if (foisSubRef.current && !foisSubRef.current.contains(event.target as Node)) {
        setFoisSubOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (field.name === "stationCode") {
      if (formName === "CFTM Conference") {
        if (selectedDivision === "Nagpur" && value !== "NGP Div") {
          setValue("stationCode", "NGP Div");
        } else if (selectedDivision === "Raipur" && value !== "R Div") {
          setValue("stationCode", "R Div");
        }
      } else if (formName === "Hotline") {
        if (selectedDivision === "Nagpur" && value !== "(War Room) DM/HQ to NGP Comm. CNL") {
          setValue("stationCode", "(War Room) DM/HQ to NGP Comm. CNL");
        } else if (selectedDivision === "Raipur" && value !== "(War Room) DM/HQ to R Comm. CNL") {
          setValue("stationCode", "(War Room) DM/HQ to R Comm. CNL");
        } else if (selectedDivision === "Bilaspur") {
          // For Bilaspur, clear any pre-filled single values from Nagpur/Raipur
          const hotlineFixedValues = ["(War Room) DM/HQ to NGP Comm. CNL", "(War Room) DM/HQ to R Comm. CNL"];
          if (hotlineFixedValues.includes(value)) {
            setValue("stationCode", "");
          }
        }
      }
    }
  }, [formName, selectedDivision, field.name, value, setValue]);

  if (field.name === "nameOfFault") {
    const FAULT_OPTIONS = [
      "MDF Card Fault",
      "Power Issue",
      "SIP Down",
      "VoIP Trunk Down"
    ];

    const parts = (value || "").split(/,\s*/).map((p: string) => {
      if (p.startsWith("Other:")) return p;
      return p.trim();
    }).filter(Boolean);
    const selectedOptions = FAULT_OPTIONS.filter(opt => parts.includes(opt));
    const hasOther = parts.some((p: string) => p === "Other" || p.startsWith("Other:"));
    const otherPart = parts.find((p: string) => p.startsWith("Other:"));
    const otherText = otherPart ? otherPart.substring("Other:".length).replace(/^\s/, "") : "";

    const toggleOption = (opt: string) => {
      if (readOnly) return;
      let nextParts: string[];
      if (parts.includes(opt)) {
        nextParts = parts.filter((p: string) => p !== opt);
      } else {
        nextParts = [...parts.filter((p: string) => FAULT_OPTIONS.includes(p) || p === "Other" || p.startsWith("Other:")), opt];
        nextParts.sort((a, b) => {
          const idxA = FAULT_OPTIONS.indexOf(a);
          const idxB = FAULT_OPTIONS.indexOf(b);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return 0;
        });
      }
      setValue(field.name, nextParts.join(", "));
    };

    const toggleOther = () => {
      if (readOnly) return;
      let nextParts: string[];
      if (hasOther) {
        nextParts = parts.filter((p: string) => p !== "Other" && !p.startsWith("Other:"));
      } else {
        const otherVal = otherText ? `Other: ${otherText}` : "Other";
        nextParts = [...parts, otherVal];
      }
      setValue(field.name, nextParts.join(", "));
      setIsOpen(false);
    };

    const handleOtherTextChange = (text: string) => {
      if (readOnly) return;
      const filteredParts = parts.filter((p: string) => p !== "Other" && !p.startsWith("Other:"));
      const otherVal = text ? `Other: ${text}` : "Other";
      const nextParts = [...filteredParts, otherVal];
      setValue(field.name, nextParts.join(", "));
    };

    const displaySelected = () => {
      const displayParts = [...selectedOptions];
      if (hasOther) {
        displayParts.push("Other");
      }
      return displayParts.join(", ") || "Select Name of Fault";
    };

    const filteredFaultOptions = FAULT_OPTIONS.filter(opt =>
      opt.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const showOther = "other".includes(searchTerm.toLowerCase());

    const toggleDropdown = () => {
      if (readOnly) return;
      if (!isOpen) {
        setSearchTerm("");
      }
      setIsOpen(!isOpen);
    };

    return (
      <div className={`dp-field ${field.fullWidth ? "full" : ""}`} ref={dropdownRef} style={{ position: "relative" }}>
        <label>{field.label}{field.required && <span>*</span>}</label>
        <div className="multi-dropdown" style={{ position: "relative" }}>
          <button
            type="button"
            className="multi-dropdown-trigger"
            disabled={readOnly}
            onClick={toggleDropdown}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              minHeight: "42px",
              padding: "10px 14px",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              background: readOnly ? "#f8fafc" : "#ffffff",
              color: readOnly ? "#64748b" : "#1e293b",
              fontSize: "14px",
              textAlign: "left",
              cursor: readOnly ? "not-allowed" : "pointer"
            }}
          >
            <span style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              color: (selectedOptions.length || hasOther) ? (readOnly ? "#64748b" : "#1e293b") : "#94a3b8"
            }}>
              {displaySelected()}
            </span>
            <ChevronDown size={16} style={{ color: "#64748b", marginLeft: "8px" }} />
          </button>

          {isOpen && !readOnly && (
            <div
              className="multi-dropdown-menu"
              style={{
                position: "absolute",
                zIndex: 100,
                top: "100%",
                left: 0,
                right: 0,
                marginTop: "4px",
                maxHeight: "300px",
                display: "flex",
                flexDirection: "column",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                background: "#ffffff",
                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
                padding: "6px"
              }}
            >
              {/* Search input for multi-select */}
              <div style={{ padding: "4px 4px 8px 4px" }}>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search fault..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: "100%",
                    minHeight: "36px",
                    padding: "8px 12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    fontSize: "13px",
                    outline: "none"
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              {/* Scrollable list */}
              <div style={{ overflowY: "auto", flex: 1 }}>
                {filteredFaultOptions.map(opt => {
                  const checked = selectedOptions.includes(opt);
                  return (
                    <div
                      key={opt}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: 500,
                        color: "#1e293b",
                        margin: 0,
                        transition: "background 0.15s"
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleOption(opt);
                      }}
                    >
                      <input
                        type="checkbox"
                        className="dp-checkbox"
                        checked={checked}
                        disabled={readOnly}
                        onChange={() => {}}
                      />
                      <span>{opt}</span>
                    </div>
                  );
                })}

                {showOther && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "#1e293b",
                      margin: 0,
                      transition: "background 0.15s",
                      borderTop: "1px solid #f1f5f9"
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleOther();
                    }}
                  >
                    <input
                      type="checkbox"
                      className="dp-checkbox"
                      checked={hasOther}
                      disabled={readOnly}
                      onChange={() => {}}
                    />
                    <span>Other</span>
                  </div>
                )}

                {filteredFaultOptions.length === 0 && !showOther && (
                  <div style={{ padding: "12px", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
                    No faults found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {hasOther && (
          <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "12px", color: "#475569", fontWeight: "600" }}>Specify Other Fault:</label>
            <input
              type="text"
              autoFocus
              required={field.required && !readOnly}
              disabled={readOnly}
              value={otherText}
              onChange={e => handleOtherTextChange(e.target.value)}
              placeholder="Type manual fault details..."
              style={{
                width: "100%",
                minHeight: "42px",
                padding: "10px 14px",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                background: readOnly ? "#f8fafc" : "#ffffff",
                color: readOnly ? "#64748b" : "#1e293b",
                fontSize: "14px",
                cursor: readOnly ? "not-allowed" : "text"
              }}
            />
          </div>
        )}
      </div>
    );
  }

  if (field.name === "reason") {
    // Division-specific options for Exchange form
    const EXCHANGE_OPTIONS: Record<string, string[]> = {
      Raipur: [
        "Link Failure", "Phone Failure", "Equipment Failure",
        "R-BSP 2mbps", "R-BSP (RCIL) 2mbps", "R-DURG 2mbps", "R-DURG (RCIL) 2mbps",
        "R-BMY 2mbps", "R-BYT 2mbps", "NGN 1 (RCIL) 2mbps", "NGN 2 (RCIL) 2mbps",
        "Others",
      ],
      Nagpur: [
        "Link Failure", "Phone Failure", "Equipment Failure",
        "Nainpur 2mbps", "NGN 2mbps", "Bilaspur 2mbps", "Raipur 2mbps",
        "Rajnandgaon 2mbps", "Dongargarh 2mbps", "Gondia 2mbps", "Nagbhir 2mbps",
        "Tumsar 2mbps", "Itwari / KAV 2mbps", "Mount Road 2mbps",
        "NIR TS 2mbps", "Chhindwara 2mbps",
        "Others",
      ],
      Bilaspur: [
        "Link Failure", "Phone Failure", "Equipment Failure",
        "APR 2mbps", "SDL 2mbps", "UMR 2mbps", "CPH 2mbps", "BRJN 2mbps",
        "RIG 2mbps", "MDGR 2mbps", "R 2mbps", "NGP 2mbps", "NGN 2mbps",
        "BSPR - UMR 2mbps", "BSPR - SDL 2mbps", "BRJN - RIG 2mbps",
        "R - NGP 2mbps", "MDGR - BJRI 2mbps",
        "Others",
      ],
    };

    const rawOptions = (formName === "Exchange" && EXCHANGE_OPTIONS[selectedDivision])
      ? EXCHANGE_OPTIONS[selectedDivision]
      : (field.options || [
          "Cable Cut",
          "Link Failure",
          "Equipment Failure (STM / MUX)",
          "Mux Card",
          "Power Supply"
        ]);
    const REASON_OPTIONS = rawOptions.filter(opt => opt !== "Other" && opt !== "Others");

    const parts = (value || "").split(/,\s*/).map((p: string) => {
      if (p.startsWith("Others:")) return p;
      return p.trim();
    }).filter(Boolean);
    const selectedOptions = REASON_OPTIONS.filter(opt => parts.includes(opt));
    const hasOthers = parts.some((p: string) => p === "Others" || p.startsWith("Others:"));
    const othersPart = parts.find((p: string) => p.startsWith("Others:"));
    const othersText = othersPart ? othersPart.substring("Others:".length).replace(/^\s/, "") : "";

    const toggleOption = (opt: string) => {
      if (readOnly) return;
      let nextParts: string[];
      if (parts.includes(opt)) {
        nextParts = parts.filter((p: string) => p !== opt);
      } else {
        nextParts = [...parts.filter((p: string) => REASON_OPTIONS.includes(p) || p === "Others" || p.startsWith("Others:")), opt];
        nextParts.sort((a, b) => {
          const idxA = REASON_OPTIONS.indexOf(a);
          const idxB = REASON_OPTIONS.indexOf(b);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return 0;
        });
      }
      setValue(field.name, nextParts.join(", "));
    };

    const toggleOthers = () => {
      if (readOnly) return;
      let nextParts: string[];
      if (hasOthers) {
        nextParts = parts.filter((p: string) => p !== "Others" && !p.startsWith("Others:"));
      } else {
        const othersVal = othersText ? `Others: ${othersText}` : "Others";
        nextParts = [...parts, othersVal];
      }
      setValue(field.name, nextParts.join(", "));
      setIsOpen(false);
    };

    const handleOthersTextChange = (text: string) => {
      if (readOnly) return;
      const filteredParts = parts.filter((p: string) => p !== "Others" && !p.startsWith("Others:"));
      const othersVal = text ? `Others: ${text}` : "Others";
      const nextParts = [...filteredParts, othersVal];
      setValue(field.name, nextParts.join(", "));
    };

    const displaySelected = () => {
      const displayParts = [...selectedOptions];
      if (hasOthers) {
        displayParts.push("Others");
      }
      return displayParts.join(", ") || "Select Reason of Failure";
    };

    return (
      <div className={`dp-field ${field.fullWidth ? "full" : ""}`} ref={dropdownRef} style={{ position: "relative" }}>
        <label>{field.label}{field.required && <span>*</span>}</label>
        <div className="multi-dropdown" style={{ position: "relative" }}>
          <button
            type="button"
            className="multi-dropdown-trigger"
            disabled={readOnly}
            onClick={() => setIsOpen(!isOpen)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              minHeight: "42px",
              padding: "10px 14px",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              background: readOnly ? "#f8fafc" : "#ffffff",
              color: readOnly ? "#64748b" : "#1e293b",
              fontSize: "14px",
              textAlign: "left",
              cursor: readOnly ? "not-allowed" : "pointer"
            }}
          >
            <span style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              color: (selectedOptions.length || hasOthers) ? (readOnly ? "#64748b" : "#1e293b") : "#94a3b8"
            }}>
              {displaySelected()}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
              {(selectedOptions.length > 0 || hasOthers) && !readOnly && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    setValue(field.name, "");
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#94a3b8",
                    cursor: "pointer",
                    padding: "2px 4px",
                    borderRadius: "4px",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = "#ef4444"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "#94a3b8"; }}
                >
                  <X size={14} />
                </span>
              )}
              <ChevronDown size={16} style={{ color: "#64748b" }} />
            </div>
          </button>

          {isOpen && !readOnly && (
            <div
              className="multi-dropdown-menu"
              style={{
                position: "absolute",
                zIndex: 100,
                top: "100%",
                left: 0,
                right: 0,
                marginTop: "4px",
                maxHeight: "250px",
                overflowY: "auto",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                background: "#ffffff",
                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
                padding: "6px"
              }}
            >
              {REASON_OPTIONS.map(opt => {
                const checked = selectedOptions.includes(opt);
                return (
                  <div
                    key={opt}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "#1e293b",
                      margin: 0,
                      transition: "background 0.15s"
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleOption(opt);
                    }}
                  >
                    <input
                      type="checkbox"
                      className="dp-checkbox"
                      checked={checked}
                      disabled={readOnly}
                      onChange={() => {}}
                    />
                    <span>{opt}</span>
                  </div>
                );
              })}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#1e293b",
                  margin: 0,
                  transition: "background 0.15s",
                  borderTop: "1px solid #f1f5f9"
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleOthers();
                }}
              >
                <input
                  type="checkbox"
                  className="dp-checkbox"
                  checked={hasOthers}
                  disabled={readOnly}
                  onChange={() => {}}
                />
                <span>Others</span>
              </div>
            </div>
          )}
        </div>

        {hasOthers && (
          <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "12px", color: "#475569", fontWeight: "600" }}>Specify Other Reason:</label>
            <input
              type="text"
              autoFocus
              required={field.required && !readOnly}
              disabled={readOnly}
              value={othersText}
              onChange={e => handleOthersTextChange(e.target.value)}
              placeholder="Type manual reason of failure..."
              style={{
                width: "100%",
                minHeight: "42px",
                padding: "10px 14px",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                background: readOnly ? "#f8fafc" : "#ffffff",
                color: readOnly ? "#64748b" : "#1e293b",
                fontSize: "14px",
                cursor: readOnly ? "not-allowed" : "text"
              }}
            />
          </div>
        )}
      </div>
    );
  }

  if (field.name === "majorSection") {
    const options = majorSections.map((item: any) => item.name);
    return (
      <div className="dp-field">
        <label>{field.label}{field.required && <span>*</span>}</label>
        <SearchableDropdown
          options={options}
          value={value}
          onChange={(val) => setValue(field.name, val)}
          placeholder={field.placeholder || "Select Major Section"}
          required={field.required}
          readOnly={readOnly}
        />
      </div>
    );
  }

  if (field.name === "section") {
    const options = sections.map((item: any) => item.name);
    return (
      <div className="dp-field">
        <label>{field.label}{field.required && <span>*</span>}</label>
        <SearchableDropdown
          options={options}
          value={value}
          onChange={(val) => setValue(field.name, val)}
          placeholder={field.placeholder || "Select Section"}
          required={field.required}
          readOnly={readOnly || !values.majorSection}
        />
      </div>
    );
  }

  if (field.name === "stationCode") {
    if (formName === "Walkie-Talkie Repairing") {
      return (
        <WalkieTalkieLobbySelect
          field={field}
          value={value}
          setValue={setValue}
          readOnly={readOnly}
        />
      );
    }

    if (formName === "CFTM Conference") {
      let customOptions: string[] = [];
      if (selectedDivision === "Bilaspur") {
        customOptions = ["BSP HQ", "BSP Div"];
      } else if (selectedDivision === "Nagpur") {
        customOptions = ["NGP Div"];
      } else if (selectedDivision === "Raipur") {
        customOptions = ["R Div"];
      }

      return (
        <div className={`dp-field ${field.fullWidth ? "full" : ""}`}>
          <label>{field.label}{field.required && <span>*</span>}</label>
          <SearchableDropdown
            options={customOptions}
            value={value}
            onChange={(val) => setValue(field.name, val)}
            placeholder={field.placeholder || "Select Location"}
            required={field.required}
            readOnly={readOnly}
            clearable={selectedDivision !== "Nagpur" && selectedDivision !== "Raipur"}
            searchable={selectedDivision !== "Nagpur" && selectedDivision !== "Raipur"}
          />
        </div>
      );
    }

    if (formName === "FOIS") {
      const FOIS_LOCATIONS: Record<string, Record<string, string[]>> = {
        Bilaspur: {
          "FOIS VSAT": [
            "BURHAR COLLIERY",
            "BHATGAON COLLIERY SDG, KARANJI",
            "BIJURI COLLIERY SDG, BJRI",
            "BELPAHAR OPEN CAST MINES- I, II, V",
            "BELPAHAR OPEN CAST MINES-III & IV",
            "DUMAN HILL COLLIREY DTL.",
            "GEVRA PROJECT JUNADIH COLLIERY I & II",
            "GEVRA PROJECT JUNADIH COLLIERY III & IV",
            "JAI NAGAR COLLIERY SDG.",
            "LAFARGE INDIA PVT. LTD.",
            "NEW KUSMUNDA COLLIRY SDG",
            "OLD KUSMUNDA COLLIERY SDG",
            "BHARAT ALUMUNIUM Co. LTD KORBA",
            "RAJ NAGAR COLLIERY",
            "SANJAY GANDHI THERMAL PVT. LTD",
            "DIPIKA SIDING OF SECL-I & REJECTION",
            "HIND ENERGY & COAL BENEFICATION/GTW",
            "PVT SDG OF SIPAT SUPER THERMAL",
            "SURGUJA CORRIDOR, SURAJPUR",
          ],
          "FOIS ROUTER": [
            "ACBPL", "Akaltara", "Ambikapur", "Amlai", "Anuppur",
            "Baikunthpur Road", "Baradwar", "Belpahar", "Bhupdeopur",
            "Bijuri", "Bilaspur", "Bishrampur", "Brajrajnagar", "Champa",
            "Chandia Road", "Chirimiri", "Gatora", "Gevra Road", "Ghutku",
            "Himgir", "Jairamnagar", "Jaithari", "Jamga", "Janjgir-Naila",
            "Kamalpurgram", "Kargi Road", "Karonji", "Katora", "Kharsia",
            "Kirodimalnagar", "Korba", "Kotarlia", "Kothari Road", "Kotma",
            "Lajkura", "Nowrozabad", "Parsa Siding", "Pendra Road", "Raigarh",
            "Robertson", "Rupaund", "Shahdol", "Singhpur", "Surajpur Road",
            "Uslapur",
          ],
        },
        Nagpur: {
          "FOIS VSAT": ["BHANDARA SUNFLAG"],
          "FOIS ROUTER": [
            "Adani Siding", "Amgaon", "Balaghat", "Bargi", "Binaiki",
            "Chacher", "Chanda Fort", "Chhindwara", "Chiraidongri", "Dongargargh",
            "Dongri Buzurg", "Dumri Khurd", "Garha", "Gobarwahi", "Gondia",
            "Itwari", "Jabalpur Lobby", "Kachewani", "Kalamna", "Kanhan",
            "Katangi", "Kelod", "Kelzer", "Khaprikheda", "Koradi", "Murhipar",
            "Nagbhir", "Nagpur", "Nagpur Lobby", "Nainpur", "Ntpc Mouda",
            "Padriganj", "Patangsaongi", "Rajnandgaon", "Ramtek", "Rasmara",
            "Saoner", "Tirodi", "Tumsar Road", "Wadsa",
          ],
        },
        Raipur: {
          "FOIS VSAT": [
            "L&T siding HN",
            "Raipur Infrastructural Handling",
            "Grassim siding HN",
            "Jamul cement works Jamul",
            "Goods Shed Mandhar",
            "NSPCL siding BIA",
          ],
          "FOIS ROUTER": [
            "Baikunth Ph", "Balod", "Belha", "Bhatapara", "Bhilai",
            "Bhilai Marshalling Yard", "Dagori", "Dallirajhara", "Dhadhapara",
            "Durg", "Mandhar", "Mandir Hasuad", "Maroda", "Nipaniya",
            "Raipur", "Silyari", "Tilda",
          ],
        },
      };

      const divisionData = FOIS_LOCATIONS[selectedDivision] || {};
      const categories = Object.keys(divisionData);

      // Parse stored value: "FOIS VSAT - SUBLOCATION" or "FOIS ROUTER - SUBLOCATION"
      const parseFoisValue = (v: string) => {
        for (const cat of ["FOIS VSAT", "FOIS ROUTER"]) {
          if (v && v.startsWith(cat + " - ")) {
            return { cat, sub: v.slice(cat.length + 3) };
          }
        }
        return { cat: "", sub: "" };
      };

      const { cat: storedCat, sub: storedSub } = parseFoisValue(value || "");

      // hoveredCat drives the sub-panel (reuse foisCategory state)
      const hoveredCat = foisCategory;

      const subOptions = hoveredCat && divisionData[hoveredCat] ? divisionData[hoveredCat] : [];
      const filteredSubs = subOptions.filter((opt: string) =>
        opt.toLowerCase().includes(foisSubSearch.toLowerCase())
      );

      // Display label on trigger
      const triggerLabel = storedSub
        ? `${storedCat} › ${storedSub}`
        : "Select Location";

      const openFoisMain = () => {
        if (readOnly) return;
        setIsOpen(prev => !prev);
        setFoisCategory("");
        setFoisSubSearch("");
        setFoisSubOpen(false);
      };

      const handleCatHover = (cat: string) => {
        setFoisCategory(cat);
        setFoisSubSearch("");
      };

      const handleSubSelect = (sub: string) => {
        setValue(field.name, `${hoveredCat} - ${sub}`);
        setIsOpen(false);
        setFoisCategory("");
        setFoisSubSearch("");
        setFoisSubOpen(false);
      };

      return (
        <div className={`dp-field ${field.fullWidth ? "full" : ""}`} ref={dropdownRef} style={{ position: "relative" }}>
          <label>{field.label}{field.required && <span>*</span>}</label>

          {/* Trigger button */}
          <button
            type="button"
            disabled={readOnly}
            onClick={openFoisMain}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              minHeight: "42px",
              padding: "10px 14px",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              background: readOnly ? "#f8fafc" : "#ffffff",
              color: readOnly ? "#64748b" : storedSub ? "#1e293b" : "#94a3b8",
              fontSize: "14px",
              textAlign: "left",
              cursor: readOnly ? "not-allowed" : "pointer",
            }}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {triggerLabel}
            </span>
            <ChevronDown size={16} style={{ color: "#64748b", marginLeft: "8px", flexShrink: 0 }} />
          </button>

          {/* Cascading dropdown */}
          {isOpen && !readOnly && (
            <div style={{
              position: "absolute",
              zIndex: 200,
              top: "100%",
              left: 0,
              marginTop: "4px",
              display: "flex",
              flexDirection: "row",
              border: "1px solid #cbd5e1",
              borderRadius: "10px",
              background: "#ffffff",
              boxShadow: "0 12px 30px rgba(0,0,0,0.13)",
              minWidth: "200px",
              overflow: "visible",
            }}>
              {/* Left panel: categories */}
              <div style={{
                minWidth: "160px",
                padding: "6px",
                borderRight: hoveredCat ? "1px solid #e2e8f0" : "none",
                borderRadius: hoveredCat ? "10px 0 0 10px" : "10px",
              }}>
                {categories.map(cat => (
                  <div
                    key={cat}
                    onMouseEnter={() => handleCatHover(cat)}
                    onClick={() => handleCatHover(cat)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "9px 12px",
                      borderRadius: "7px",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: hoveredCat === cat ? 700 : 500,
                      color: hoveredCat === cat ? "#1d4ed8" : storedCat === cat ? "#1d4ed8" : "#1e293b",
                      background: hoveredCat === cat ? "#eff6ff" : storedCat === cat ? "#f0f9ff" : "transparent",
                      transition: "all 0.12s",
                    }}
                  >
                    <span>{cat}</span>
                    <span style={{ fontSize: "12px", color: "#94a3b8", marginLeft: "8px" }}>›</span>
                  </div>
                ))}
              </div>

              {/* Right panel: sub-locations (shown when a category is hovered) */}
              {hoveredCat && (
                <div style={{
                  minWidth: "260px",
                  maxWidth: "320px",
                  display: "flex",
                  flexDirection: "column",
                  padding: "6px",
                  borderRadius: "0 10px 10px 0",
                }}>
                  {/* Search */}
                  <div style={{ padding: "4px 4px 6px 4px" }}>
                    <input
                      ref={foisSubSearchRef}
                      type="text"
                      autoFocus
                      placeholder={`Search ${hoveredCat}...`}
                      value={foisSubSearch}
                      onChange={e => setFoisSubSearch(e.target.value)}
                      onClick={e => e.stopPropagation()}
                      style={{
                        width: "100%",
                        minHeight: "34px",
                        padding: "7px 11px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        fontSize: "13px",
                        outline: "none",
                        boxSizing: "border-box",
                        background: "#f8fafc",
                      }}
                    />
                  </div>
                  {/* Sub-location list */}
                  <div style={{ overflowY: "auto", maxHeight: "240px", flex: 1 }}>
                    {filteredSubs.length > 0 ? filteredSubs.map((opt: string) => (
                      <div
                        key={opt}
                        onClick={() => handleSubSelect(opt)}
                        style={{
                          padding: "8px 12px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontWeight: 500,
                          color: opt === storedSub && storedCat === hoveredCat ? "#1d4ed8" : "#1e293b",
                          background: opt === storedSub && storedCat === hoveredCat ? "#eff6ff" : "transparent",
                          transition: "background 0.1s",
                        }}
                        onMouseEnter={e => {
                          if (!(opt === storedSub && storedCat === hoveredCat))
                            e.currentTarget.style.background = "#f1f5f9";
                        }}
                        onMouseLeave={e => {
                          if (!(opt === storedSub && storedCat === hoveredCat))
                            e.currentTarget.style.background = "transparent";
                        }}
                      >
                        {opt}
                      </div>
                    )) : (
                      <div style={{ padding: "12px", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
                        No results found
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    if (formName === "Video Conferencing with Divisions") {
      let customOptions: string[] = [];
      if (selectedDivision === "Bilaspur") {
        customOptions = ["5th floor", "3rd floor", "4th floor", "GM Camp Office", "DIV Office BSP"];
      } else if (selectedDivision === "Nagpur") {
        customOptions = ["DIV Office NGP", "STTC NITR"];
      } else if (selectedDivision === "Raipur") {
        customOptions = ["GM Camp Office R", "DIV Office"];
      }

      return (
        <div className={`dp-field ${field.fullWidth ? "full" : ""}`}>
          <label>{field.label}{field.required && <span>*</span>}</label>
          <SearchableDropdown
            options={customOptions}
            value={value}
            onChange={(val) => setValue(field.name, val)}
            placeholder={field.placeholder || "Select Location"}
            required={field.required}
            readOnly={readOnly}
          />
        </div>
      );
    }

    if (formName === "Hotline") {
      // Nagpur and Raipur: single pre-filled, read-only
      if (selectedDivision === "Nagpur" || selectedDivision === "Raipur") {
        const fixedValue = selectedDivision === "Nagpur"
          ? "(War Room) DM/HQ to NGP Comm. CNL"
          : "(War Room) DM/HQ to R Comm. CNL";
        return (
          <div className={`dp-field ${field.fullWidth ? "full" : ""}`}>
            <label>{field.label}{field.required && <span>*</span>}</label>
            <input
              type="text"
              value={fixedValue}
              readOnly
              disabled
              style={{
                width: "100%",
                minHeight: "42px",
                padding: "10px 14px",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                background: "#f8fafc",
                color: "#64748b",
                fontSize: "14px",
                cursor: "not-allowed",
                boxSizing: "border-box"
              }}
            />
          </div>
        );
      }

      // Bilaspur: multi-select checkbox dropdown
      const HOTLINE_BSP_OPTIONS = [
        "DPC to Crew Lobby",
        "(War Room) DM/HQ to RB Dy. Controller",
        "(War Room) DM/HQ to BSP By M/L",
        "(War Room) DM/HQ to DM/DIV (War Room)"
      ];

      const hotlineParts = (value || "").split(/,\s*/).map((p: string) => p.trim()).filter(Boolean);
      const hotlineSelected = HOTLINE_BSP_OPTIONS.filter(opt => hotlineParts.includes(opt));

      const hotlineToggle = (opt: string) => {
        if (readOnly) return;
        let nextParts: string[];
        if (hotlineParts.includes(opt)) {
          nextParts = hotlineParts.filter((p: string) => p !== opt);
        } else {
          nextParts = [...hotlineParts.filter((p: string) => HOTLINE_BSP_OPTIONS.includes(p)), opt];
          nextParts.sort((a, b) => HOTLINE_BSP_OPTIONS.indexOf(a) - HOTLINE_BSP_OPTIONS.indexOf(b));
        }
        setValue(field.name, nextParts.join(", "));
      };

      const hotlineDisplayValue = () => {
        if (hotlineSelected.length === 0) return null;
        return hotlineSelected.join(", ");
      };

      const filteredHotlineOptions = HOTLINE_BSP_OPTIONS.filter(opt =>
        opt.toLowerCase().includes(searchTerm.toLowerCase())
      );

      const toggleHotlineDropdown = () => {
        if (readOnly) return;
        if (!isOpen) setSearchTerm("");
        setIsOpen(!isOpen);
      };

      return (
        <div className={`dp-field ${field.fullWidth ? "full" : ""}`} ref={dropdownRef} style={{ position: "relative" }}>
          <label>{field.label}{field.required && <span>*</span>}</label>
          <div className="multi-dropdown" style={{ position: "relative" }}>
            <button
              type="button"
              className="multi-dropdown-trigger"
              disabled={readOnly}
              onClick={toggleHotlineDropdown}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                minHeight: "42px",
                padding: "10px 14px",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                background: readOnly ? "#f8fafc" : "#ffffff",
                color: readOnly ? "#64748b" : "#1e293b",
                fontSize: "14px",
                textAlign: "left",
                cursor: readOnly ? "not-allowed" : "pointer"
              }}
            >
              <span style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                color: hotlineSelected.length ? (readOnly ? "#64748b" : "#1e293b") : "#94a3b8"
              }}>
                {hotlineDisplayValue() || field.placeholder || "Select Location"}
              </span>
              <ChevronDown size={16} style={{ color: "#64748b", marginLeft: "8px" }} />
            </button>

            {isOpen && !readOnly && (
              <div
                className="multi-dropdown-menu"
                style={{
                  position: "absolute",
                  zIndex: 100,
                  top: "100%",
                  left: 0,
                  right: 0,
                  marginTop: "4px",
                  maxHeight: "300px",
                  display: "flex",
                  flexDirection: "column",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  background: "#ffffff",
                  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
                  padding: "6px"
                }}
              >
                <div style={{ padding: "4px 4px 8px 4px" }}>
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: "100%",
                      minHeight: "36px",
                      padding: "8px 12px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      fontSize: "13px",
                      outline: "none"
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div style={{ overflowY: "auto", flex: 1 }}>
                  {filteredHotlineOptions.map(opt => {
                    const checked = hotlineSelected.includes(opt);
                    return (
                      <div
                        key={opt}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "8px 10px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontWeight: 500,
                          color: "#1e293b",
                          margin: 0,
                          transition: "background 0.15s"
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        onClick={(e) => {
                          e.stopPropagation();
                          hotlineToggle(opt);
                        }}
                      >
                        <input
                          type="checkbox"
                          className="dp-checkbox"
                          checked={checked}
                          disabled={readOnly}
                          onChange={() => {}}
                        />
                        <span>{opt}</span>
                      </div>
                    );
                  })}
                  {filteredHotlineOptions.length === 0 && (
                    <div style={{ padding: "12px", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
                      No locations found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    const hasOthers = value === "Others";
    const othersText = values.stationCodeOther || "";

    return (
      <div className={`dp-field ${field.fullWidth ? "full" : ""}`}>
        <label>{field.label}{field.required && <span>*</span>}</label>
        <SearchableStationDropdown
          stations={stations}
          value={value}
          onChange={(val) => setValue(field.name, val)}
          placeholder={field.placeholder || `Select ${field.label.includes("Station") || field.label.includes("TIB") || field.label.includes("Location") ? "Station" : "Station / Location"}`}
          required={field.required}
          readOnly={readOnly}
        />

        {hasOthers && (
          <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "12px", color: "#475569", fontWeight: "600" }}>Specify Other Station:</label>
            <input
              type="text"
              autoFocus
              required={field.required && !readOnly}
              disabled={readOnly}
              value={othersText}
              onChange={e => setValue("stationCodeOther", e.target.value)}
              placeholder="Type manual station name..."
              style={{
                width: "100%",
                minHeight: "42px",
                padding: "10px 14px",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                background: readOnly ? "#f8fafc" : "#ffffff",
                color: readOnly ? "#64748b" : "#1e293b",
                fontSize: "14px",
                cursor: readOnly ? "not-allowed" : "text"
              }}
            />
          </div>
        )}
      </div>
    );
  }

  if (field.name === "assetId") {
    const options = assets.map((asset: any) => ({ value: asset.id, label: assetLabel(asset) }));
    return (
      <div className="dp-field">
        <label>{field.label}{field.required && <span>*</span>}</label>
        <SearchableDropdown
          options={options}
          value={value}
          onChange={(val) => setValue(field.name, val)}
          placeholder={field.placeholder || "No linked asset"}
          required={field.required}
          readOnly={readOnly}
        />
      </div>
    );
  }

  if (field.name === "attachFile") {
    return (
      <div className="dp-field">
        <label>{field.label}{field.required && <span>*</span>}</label>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            minHeight: "42px",
            padding: "4px",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            background: readOnly ? "#f8fafc" : "#ffffff",
            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
            width: "100%",
            boxSizing: "border-box",
            transition: "border-color 0.15s ease-in-out"
          }}
          onMouseEnter={e => {
            if (!readOnly) e.currentTarget.style.borderColor = "#94a3b8";
          }}
          onMouseLeave={e => {
            if (!readOnly) e.currentTarget.style.borderColor = "#cbd5e1";
          }}
        >
          <input
            type="file"
            id="file-upload"
            disabled={readOnly}
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setValue(field.name, file.name);
              }
            }}
          />
          <label
            htmlFor={readOnly ? undefined : "file-upload"}
            style={{
              cursor: readOnly ? "not-allowed" : "pointer",
              background: "#f0f7ff",
              color: "#1d4ed8",
              border: "1px solid #bfdbfe",
              margin: 0,
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 14px",
              fontSize: "13px",
              fontWeight: 500,
              borderRadius: "6px",
              transition: "all 0.15s ease-in-out"
            }}
            onMouseEnter={e => {
              if (!readOnly) {
                e.currentTarget.style.background = "#dbeafe";
                e.currentTarget.style.borderColor = "#93c5fd";
              }
            }}
            onMouseLeave={e => {
              if (!readOnly) {
                e.currentTarget.style.background = "#f0f7ff";
                e.currentTarget.style.borderColor = "#bfdbfe";
              }
            }}
          >
            <Paperclip size={14} style={{ strokeWidth: 2.2 }} />
            Choose File
          </label>
          <div style={{ width: "1px", height: "22px", backgroundColor: "#e2e8f0", margin: "0 12px" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flex: 1, paddingRight: "8px", minWidth: 0 }}>
            <span
              style={{
                fontSize: "13px",
                color: value ? "#1e293b" : "#94a3b8",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                userSelect: "none"
              }}
            >
              {value || ""}
            </span>
            {value && !readOnly && (
              <button
                type="button"
                onClick={() => {
                  setValue(field.name, "");
                  const inputEl = document.getElementById("file-upload") as HTMLInputElement;
                  if (inputEl) inputEl.value = "";
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "4px",
                  color: "#94a3b8",
                  marginLeft: "8px",
                  transition: "color 0.15s"
                }}
                onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
                onMouseLeave={e => e.currentTarget.style.color = "#94a3b8"}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (field.name === "balanceTemporaryJoints") {
    const total = Number(values.temporaryJointsCount || 0);
    const rectified = Number(values.rectifiedJoints || 0);
    const balance = Math.max(0, total - rectified);
    return (
      <div className="dp-field">
        <label>{field.label}</label>
        <input readOnly value={balance} />
      </div>
    );
  }

  if (field.name === "balanceWalkieTalkies") {
    const total = Number(values.toBeTestedCount || 0);
    const tested = Number(values.testedCount || 0);
    const newlyTested = Number(values.newTestedCount || 0);
    const balance = Math.max(0, total - (tested + newlyTested));
    return (
      <div className="dp-field">
        <label>{field.label}</label>
        <input readOnly value={balance} />
      </div>
    );
  }

  if (field.name === "pendingRepair") {
    const opening = Number(values.openingDefective || 0);
    const received = Number(values.receivedFromUser || 0);
    const returned = Number(values.returnedToUser || 0);
    const condemned = Number(values.setsCondemned || 0);
    const balance = opening + received - returned - condemned;
    return (
      <div className="dp-field">
        <label>{field.label}</label>
        <input readOnly value={balance} />
      </div>
    );
  }

  if (field.name === "netBalanceCaseOnDate") {
    const lastDate = Number(values.caseBalanceLastDate || 0);
    const received = Number(values.caseReceivedOnDate || 0);
    const complied = Number(values.caseCompliedOnDate || 0);
    const balance = lastDate + received - complied;
    return (
      <div className="dp-field">
        <label>{field.label}</label>
        <input readOnly value={balance} />
      </div>
    );
  }


  if (field.name === "durationText") {
    return (
      <div className="dp-field">
        <label>{field.label}</label>
        <input readOnly placeholder={field.placeholder || "XX hrs XX min"} value={calcDurationText(values.failureTime, values.rectificationTime)} />
      </div>
    );
  }


  // Walkie-Talkie lobby dropdown - fetches from API
  if (field.name === "stationLobby" || (formName === "Walkie-Talkie Repairing" && field.name === "stationCode")) {
    return (
      <WalkieTalkieLobbySelect
        field={field}
        value={value}
        setValue={setValue}
        readOnly={readOnly}
      />
    );
  }

  if (field.type === "walkieTalkieSerialSelect") {
    return (
      <WalkieTalkieSerialSelect
        field={field}
        value={value}
        setValue={setValue}
        values={values}
        readOnly={readOnly}
      />
    );
  }

  const commonProps = {
    disabled: readOnly || field.readonly,
    required: field.required,
    value: value || "",
    onChange: (event: any) => setValue(field.name, event.target.value),
    placeholder: field.placeholder,
  };

  const maxProps: Record<string, string> = {};
  if (field.type === "date" && field.name !== "tdc") {
    maxProps.max = toDateValue(new Date());
  } else if (field.type === "datetime-local" && field.name !== "tdc") {
    maxProps.max = toLocalDateTimeValue(new Date());
  } else if (field.type === "number") {
    maxProps.min = "0";
  }


  return (
    <div className={`dp-field ${field.fullWidth ? "full" : ""}`}>

      <label>
        {field.label}
        {field.type === "datetime-local" && field.name !== "lastTestingTime" && !/date|time/i.test(field.label) && (
          <span style={{ fontSize: "11.5px", color: "#64748b", fontWeight: "normal", marginLeft: "6px" }}>
            (Date, Hours & Min)
          </span>
        )}
        {field.required && <span>*</span>}
      </label>
      {field.type === "select" ? (
        <SearchableDropdown
          options={field.options || []}
          value={value}
          onChange={(val) => setValue(field.name, val)}
          placeholder={field.placeholder || `Select ${field.label}`}
          required={field.required}
          readOnly={readOnly || field.readonly}
        />
      ) : field.type === "textarea" ? (
        <textarea {...commonProps} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <input
            type={field.type}
            {...maxProps}
            {...commonProps}
            onKeyDown={(e) => {
              if (field.type === "number" && (e.key === "-" || e.key === "e" || e.key === "E")) {
                e.preventDefault();
              }
            }}
            onClick={(e) => {
              if (field.type === "date" || field.type === "datetime-local") {
                try {
                  e.currentTarget.showPicker();
                } catch (err) {}
              }
            }}
            style={{
              cursor: (field.type === "date" || field.type === "datetime-local") ? "pointer" : "text"
            }}
          />
        </div>
      )}
    </div>
  );
}

const RealTimeClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--muted)", fontWeight: 500 }}>
      {time.toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      })}{" "}
      | {formatTime24(time, true)}
    </p>
  );
};

export default function DailyPositionView({ role, division, user, mode, showToast }: DailyPositionViewProps) {
  const queryClient = useQueryClient();
  const {
    dpSelectedCategory: selectedCategory,
    dpSelectedFormName: selectedFormName,
    dpOpenCategory: openCategory,
    dpCircuitSearch: circuitSearch,
    setDpSelectedCategory: setSelectedCategory,
    setDpSelectedFormName: setSelectedFormName,
    setDpOpenCategory: setOpenCategory,
    setDpCircuitSearch: setSearchTerm,
    dpHistoryFilter,
    dpHistoryCategoryFilter: historyCategory,
    setDpHistoryCategoryFilter: setHistoryCategory,
    dpHistoryFormTypeFilter: historyFormType,
    setDpHistoryFormTypeFilter: setHistoryFormType
  } = useAppStore();

  const canFill = role === "TESTROOM" || role === "STAFF";

  const [localViewMode, setLocalViewMode] = useState<"form" | "history" | null>(null);
  const viewMode = localViewMode || mode || (canFill ? "form" : "history");
  const canChooseDivision = role === "SUPER_ADMIN";
  // Staff are locked to their own division — cannot change it
  const isDivisionLocked = role === "STAFF";

  const [selectedDivision, setSelectedDivision] = useState(division || "");
  const [selectedDate, setSelectedDate] = useState(toDateValue());
  const [historyDate, setHistoryDate] = useState("");
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [values, setValues] = useState<Record<string, any>>({});
  const [quadReadings, setQuadReadings] = useState<any[]>([]);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [detailsRecord, setDetailsRecord] = useState<any | null>(null);
  const [maintenanceType, setMaintenanceType] = useState<"Divisional" | "HQ">("Divisional");
  const [isOkHovered, setIsOkHovered] = useState(false);
  const [walkieTalkieMode, setWalkieTalkieMode] = useState<"testing" | "fault">("testing");

  const [rectifyingRecord, setRectifyingRecord] = useState<any | null>(null);
  const [rectificationTimeInput, setRectificationTimeInput] = useState("");
  const [successModal, setSuccessModal] = useState<{ message: React.ReactNode; onOk: () => void } | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSavingAndNext, setIsSavingAndNext] = useState(false);
  const [isSubmittingAllOk, setIsSubmittingAllOk] = useState(false);
  const [isAddingRecord, setIsAddingRecord] = useState(false);
  const [localDrafts, setLocalDrafts] = useState<any[]>([]);

  // Local completed forms state for today
  const todayStr = toDateValue();
  const completedFormsKey = `dp_completed_${user?.username || "default"}_${todayStr}`;

  const [completedFormsLocal, setCompletedFormsLocal] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(completedFormsKey) || "[]");
    } catch (e) {
      return [];
    }
  });

  const markFormCompleted = (formName: string) => {
    const updated = Array.from(new Set([...completedFormsLocal, formName]));
    setCompletedFormsLocal(updated);
    localStorage.setItem(completedFormsKey, JSON.stringify(updated));
    // Also invalidate sidebar completed checkmarks
    queryClient.invalidateQueries({ queryKey: ["daily-position-records"] });
  };

  const moveToNextForm = () => {
    if (!selectedForm) return;
    const currentIndex = DAILY_POSITION_FORMS.findIndex(f => f.name === selectedForm.name);
    if (currentIndex !== -1 && currentIndex < DAILY_POSITION_FORMS.length - 1) {
      const nextForm = DAILY_POSITION_FORMS[currentIndex + 1];
      setSelectedCategory(nextForm.category);
      setSelectedFormName(nextForm.name);
      setOpenCategory(nextForm.category);
    } else {
      showToast("You have reached the end of the forms.");
    }
  };

  const forms = DAILY_POSITION_FORMS.filter(form => form.category === selectedCategory);
  const visibleForms = forms.filter(form =>
    `${form.name} ${form.badge} ${form.systemCode}`.toLowerCase().includes(circuitSearch.toLowerCase())
  );
  const selectedForm = useMemo(() => {
    return forms.find(form => form.name === selectedFormName) || forms[0];
  }, [forms, selectedFormName]);

  const activeFields = useMemo(() => {
    if (selectedForm?.name === "Railnet / Internet") {
      return maintenanceType === "Divisional" ? RAILNET_DIVISIONAL_FIELDS : RAILNET_HQ_FIELDS;
    }
    return selectedForm?.fields || [];
  }, [selectedForm, maintenanceType]);

  const visibleActiveFields = useMemo(() => {
    const list: typeof activeFields = [];
    for (const field of activeFields) {
      if (field.name === "cableCutByWhomOther") {
        if (values.cableCutByWhom === "Other") {
          list.push(field);
        }
        continue;
      }
      // Exclude stationLobby (Testing) or stationCode (Repairing) as they are rendered separately in the top-bar header layout
      if (selectedForm?.name === "Walkie-Talkie Testing" && field.name === "stationLobby") {
        continue;
      }
      if (selectedForm?.name === "Walkie-Talkie Repairing" && field.name === "stationCode") {
        continue;
      }

      // Exclude read-only/pre-filled fields already present in the stats cards above (Total & Balance)
      if (selectedForm?.name === "Walkie-Talkie Testing" && (field.name === "toBeTestedCount" || field.name === "balanceWalkieTalkies")) {
        continue;
      }
      if (selectedForm?.name === "Walkie-Talkie Repairing" && (field.name === "openingDefective" || field.name === "pendingRepair" || field.name === "receivedFromUser")) {
        continue;
      }

      // Handle Walkie-Talkie Testing mode dynamic fields filtering
      if (selectedForm?.name === "Walkie-Talkie Testing") {
        if (walkieTalkieMode === "testing") {
          // Show only newTestedCount and testDate in testing mode
          if (field.name !== "newTestedCount" && field.name !== "testDate") {
            // Dynamically inject newTestedCount field definition so it doesn't conflict with testedCount database status
            if (field.name === "testedCount") {
              list.push({
                name: "newTestedCount",
                label: "Total walkie-talkies tested",
                type: "number",
                required: true,
                placeholder: "Total count tested"
              });
            }
            continue;
          }
        } else if (walkieTalkieMode === "fault") {
          // Show technical fields, testDate, failureTime, and remarks in fault mode. Exclude testedCount.
          if (field.name === "testedCount") {
            continue;
          }
          // Inject a Date & Time of Fault field right after testDate
          if (field.name === "testDate") {
            list.push(field); // push testDate first
            list.push({
              name: "failureTime",
              label: "Date & Time of Fault",
              type: "datetime-local",
              required: true,
              placeholder: "Select date and time when fault occurred"
            });
            continue; // skip default push below, already pushed
          }
        }
      }

      list.push(field);
      if (field.name !== "reason" && field.type === "select" && (values[field.name] === "Other" || values[field.name] === "Others")) {
        const otherFieldName = `${field.name}Other`;
        const hasExplicitOther = activeFields.some(f => f.name === otherFieldName || f.name === `${field.name}Others`);
        if (!hasExplicitOther) {
          list.push({
            name: otherFieldName,
            label: `${field.label} (Other)`,
            type: "text",
            required: true,
            placeholder: `Specify ${field.label.toLowerCase()}`
          });
        }
      }
    }
    return list;
  }, [activeFields, values, selectedForm, walkieTalkieMode]);

  useEffect(() => {
    if (selectedForm?.name === "Railnet / Internet") {
      setValues(prev => ({
        ...prev,
        maintenanceType: "Divisional Maintenance"
      }));
      setMaintenanceType("Divisional");
    }
  }, [selectedForm?.name]);

  useEffect(() => {
    resetForm();
  }, [selectedFormName]);

  useEffect(() => {
    if (selectedForm?.name === "Low Insulation" && values.section) {
      api.dailyPosition.getMeggerLatest(values.section)
        .then((res: any) => {
          if (res.success && res.entry && res.entry.quadReadings) {
            setQuadReadings(res.entry.quadReadings);
            showToast("Fetched latest quad readings from Megger database.");
          }
        })
        .catch((err: any) => {
          console.warn("Failed to auto-fetch Megger readings:", err);
        });
    }
  }, [selectedForm?.name, values.section]);

  const metadataQuery = useQuery({
    queryKey: ["daily-position-metadata", selectedDivision],
    queryFn: () => api.dailyPosition.metadata(selectedDivision ? { division: selectedDivision } : {}),
    staleTime: 2 * 60 * 1000,
    placeholderData: previousData => previousData,
  });

  const recordsQuery = useQuery({
    queryKey: ["daily-position-records", selectedDivision, selectedDate, historyDate, dpHistoryFilter, viewMode],
    queryFn: () => {
      const params: any = {
        division: selectedDivision || "",
        limit: "500",
      };
      if (dpHistoryFilter === "active-faults") {
        params.isFaulty = "true";
      } else if (dpHistoryFilter === "resolved-faults") {
        params.isResolved = "true";
      } else {
        if (viewMode === "history") {
          if (historyDate) {
            params.date = historyDate;
          }
        } else {
          params.date = selectedDate;
        }
      }
      return api.dailyPosition.list(params);
    },
    placeholderData: previousData => previousData,
  });

  const activeCircuitFaultsQuery = useQuery({
    queryKey: ["daily-position-active-faults", selectedDivision, selectedForm?.name],
    queryFn: () => api.dailyPosition.activeFaults({
      division: selectedDivision || "",
      formType: selectedForm?.name || "",
    }),
    enabled: canFill && viewMode === "form" && !!selectedDivision && !!selectedForm?.name,
    staleTime: 30_000,
    placeholderData: previousData => previousData,
  });
  const activeCircuitFaults = activeCircuitFaultsQuery.data?.data || [];

  // Reconcile localStorage with live server records:
  // If records for today were deleted from the DB, remove them from local state
  // so the form unlocks and the checkmark disappears.
  useEffect(() => {
    if (!recordsQuery.isSuccess || recordsQuery.isFetching) return;
    // Only reconcile when viewing today's records
    if (selectedDate !== todayStr) return;

    const serverCompletedForms = new Set(
      (recordsQuery.data?.data || [])
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
      setCompletedFormsLocal(reconciled);
      localStorage.setItem(completedFormsKey, JSON.stringify(reconciled));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordsQuery.isSuccess, recordsQuery.isFetching, recordsQuery.data?.data]);

  const createRecord = useMutation({
    mutationFn: (body: any) => api.dailyPosition.create(body),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["daily-position-records"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dp-summary-table"] });
      queryClient.invalidateQueries({ queryKey: ["daily-position-active-faults"] });
      queryClient.invalidateQueries({ queryKey: ["walkie-talkie-lobbies-select"] });
      
      const isAllOk = variables?.formData?.actionType === "OK";
      
      let actionMsg: React.ReactNode = null;
      if (isAllOk) {
        actionMsg = (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ fontSize: "16px", fontWeight: "600", color: "#0f172a" }}>Status Updated Successfully</div>
            <div style={{ fontSize: "14px", color: "#64748b" }}>Opening the Next Form...</div>
          </div>
        );
      } else {
        actionMsg = <div style={{ fontSize: "16px", fontWeight: "600", color: "#0f172a" }}>Record Saved Successfully</div>;
      }

      setSuccessModal({
        message: actionMsg,
        onOk: () => {
          setSuccessModal(null);
          resetForm();
          setEditingRecordId(null);
          if (mode === "history") {
            setLocalViewMode("history");
          }
          if (isAllOk) {
            moveToNextForm();
          }
        }
      });
      setIsSavingDraft(false);
      setIsSubmittingAllOk(false);
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to save Daily Position record.");
      setIsSavingDraft(false);
      setIsSubmittingAllOk(false);
    },
  });

  const updateRecord = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => api.dailyPosition.update(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-position-records"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dp-summary-table"] });
      queryClient.invalidateQueries({ queryKey: ["daily-position-active-faults"] });
      queryClient.invalidateQueries({ queryKey: ["walkie-talkie-lobbies-select"] });
      
      setSuccessModal({
        message: <div style={{ fontSize: "16px", fontWeight: "600", color: "#0f172a" }}>Record Saved Successfully</div>,
        onOk: () => {
          setSuccessModal(null);
          resetForm();
          setEditingRecordId(null);
          if (role === "SUPER_ADMIN") {
            setSelectedDivision("");
          }
          if (mode === "history") {
            setLocalViewMode("history");
          }
        }
      });
      setIsSavingDraft(false);
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to update Daily Position record.");
      setIsSavingDraft(false);
    },
  });

  const metadata = metadataQuery.data?.data;
  const records = useMemo(() => {
    const rawRecords = recordsQuery.data?.data || [];
    const matchingLocalDrafts = localDrafts.filter(
      (d) => d.division === (selectedDivision || division || "") && d.date === selectedDate
    );
    const allRecords = [...rawRecords, ...matchingLocalDrafts];
    return [...allRecords].sort((a: any, b: any) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : (a.failureTime ? new Date(a.failureTime).getTime() : 0);
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : (b.failureTime ? new Date(b.failureTime).getTime() : 0);
      if (aTime !== bTime) {
        return aTime - bTime;
      }
      return String(a.id || "").localeCompare(String(b.id || ""));
    });
  }, [recordsQuery.data?.data, localDrafts, selectedDivision, division, selectedDate]);

  // Do not disable form once submitted, so the user can fill and submit it multiple times
  const isCompletedToday = false;

  const isFormEmpty = () => {
    return !visibleActiveFields.some(field => {
      if (
        field.name === "maintenanceType" ||
        field.name === "majorSection" ||
        field.name === "section" ||
        field.name === "stationCode"
      ) {
        return false;
      }
      return !!values[field.name];
    });
  };

  const [historySearch, setHistorySearch] = useState("");
  const [historyDivision, setHistoryDivision] = useState(role === "STAFF" ? (division || "") : "");
  const [historyStatus, setHistoryStatus] = useState("");

  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(records.map((r: any) => r.category).filter(Boolean))) as string[];
  }, [records]);

  const uniqueFormTypes = useMemo(() => {
    return Array.from(new Set(records.map((r: any) => r.formType).filter(Boolean))) as string[];
  }, [records]);

  const uniqueStatuses = useMemo(() => {
    return Array.from(new Set(records.map((r: any) => r.status).filter(Boolean))) as string[];
  }, [records]);

  const filteredHistoryRecords = useMemo(() => {
    return records.filter((r: any) => {
      if (r.status === "DRAFT") return false;

      const isAllOk = r.reason === "All OK" || (r.formData && r.formData.actionType === "OK");
      const isActive = !isAllOk && (r.status === "ACTIVE" || r.status === "PENDING" || (!r.rectificationTime && !isAllOk));
      const isFault = !isAllOk && !!r.failureTime && (r.status === "FAULT" || r.status === "ACTIVE" || r.status === "PENDING" || r.status === "RECTIFIED" || r.status === "All Ok");

      // Tab filter
      if (dpHistoryFilter === "active-faults" && !isActive) return false;
      if (dpHistoryFilter === "resolved-faults") {
        if (!r.rectificationTime) return false;
        try {
          const rectDate = new Date(r.rectificationTime);
          if (isNaN(rectDate.getTime()) || toDateValue(rectDate) !== selectedDate) return false;
        } catch {
          return false;
        }
      }

      // Status-wise filter
      if (historyStatus === "active") {
        if (!isActive) return false;
      } else if (historyStatus === "allok") {
        if (!isAllOk) return false;
      } else if (historyStatus === "fault") {
        if (isAllOk) return false;
      }

      if (historyDivision && r.division !== historyDivision) return false;
      if (historyCategory && r.category !== historyCategory) return false;
      if (historyFormType && r.formType !== historyFormType) return false;
      if (historySearch) {
        const query = historySearch.toLowerCase();
        const division = String(r.division || "").toLowerCase();
        const category = String(r.category || "").toLowerCase();
        const formType = String(r.formType || "").toLowerCase();
        const station = String(r.stationCode || r.stationName || r.section || "").toLowerCase();
        const status = String(r.status || "").toLowerCase();
        const remarks = String(r.remarks || r.reason || "").toLowerCase();
        const customFields = r.formData ? JSON.stringify(r.formData).toLowerCase() : "";

        const match = division.includes(query) ||
                      category.includes(query) ||
                      formType.includes(query) ||
                      station.includes(query) ||
                      status.includes(query) ||
                      remarks.includes(query) ||
                      customFields.includes(query);
        if (!match) return false;
      }
      return true;
    });
  }, [records, historySearch, historyDivision, historyCategory, historyFormType, historyStatus, historyDate, dpHistoryFilter]);
  const divisions = metadata?.divisions?.length ? metadata.divisions : ["Bilaspur", "Raipur", "Nagpur"];
  const normalizedDivisions = Array.from(new Map<string, string>(divisions.map((item: string) => {
    const aliases = divisionAliases(item);
    const value = aliases.find(alias => alias.length <= 3) || item;
    return [value, value];
  })).values());

  const setValue = (name: string, nextValue: any) => {
    setValues(prev => {
      const next = { ...prev, [name]: nextValue };
      if (name === "majorSection") {
        next.section = "";
        next.stationCode = "";
        next.stationCodeOther = "";
        next.assetId = "";
      }
      if (name === "section") {
        next.stationCode = "";
        next.stationCodeOther = "";
        next.assetId = "";
      }
      if (name === "stationCode") {
        if (nextValue !== "Others") {
          next.stationCodeOther = "";
        }
        next.assetId = "";
      }
      
      if (name === "failureTime" || name === "rectificationTime") {
        next.durationText = calcDurationText(next.failureTime, next.rectificationTime);
      }

      if (name === "temporaryJointsCount" || name === "rectifiedJoints") {
        const total = Number(next.temporaryJointsCount || 0);
        const rectified = Number(next.rectifiedJoints || 0);
        next.balanceTemporaryJoints = Math.max(0, total - rectified);
      }

      if (name === "toBeTestedCount" || name === "testedCount" || name === "newTestedCount") {
        const total = Number(next.toBeTestedCount || 0);
        const tested = Number(next.testedCount || 0);
        
        if (name === "newTestedCount") {
          if (nextValue === "") {
            next.newTestedCount = "";
          } else {
            let rawVal = nextValue;
            if (typeof rawVal === 'string') {
              rawVal = rawVal.replace(/-/g, '');
            }
            let numVal = Number(rawVal || 0);
            if (numVal < 0) numVal = 0;
            
            const maxVal = Math.max(0, total - tested);
            if (numVal > maxVal) {
              numVal = maxVal;
            }
            next.newTestedCount = numVal;
          }
        }

        const newlyTested = Number(next.newTestedCount || 0);
        const maxVal = Math.max(0, total - tested);
        if (newlyTested > maxVal) {
          next.newTestedCount = maxVal;
        }
        next.balanceWalkieTalkies = Math.max(0, total - (tested + Number(next.newTestedCount || 0)));
      }

      if (name === "openingDefective" || name === "receivedFromUser" || name === "returnedToUser" || name === "setsCondemned") {
        const opening = Number(next.openingDefective || 0);
        const received = Number(next.receivedFromUser || 0);
        const returned = Number(next.returnedToUser || 0);
        const condemned = Number(next.setsCondemned || 0);
        next.pendingRepair = opening + received - returned - condemned;
      }

      if (name === "caseBalanceLastDate" || name === "caseReceivedOnDate" || name === "caseCompliedOnDate") {
        const lastDate = Number(next.caseBalanceLastDate || 0);
        const received = Number(next.caseReceivedOnDate || 0);
        const complied = Number(next.caseCompliedOnDate || 0);
        next.netBalanceCaseOnDate = lastDate + received - complied;
      }

      if (name === "cableCutByWhom" && nextValue !== "Other") {
        next.cableCutByWhomOther = "";
      }

      return next;
    });
  };

  const buildPayload = (actionType: "OK" | "FAULT" | "DRAFT" = "FAULT") => {
    const station = metadata?.stations?.find((item: any) => item.code === values.stationCode);
    const isOk = actionType === "OK";
    const isDraft = actionType === "DRAFT";
    const editingRecord = editingRecordId ? records.find((r: any) => r.id === editingRecordId) : null;

    // Convert datetime-local fields to UTC ISO
    const processedValues = { ...values };
    activeFields.forEach((field) => {
      if (field.type === "datetime-local" && processedValues[field.name]) {
        processedValues[field.name] = toUTCFromISTString(processedValues[field.name]);
      }
    });

    if (selectedForm.name === "Walkie-Talkie Testing" && walkieTalkieMode === "testing") {
      // Map the input count to testedCount before sending to the backend controller
      processedValues.testedCount = Number(processedValues.newTestedCount || 0);
    }

    return {
      division: selectedDivision,
      category: selectedForm.category,
      formType: selectedForm.name,
      systemCode: selectedForm.systemCode,
      majorSection: values.majorSection || null,
      section: values.section || null,
      stationCode: selectedForm.name === "Walkie-Talkie Testing" ? (values.stationLobby || null) : (values.stationCode || null),
      stationName: values.stationCode === "Others" ? (values.stationCodeOther || "Others") : ((selectedForm.name === "CFTM Conference" || selectedForm.name === "Video Conferencing with Divisions" || selectedForm.name === "Hotline" || selectedForm.name === "Walkie-Talkie Testing") ? (values.stationCode || values.stationLobby || null) : (station?.name || null)),
      assetId: values.assetId || null,
      telecomAsset: selectedForm.name,
      status: isDraft ? "DRAFT" : (isOk ? "All Ok" : statusFromForm(selectedForm, processedValues)),
      failureTime: isOk ? null : (processedValues.failureTime || null),
      rectificationTime: isOk ? null : (processedValues.rectificationTime || null),
      durationText: isOk ? null : calcDurationText(processedValues.failureTime, processedValues.rectificationTime),
      reason: isOk ? "All OK" : (values.reason || null),
      remarks: values.remarks || null,
      date: editingRecord ? (editingRecord.date || selectedDate) : selectedDate,
      formData: {
        ...processedValues,
        actionType,
        checkedAt: new Date().toISOString(),
        ...(selectedForm.name === "Low Insulation" ? { quadReadings } : {}),
      },
    };
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!(canFill || (role === "SUPER_ADMIN" && editingRecordId)) || !selectedForm) return;

    // Client-side validation to block future dates & times
    const now = new Date();
    const nowLocalStr = toLocalDateTimeValue(now);
    const todayLocalStr = toDateValue(now);

    for (const field of activeFields) {
      const val = values[field.name];
      if (!val) continue;

      if (field.name === "tdc") continue;

      if (field.type === "datetime-local") {
        if (val > nowLocalStr) {
          showToast(`Future date & time is not allowed for "${field.label}".`);
          return;
        }
      } else if (field.type === "date") {
        if (val > todayLocalStr) {
          showToast(`Future date is not allowed for "${field.label}".`);
          return;
        }
      }
    }

    if (editingRecordId) {
      setIsSavingDraft(true);
      if (String(editingRecordId).startsWith("local_")) {
        setLocalDrafts(prev => prev.map(d => {
          if (d.id === editingRecordId) {
            return {
              ...d,
              majorSection: values.majorSection || null,
              section: values.section || null,
              stationCode: values.stationCode || null,
              stationName: values.stationCode === "Others" ? (values.stationCodeOther || "Others") : (metadata?.stations?.find((item: any) => item.code === values.stationCode)?.name || values.stationCode || null),
              assetId: values.assetId || null,
              failureTime: values.failureTime || null,
              rectificationTime: values.rectificationTime || null,
              durationText: calcDurationText(values.failureTime, values.rectificationTime),
              reason: values.reason || null,
              remarks: values.remarks || null,
              formData: {
                ...values,
                actionType: "FAULT",
                checkedAt: new Date().toISOString(),
                ...(selectedForm.name === "Low Insulation" ? { quadReadings } : {}),
              }
            };
          }
          return d;
        }));
        showToast("Draft record updated successfully.");
        resetForm();
        setIsSavingDraft(false);
      } else {
        const editingRecord = records.find((r: any) => r.id === editingRecordId);
        const isEditingDraft = editingRecord && editingRecord.status === "DRAFT";
        updateRecord.mutate({ 
          id: editingRecordId, 
          body: buildPayload(isEditingDraft ? "DRAFT" : "FAULT") 
        });
      }
      return;
    }
    handleSaveAndNext();
  };

  const handleOk = () => {
    if (!canFill || !selectedForm) return;
    setIsSubmittingAllOk(true);
    createRecord.mutate(buildPayload("OK"));
    markFormCompleted(selectedForm.name);
  };

  const handleDeleteDraft = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this draft?")) return;
    if (String(id).startsWith("local_")) {
      setLocalDrafts(prev => prev.filter(d => d.id !== id));
      showToast("Draft deleted successfully.");
      return;
    }
    try {
      await api.dailyPosition.delete(id);
      showToast("Draft deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["daily-position-records"] });
    } catch (err: any) {
      showToast(err.message || "Failed to delete draft.");
    }
  };

  const handleSaveAndNext = async () => {
    if (!canFill || !selectedForm) return;

    // Special submit logic for Walkie-Talkie Testing in Testing Report mode:
    // It is a direct submission, not standard draft record compilation
    if (selectedForm.name === "Walkie-Talkie Testing" && walkieTalkieMode === "testing") {
      setIsSavingAndNext(true);
      try {
        // stationLobby is rendered separately (not in visibleActiveFields), validate explicitly
        if (!values.stationLobby) {
          showToast("Please select a Station / Lobby before submitting.");
          setIsSavingAndNext(false);
          return;
        }

        const total = Number(values.toBeTestedCount || 0);
        const tested = Number(values.testedCount || 0);
        const newlyTested = Number(values.newTestedCount || 0);

        if (tested >= total && total > 0) {
          showToast("All sets for this lobby have already been tested. Cannot submit another record.");
          setIsSavingAndNext(false);
          return;
        }

        if (newlyTested < 0) {
          showToast("Total walkie-talkies tested cannot be negative.");
          setIsSavingAndNext(false);
          return;
        }

        if (newlyTested > (total - tested)) {
          showToast(`Total walkie-talkies tested cannot exceed the remaining balance (${total - tested}).`);
          setIsSavingAndNext(false);
          return;
        }

        // Validate remaining required fields
        for (const field of visibleActiveFields) {
          if (field.required && !values[field.name]) {
            showToast(`Please fill in all required fields.`);
            setIsSavingAndNext(false);
            return;
          }
        }
        const payload = buildPayload("OK"); // Saved as OPERATIONAL by backend controller logic mapping
        await api.dailyPosition.create(payload);
        showToast("Testing report submitted successfully.");
        // Refresh lobby stats bar so Tested Sets & Balance update immediately
        queryClient.invalidateQueries({ queryKey: ["walkie-talkie-lobbies-select"] });
        
        // Show success modal
        setSuccessModal({
          message: (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <div style={{ fontSize: "16px", fontWeight: "600", color: "#0f172a" }}>Record Saved Successfully</div>
              <div style={{ fontSize: "14px", color: "#64748b" }}>Opening the Next Form...</div>
            </div>
          ),
          onOk: () => {
            setSuccessModal(null);
            resetForm();
            setEditingRecordId(null);
            moveToNextForm();
          }
        });
      } catch (err: any) {
        showToast(err.message || "Failed to submit testing report.");
      } finally {
        setIsSavingAndNext(false);
      }
      return;
    }

    const drafts = records.filter(r => r.formType === selectedForm.name && r.status === "DRAFT");
    const isEmpty = isFormEmpty();

    // For Walkie-Talkie Testing, lobby must be selected before any submission (testing or fault mode)
    if (selectedForm.name === "Walkie-Talkie Testing" && !values.stationLobby) {
      showToast("Please select a Station / Lobby before submitting.");
      return;
    }

    if (drafts.length === 0 && isEmpty) {
      showToast("Please add at least one record or fill in the form before submitting.");
      return;
    }

    setIsSavingAndNext(true);
    try {
      const allDraftsToSubmit = [...drafts];

      if (!isEmpty) {
        // stationLobby is rendered separately (not in visibleActiveFields), validate explicitly for all WT modes
        if (selectedForm.name === "Walkie-Talkie Testing" && !values.stationLobby) {
          showToast("Please select a Station / Lobby before submitting.");
          setIsSavingAndNext(false);
          return;
        }
        // Validate current form fields (visible fields only)
        for (const field of visibleActiveFields) {
          if (field.required && !values[field.name]) {
            showToast(`Please fill in all required fields.`);
            setIsSavingAndNext(false);
            return;
          }
        }

        // Client-side validation to block future dates & times
        const now = new Date();
        const nowLocalStr = toLocalDateTimeValue(now);
        const todayLocalStr = toDateValue(now);

        for (const field of visibleActiveFields) {
          const val = values[field.name];
          if (!val) continue;

          if (field.name === "tdc") continue;

          if (field.type === "datetime-local") {
            if (val > nowLocalStr) {
              showToast(`Future date & time is not allowed for "${field.label}".`);
              setIsSavingAndNext(false);
              return;
            }
          } else if (field.type === "date") {
            if (val > todayLocalStr) {
              showToast(`Future date is not allowed for "${field.label}".`);
              setIsSavingAndNext(false);
              return;
            }
          }
        }

        // Save current form values as local draft payload
        const payload = {
          ...buildPayload("DRAFT"),
          createdAt: new Date().toISOString()
        };
        allDraftsToSubmit.push(payload);
      }

      if (allDraftsToSubmit.length === 0) {
        try {
          const payload = buildPayload("OK");
          await api.dailyPosition.create(payload);
          showToast("No drafts found. Submitted as ALL OK.");
        } catch (err: any) {
          showToast(err.message || "Failed to submit All OK.");
          setIsSavingAndNext(false);
          return;
        }
      } else {
        // Submit all drafts by creating them (if they don't have a real server ID) or updating them (if they do)
        try {
          const promises = allDraftsToSubmit.map((draft: any) => {
            const finalStatus = statusFromForm(selectedForm, draft.formData || {});
            if (!draft.id || String(draft.id).startsWith("local_")) {
              const createPayload = {
                ...draft,
                id: undefined, // Let server generate ID
                status: finalStatus
              };
              return api.dailyPosition.create(createPayload);
            } else {
              return api.dailyPosition.update(draft.id, {
                ...draft,
                status: finalStatus
              });
            }
          });
          await Promise.all(promises);
          setLocalDrafts(prev => prev.filter(d => d.formType !== selectedForm.name));
        } catch (err: any) {
          showToast(err.message || "Failed to submit drafts.");
          setIsSavingAndNext(false);
          return;
        }
      }

      // Mark current form as completed for today
      markFormCompleted(selectedForm.name);

      queryClient.invalidateQueries({ queryKey: ["daily-position-records"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dp-summary-table"] });
      // Refresh lobby stats bar so Tested Sets & Balance reflect the submitted fault
      queryClient.invalidateQueries({ queryKey: ["walkie-talkie-lobbies-select"] });

      // Show success modal
      setSuccessModal({
        message: (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ fontSize: "16px", fontWeight: "600", color: "#0f172a" }}>Record Saved Successfully</div>
            <div style={{ fontSize: "14px", color: "#64748b" }}>Opening the Next Form...</div>
          </div>
        ),
        onOk: () => {
          setSuccessModal(null);
          resetForm();
          setEditingRecordId(null);
          moveToNextForm();
        }
      });
    } finally {
      setIsSavingAndNext(false);
    }
  };

  const startEdit = (record: any) => {
    const isDraft = record.status === "DRAFT";
    if (role !== "SUPER_ADMIN" && !isDraft) {
      setRectifyingRecord(record);
      setRectificationTimeInput(formatDateTimeInput(record.rectificationTime) || "");
      return;
    }
    if (role === "SUPER_ADMIN") {
      setSelectedDivision(record.division || "");
    }
    let form = DAILY_POSITION_FORMS.find(item => item.name === record.formType);
    if (!form && record.category === "Exchange") {
      form = DAILY_POSITION_FORMS.find(item => item.name === "Exchange");
    }
    if (form) {
      setSelectedCategory(form.category);
      setSelectedFormName(form.name);
    }
    if (record.formType === "Railnet / Internet") {
      setMaintenanceType(record.formData?.maintenanceType === "HQ Maintenance" ? "HQ" : "Divisional");
    }
    const failureTime = formatDateTimeInput(record.failureTime);
    const rectificationTime = formatDateTimeInput(record.rectificationTime);
    setValues({
      ...(record.formData || {}),
      failureTime,
      rectificationTime,
      durationText: calcDurationText(failureTime, rectificationTime),
      majorSection: record.majorSection || record.formData?.majorSection || "",
      section: record.section || record.formData?.section || "",
      stationCode: record.stationCode || record.formData?.stationCode || "",
      stationCodeOther: record.formData?.stationCodeOther || ((record.stationCode === "Others" || record.formData?.stationCode === "Others") ? record.stationName : "") || "",
      assetId: record.assetId || record.formData?.assetId || "",
      reason: record.reason || record.formData?.reason || "",
      remarks: record.remarks || record.formData?.remarks || "",
    });
    setQuadReadings(record.formData?.quadReadings || []);
    setEditingRecordId(record.id);
    if (mode === "history") {
      setLocalViewMode("form");
    }
  };

  const handleCancelEdit = () => {
    resetForm();
    if (role === "SUPER_ADMIN") {
      setSelectedDivision("");
    }
    if (mode === "history") {
      setLocalViewMode("history");
    }
  };

  const resetForm = () => {
    if (selectedForm?.name === "Railnet / Internet") {
      setValues({ maintenanceType: "Divisional Maintenance" });
      setMaintenanceType("Divisional");
    } else if (selectedForm?.name === "Walkie-Talkie Testing") {
      // Preserve the selected stationLobby so the user can see updated values
      const currentLobby = values.stationLobby;
      const currentTotal = values.toBeTestedCount;
      setValues({
        stationLobby: currentLobby,
        toBeTestedCount: currentTotal
      });
    } else {
      setValues({});
    }
    setQuadReadings([]);
    setEditingRecordId(null);
  };

  const handleAddRecord = async () => {
    if (!canFill || !selectedForm || isAddingRecord) return;

    const isEmpty = isFormEmpty();
    if (isEmpty) {
      showToast("Please fill in the form before adding a record.");
      return;
    }

    // Validate current form fields (visible fields only)
    for (const field of visibleActiveFields) {
      if (field.required && !values[field.name]) {
        showToast(`Please fill in all required fields.`);
        return;
      }
    }

    // Client-side validation to block future dates & times
    const now = new Date();
    const nowLocalStr = toLocalDateTimeValue(now);
    const todayLocalStr = toDateValue(now);

    for (const field of visibleActiveFields) {
      const val = values[field.name];
      if (!val) continue;

      if (field.name === "tdc") continue;

      if (field.type === "datetime-local") {
        if (val > nowLocalStr) {
          showToast(`Future date & time is not allowed for "${field.label}".`);
          return;
        }
      } else if (field.type === "date") {
        if (val > todayLocalStr) {
          showToast(`Future date is not allowed for "${field.label}".`);
          return;
        }
      }
    }

    setIsAddingRecord(true);
    try {
      const payload = {
        id: `local_${Date.now()}_${Math.random()}`,
        ...buildPayload("DRAFT"),
        createdAt: new Date().toISOString()
      };
      setLocalDrafts(prev => [...prev, payload]);
      showToast("Draft record added successfully.");
      resetForm();
    } catch (err: any) {
      showToast(err.message || "Failed to add record.");
    } finally {
      setIsAddingRecord(false);
    }
  };

  const currentFormRecords = records
    .filter((record: any) => record.formType === selectedForm?.name);

  const renderHistory = () => (
    <section className="dp-history-panel">
      <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "12px", width: "100%" }}>
        {/* Search bar */}
        <div style={{ flex: 1, position: "relative" }}>
          <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none", display: "flex", alignItems: "center" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </span>
          <input
            type="text"
            placeholder="Search..."
            value={historySearch}
            onChange={e => setHistorySearch(e.target.value)}
            style={{ width: "100%", padding: "8px 12px 8px 32px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", boxSizing: "border-box" }}
          />
        </div>
        {/* Filter Toggle Button */}
        <button
          type="button"
          onClick={() => setShowFiltersPanel(!showFiltersPanel)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 16px",
            borderRadius: "6px",
            border: "1px solid #3b82f6",
            background: showFiltersPanel ? "#eff6ff" : "#fff",
            color: "#3b82f6",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            outline: "none",
            height: "37px"
          }}
        >
          <Filter size={15} />
          Filter
        </button>
      </div>

      {showFiltersPanel && (
        <div 
          className="dp-history-filters-collapsible" 
          style={{ 
            display: "flex", 
            gap: "16px", 
            flexWrap: "wrap",
            padding: "20px", 
            background: "#ffffff", 
            borderRadius: "12px", 
            marginBottom: "20px", 
            border: "1px solid #e2e8f0", 
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
            alignItems: "end"
          }}
        >
          {/* Division filter */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "200px" }}>
            <label style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#64748b", letterSpacing: "0.5px" }}>Division</label>
            <ClearableSelect
              value={historyDivision}
              onChange={setHistoryDivision}
              disabled={role === "STAFF"}
              style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", color: "#1e293b", background: role === "STAFF" ? "#f1f5f9" : "#fff", cursor: role === "STAFF" ? "not-allowed" : "default", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", outline: "none" }}
            >
              {role !== "STAFF" && <option value="">All Divisions</option>}
              <option value="Bilaspur">Bilaspur</option>
              <option value="Raipur">Raipur</option>
              <option value="Nagpur">Nagpur</option>
            </ClearableSelect>
          </div>
          {/* Status-wise filter */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "180px" }}>
            <label style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#64748b", letterSpacing: "0.5px" }}>Status</label>
            <ClearableSelect
              value={historyStatus}
              onChange={setHistoryStatus}
              style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", color: "#1e293b", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", outline: "none" }}
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="allok">ALL OK</option>
              <option value="fault">Fault</option>
            </ClearableSelect>
          </div>
          {/* Position Date filter */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "180px" }}>
            <label style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#64748b", letterSpacing: "0.5px" }}>Position Date</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#64748b", pointerEvents: "none", display: "flex", alignItems: "center" }}>
                <Calendar size={14} />
              </span>
              <input
                type="date"
                value={historyDate}
                onChange={e => setHistoryDate(e.target.value)}
                onClick={e => { try { e.currentTarget.showPicker(); } catch (err) {} }}
                style={{ width: "100%", padding: "8px 12px 8px 32px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", color: "#1e293b", background: "#fff", boxSizing: "border-box", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", outline: "none" }}
              />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            {(historySearch || historyDivision || historyStatus || historyCategory || historyFormType || historyDate) && (
              <button
                type="button"
                onClick={() => {
                  setHistorySearch("");
                  setHistoryDivision(role === "STAFF" ? (division || "") : "");
                  setHistoryStatus("");
                  setHistoryCategory("");
                  setHistoryFormType("");
                  setHistoryDate("");
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "38px",
                  padding: "0 16px",
                  border: "1px solid #fca5a5",
                  borderRadius: "8px",
                  background: "#fef2f2",
                  color: "#dc2626",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#fee2e2";
                  e.currentTarget.style.borderColor = "#fca5a5";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#fef2f2";
                  e.currentTarget.style.borderColor = "#fca5a5";
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
          {/* Live Stats summary widget on the right side */}
          <div 
            className="filter-live-stats" 
            style={{ 
              marginLeft: "auto", 
              display: "flex", 
              gap: "12px", 
              alignItems: "center", 
              padding: "8px 16px", 
              background: "#f8fafc", 
              borderRadius: "8px", 
              border: "1px dashed #cbd5e1", 
              height: "38px" 
            }}
          >
            <div style={{ fontSize: "12px", color: "#64748b" }}>
              <strong style={{ color: "#0f172a" }}>{filteredHistoryRecords.length}</strong> Total
            </div>
            <div style={{ width: "1px", height: "14px", background: "#cbd5e1" }} />
            <div style={{ fontSize: "12px", color: "#64748b" }}>
              <strong style={{ color: "#ef4444" }}>
                {filteredHistoryRecords.filter((r: any) => {
                  const isAllOk = r.reason === "All OK" || (r.formData && r.formData.actionType === "OK");
                  return !isAllOk && (r.status === "ACTIVE" || r.status === "PENDING" || !r.rectificationTime);
                }).length}
              </strong> Active
            </div>
            <div style={{ width: "1px", height: "14px", background: "#cbd5e1" }} />
            <div style={{ fontSize: "12px", color: "#64748b" }}>
              <strong style={{ color: "#10b981" }}>
                {filteredHistoryRecords.filter((r: any) => {
                  const isAllOk = r.reason === "All OK" || (r.formData && r.formData.actionType === "OK");
                  return r.status === "RECTIFIED" || r.status === "All Ok" || isAllOk;
                }).length}
              </strong> Resolved
            </div>
          </div>
        </div>
      )}
      <div className="table-scroll-container">
        <table className="data-table dp-history-table">
          <thead>
            <tr>
              <th>Division</th>
              <th>Category</th>
              <th>Form Type</th>
              <th>Station</th>
              <th>Status</th>
              <th>Failure Time</th>
              <th>Rectification Time</th>
              <th>Failures details</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {recordsQuery.isLoading || recordsQuery.isFetching ? (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: "40px", color: "var(--navy)" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", justifyContent: "center" }}>
                    <div className="dp-btn-loader" style={{ width: "30px", height: "30px", border: "3px solid #cbd5e1", borderTopColor: "#3b82f6", display: "inline-block" }}></div>
                    <span style={{ fontSize: "14px", fontWeight: "600", color: "#475569" }}>Loading Daily Position records...</span>
                  </div>
                </td>
              </tr>
            ) : (
              <>
                {filteredHistoryRecords.map((record: any) => {
                  const isAllOk = record.reason === "All OK" || (record.formData && record.formData.actionType === "OK");
                  const isClosed = record.status === "RECTIFIED" || record.status === "All Ok" || isAllOk;
                  const canEdit = (role === "SUPER_ADMIN") || (canFill && (isTodayRecord(record) || !isClosed) && (!user?.id || record.createdById === user.id));
                  return (
                    <tr key={record.id}>
                      <td>{record.division}</td>
                      <td>{record.category}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                          <strong>{record.formType === "Exchange" && record.formData?.exchangeName ? record.formData.exchangeName : record.formType}</strong>
                        </div>
                      </td>
                      <td>{record.stationCode || record.stationName || record.section || (isAllOk ? "" : "-")}</td>
                      <td><span className={`pill status-${isAllOk ? "All Ok" : String(record.status || "").toLowerCase()}`}>{isAllOk ? "All Ok" : record.status}</span></td>
                      <td>{isAllOk ? "" : (record.failureTime ? (isTodayRecord(record) ? formatTime24(record.failureTime) : `${formatDate24(record.failureTime)} ${formatTime24(record.failureTime)}`) : "-")}</td>
                      <td>{isAllOk ? "" : (record.rectificationTime ? (isTodayRecord(record) ? formatTime24(record.rectificationTime) : `${formatDate24(record.rectificationTime)} ${formatTime24(record.rectificationTime)}`) : "-")}</td>
                      <td>
                        {(() => {
                          const text = record.remarks || record.reason || (isAllOk ? "" : "-");
                          const isLong = text.length > 80;
                          return (
                            <span>
                              {isLong ? `${text.slice(0, 80)}...` : text}
                              {isLong && (
                                <button
                                  type="button"
                                  onClick={() => setDetailsRecord(record)}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    color: "#2563eb",
                                    padding: 0,
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    textDecoration: "underline",
                                    cursor: "pointer",
                                    marginLeft: "6px",
                                    display: "inline"
                                  }}
                                >
                                  View Full
                                </button>
                              )}
                            </span>
                          );
                        })()}
                      </td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <div style={{ display: "inline-flex", gap: "8px", justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            onClick={() => setDetailsRecord(record)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              padding: "6px 12px",
                              borderRadius: "6px",
                              border: "1px solid #bfdbfe",
                              background: "#eff6ff",
                              color: "#1d4ed8",
                              fontSize: "12px",
                              fontWeight: "600",
                              cursor: "pointer",
                              transition: "all 0.2s ease"
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#dbeafe";
                              e.currentTarget.style.borderColor = "#93c5fd";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "#eff6ff";
                              e.currentTarget.style.borderColor = "#bfdbfe";
                            }}
                          >
                            <Eye size={13} /> View Details
                          </button>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => startEdit(record)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                padding: "6px 12px",
                                borderRadius: "6px",
                                border: "1px solid #ddd6fe",
                                background: "#f5f3ff",
                                color: "#6d28d9",
                                fontSize: "12px",
                                fontWeight: "600",
                                cursor: "pointer",
                                transition: "all 0.2s ease"
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#ede9fe";
                                e.currentTarget.style.borderColor = "#c7d2fe";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "#f5f3ff";
                                e.currentTarget.style.borderColor = "#ddd6fe";
                              }}
                            >
                              <Edit size={13} /> Edit
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredHistoryRecords.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", color: "var(--muted)", padding: 24 }}>
                      {historySearch || historyDivision || historyStatus
                        ? "No Daily Position records found matching current criteria."
                        : "No Daily Position records for this date."}
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );

  return (
    <article className="daily-position-page secr-position-page">
      <style>{`
        @keyframes dpBtnSpinner {
          to { transform: rotate(360deg); }
        }
        .dp-btn-loader {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top-color: #ffffff;
          animation: dpBtnSpinner 0.6s linear infinite;
          display: inline-block;
          margin-right: 6px;
        }
      `}</style>
      <section className={`tabular-header dp-page-header ${viewMode === "history" ? "history-mode" : ""}`}>
        <div className="header-title-section">
          <h2>{viewMode === "history" ? "Daily position History" : "Daily Position"}</h2>
          <RealTimeClock />
        </div>
        <div className="header-controls-section">
        </div>
      </section>

      {(canFill || (role === "SUPER_ADMIN" && editingRecordId)) && viewMode === "form" && (
        <section className="dp-workspace" style={{ display: "block" }}>
          <main className="dp-form-shell secr-form-shell">
            <form onSubmit={handleSubmit}>
              <div className="dp-form-scrollable-container">
                {!canFill && (
                  <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#475569", fontWeight: 600, marginBottom: 12 }}>
                    🔒 This category is read-only. Staff can only write under "Testing & Maintenance".
                  </div>
                )}
                <div className="dp-form-intro" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", borderBottom: "1px solid var(--line)", paddingBottom: "10px", marginBottom: "12px" }}>
                  <div>
                    <h3 style={{ margin: 0 }}>
                      {selectedForm.name === "Exchange" && values.exchangeName
                        ? `Exchange - ${values.exchangeName}`
                        : (editingRecordId ? `Edit ${selectedForm.name}` : selectedForm.name)}
                    </h3>
                    <p style={{ margin: "4px 0 0", fontSize: "14px", color: "var(--muted)" }}>{selectedForm.description}</p>
                  </div>
                  {selectedForm.name === "Railnet / Internet" && (
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        className="export-button"
                        style={{
                          background: maintenanceType === "Divisional" ? "var(--blue-soft)" : "transparent",
                          color: maintenanceType === "Divisional" ? "var(--blue)" : "var(--muted)",
                          borderColor: maintenanceType === "Divisional" ? "var(--blue)" : "var(--line)",
                          fontWeight: 700,
                          padding: "6px 14px",
                          borderRadius: "6px",
                          fontSize: "13px",
                          cursor: (isCompletedToday && !editingRecordId) ? "not-allowed" : "pointer"
                        }}
                        disabled={isCompletedToday && !editingRecordId}
                        onClick={() => {
                          setMaintenanceType("Divisional");
                          setValue("maintenanceType", "Divisional Maintenance");
                        }}
                      >
                        Divisional Maintenance
                      </button>
                      <button
                        type="button"
                        className="export-button"
                        style={{
                          background: maintenanceType === "HQ" ? "var(--blue-soft)" : "transparent",
                          color: maintenanceType === "HQ" ? "var(--blue)" : "var(--muted)",
                          borderColor: maintenanceType === "HQ" ? "var(--blue)" : "var(--line)",
                          fontWeight: 700,
                          padding: "6px 14px",
                          borderRadius: "6px",
                          fontSize: "13px",
                          cursor: (isCompletedToday && !editingRecordId) ? "not-allowed" : "pointer"
                        }}
                        disabled={isCompletedToday && !editingRecordId}
                        onClick={() => {
                          setMaintenanceType("HQ");
                          setValue("maintenanceType", "HQ Maintenance");
                        }}
                      >
                        HQ Maintenance
                      </button>
                    </div>
                  )}
                </div>





                {(selectedForm?.name === "Walkie-Talkie Testing" || selectedForm?.name === "Walkie-Talkie Repairing") && (
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1.2fr 0.90fr 0.90fr 0.90fr",
                    gap: "12px",
                    marginBottom: "20px",
                    background: "var(--light)",
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    alignItems: "center"
                  }}>
                    {/* Lobby Select Column */}
                    <div>
                      {selectedForm.name === "Walkie-Talkie Testing" ? (
                        <DailyPositionFieldInput
                          field={activeFields.find(f => f.name === "stationLobby")!}
                          value={values.stationLobby}
                          values={values}
                          setValue={setValue}
                          metadata={metadata}
                          selectedDivision={selectedDivision}
                          readOnly={!canFill || (isCompletedToday && !editingRecordId)}
                          formName={selectedForm.name}
                        />
                      ) : (
                        <DailyPositionFieldInput
                          field={activeFields.find(f => f.name === "stationCode")!}
                          value={values.stationCode}
                          values={values}
                          setValue={setValue}
                          metadata={metadata}
                          selectedDivision={selectedDivision}
                          readOnly={!canFill || (isCompletedToday && !editingRecordId)}
                          formName={selectedForm.name}
                        />
                      )}
                    </div>

                    {/* Stats Card 1 */}
                    <div style={{ background: "#ffffff", padding: "10px 12px", borderRadius: "6px", border: "1px solid #e2e8f0", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
                      <div style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>Total sets</div>
                      <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--navy)", marginTop: "2px" }}>
                        {selectedForm.name === "Walkie-Talkie Testing" ? (values.toBeTestedCount || 0) : (Number(values.openingDefective || 0) + Number(values.receivedFromUser || 0))}
                      </div>
                    </div>

                    {/* Stats Card 2 */}
                    <div style={{ background: "#ffffff", padding: "10px 12px", borderRadius: "6px", border: "1px solid #e2e8f0", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
                      <div style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>
                        {selectedForm.name === "Walkie-Talkie Testing" ? "Tested sets" : "Repaired sets"}
                      </div>
                      <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--green)", marginTop: "2px" }}>
                        {selectedForm.name === "Walkie-Talkie Testing" ? (values.testedCount || 0) : (values.repairedFromFirm || 0)}
                      </div>
                    </div>

                    {/* Stats Card 3 */}
                    <div style={{ background: "#ffffff", padding: "10px 12px", borderRadius: "6px", border: "1px solid #e2e8f0", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
                      <div style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>
                        {selectedForm.name === "Walkie-Talkie Testing" ? "Balance for Testing" : "Pending Repair"}
                      </div>
                      <div style={{
                        fontSize: "18px",
                        fontWeight: 800,
                        color: (selectedForm.name === "Walkie-Talkie Testing"
                          ? Math.max(0, Number(values.toBeTestedCount || 0) - (Number(values.testedCount || 0) + Number(values.newTestedCount || 0)))
                          : Number(values.pendingRepair || 0)) > 0 ? "var(--amber)" : "var(--green)",
                        marginTop: "2px"
                      }}>
                        {selectedForm.name === "Walkie-Talkie Testing"
                          ? Math.max(0, Number(values.toBeTestedCount || 0) - (Number(values.testedCount || 0) + Number(values.newTestedCount || 0)))
                          : (values.pendingRepair || 0)}
                      </div>
                    </div>
                  </div>
                )}

                {selectedForm?.name === "Walkie-Talkie Testing" && (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "20px",
                    background: "#f1f5f9",
                    padding: "4px",
                    borderRadius: "8px",
                    width: "fit-content",
                    border: "1px solid #e2e8f0"
                  }}>
                    <button
                      type="button"
                      onClick={() => setWalkieTalkieMode("testing")}
                      style={{
                        padding: "6px 16px",
                        borderRadius: "6px",
                        fontSize: "13px",
                        fontWeight: 600,
                        border: "none",
                        cursor: "pointer",
                        background: walkieTalkieMode === "testing" ? "#ffffff" : "transparent",
                        color: walkieTalkieMode === "testing" ? "var(--blue)" : "#64748b",
                        boxShadow: walkieTalkieMode === "testing" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                        transition: "all 0.15s ease"
                      }}
                    >
                      Testing Report
                    </button>
                    <button
                      type="button"
                      onClick={() => setWalkieTalkieMode("fault")}
                      style={{
                        padding: "6px 16px",
                        borderRadius: "6px",
                        fontSize: "13px",
                        fontWeight: 600,
                        border: "none",
                        cursor: "pointer",
                        background: walkieTalkieMode === "fault" ? "#ffffff" : "transparent",
                        color: walkieTalkieMode === "fault" ? "var(--blue)" : "#64748b",
                        boxShadow: walkieTalkieMode === "fault" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                        transition: "all 0.15s ease"
                      }}
                    >
                      Fault Report
                    </button>
                  </div>
                )}

                <div className="dp-form-grid">
                  {visibleActiveFields.map(field => (
                    <DailyPositionFieldInput
                      key={field.name}
                      field={field}
                      value={field.name === "durationText" ? calcDurationText(values.failureTime, values.rectificationTime) : values[field.name]}
                      values={values}
                      setValue={setValue}
                      metadata={metadata}
                      selectedDivision={selectedDivision}
                      readOnly={!canFill || (isCompletedToday && !editingRecordId)}
                      formName={selectedForm.name}
                    />
                  ))}
                </div>

                {selectedForm?.name === "Low Insulation" && (
                  <div style={{ marginTop: 24, padding: 16, border: "1px dashed var(--blue)", borderRadius: 8, background: "#f8fafc" }}>
                    <h4 style={{ margin: "0 0 12px 0", color: "var(--blue)" }}>Megger Quad Readings (Signaling/Block)</h4>
                    <div style={{ overflowX: "auto" }}>
                      <table className="data-table" style={{ width: "100%", marginBottom: 12 }}>
                        <thead>
                          <tr>
                            <th>Quad No</th>
                            <th>Loop Res.</th>
                            <th>Ins. L1-E</th>
                            <th>Ins. L2-E</th>
                            <th>Ins. L1-L2</th>
                            <th>DB Loss</th>
                            {canFill && !(isCompletedToday && !editingRecordId) && <th>Action</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {quadReadings.map((q, idx) => (
                            <tr key={idx}>
                              <td>
                                <input
                                  required
                                  placeholder="e.g. 1"
                                  disabled={!canFill || (isCompletedToday && !editingRecordId)}
                                  value={q.quadNo || ""}
                                  onChange={e => {
                                    const next = [...quadReadings];
                                    next[idx].quadNo = e.target.value;
                                    setQuadReadings(next);
                                  }}
                                  style={{ width: "100%", padding: "4px 8px", border: "1px solid var(--line)", borderRadius: 4 }}
                                />
                              </td>
                              <td>
                                <input
                                  placeholder="e.g. 50"
                                  disabled={!canFill || (isCompletedToday && !editingRecordId)}
                                  value={q.loopResistance || ""}
                                  onChange={e => {
                                    const next = [...quadReadings];
                                    next[idx].loopResistance = e.target.value;
                                    setQuadReadings(next);
                                  }}
                                  style={{ width: "100%", padding: "4px 8px", border: "1px solid var(--line)", borderRadius: 4 }}
                                />
                              </td>
                              <td>
                                <input
                                  placeholder="e.g. >100M"
                                  disabled={!canFill || (isCompletedToday && !editingRecordId)}
                                  value={q.insulationL1E || ""}
                                  onChange={e => {
                                    const next = [...quadReadings];
                                    next[idx].insulationL1E = e.target.value;
                                    setQuadReadings(next);
                                  }}
                                  style={{ width: "100%", padding: "4px 8px", border: "1px solid var(--line)", borderRadius: 4 }}
                                />
                              </td>
                              <td>
                                <input
                                  placeholder="e.g. >100M"
                                  disabled={!canFill || (isCompletedToday && !editingRecordId)}
                                  value={q.insulationL2E || ""}
                                  onChange={e => {
                                    const next = [...quadReadings];
                                    next[idx].insulationL2E = e.target.value;
                                    setQuadReadings(next);
                                  }}
                                  style={{ width: "100%", padding: "4px 8px", border: "1px solid var(--line)", borderRadius: 4 }}
                                />
                              </td>
                              <td>
                                <input
                                  placeholder="e.g. >100M"
                                  disabled={!canFill || (isCompletedToday && !editingRecordId)}
                                  value={q.insulationL1L2 || ""}
                                  onChange={e => {
                                    const next = [...quadReadings];
                                    next[idx].insulationL1L2 = e.target.value;
                                    setQuadReadings(next);
                                  }}
                                  style={{ width: "100%", padding: "4px 8px", border: "1px solid var(--line)", borderRadius: 4 }}
                                />
                              </td>
                              <td>
                                <input
                                  placeholder="e.g. 2.5dB"
                                  disabled={!canFill || (isCompletedToday && !editingRecordId)}
                                  value={q.dbLoss || ""}
                                  onChange={e => {
                                    const next = [...quadReadings];
                                    next[idx].dbLoss = e.target.value;
                                    setQuadReadings(next);
                                  }}
                                  style={{ width: "100%", padding: "4px 8px", border: "1px solid var(--line)", borderRadius: 4 }}
                                />
                              </td>
                              {canFill && !(isCompletedToday && !editingRecordId) && (
                                <td>
                                  <button
                                    type="button"
                                    onClick={() => setQuadReadings(prev => prev.filter((_, i) => i !== idx))}
                                    className="action-btn text-red"
                                    style={{ padding: "4px" }}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                          {quadReadings.length === 0 && (
                            <tr>
                              <td colSpan={canFill && !(isCompletedToday && !editingRecordId) ? 7 : 6} style={{ textAlign: "center", color: "#64748b", padding: 8 }}>
                                No readings added yet. Click "Add Quad Reading" below.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    {canFill && !(isCompletedToday && !editingRecordId) && (
                      <button
                        type="button"
                        onClick={() => setQuadReadings(prev => [...prev, { quadNo: "", loopResistance: "", insulationL1E: "", insulationL2E: "", insulationL1L2: "", dbLoss: "" }])}
                        className="export-button"
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", fontSize: 13 }}
                      >
                        <Plus size={14} /> Add Quad Reading
                      </button>
                    )}
                  </div>
                )}

                {canFill && !(selectedForm?.name === "Walkie-Talkie Testing" && walkieTalkieMode === "testing") && (
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px", marginBottom: "16px" }}>
                    <button
                      type="button"
                      className="export-button"
                      onClick={handleAddRecord}
                      disabled={isCompletedToday || !!editingRecordId || isAddingRecord}
                      style={{
                        cursor: (isCompletedToday || editingRecordId || isAddingRecord) ? "not-allowed" : "pointer"
                      }}
                    >
                      {isAddingRecord ? (
                        <>
                          <span className="dp-btn-loader" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus size={16} />
                          Add Record
                        </>
                      )}
                    </button>
                  </div>
                )}

                {!(selectedForm?.name === "Walkie-Talkie Testing" && walkieTalkieMode === "testing") && (
                  <section className="dp-recent-form-records">
                    <div className="dp-recent-header">
                      <h3>Recent Submitted Records</h3>
                      <span>{selectedForm.name}</span>
                    </div>
                    <div className="table-scroll-container">
                      <table className="data-table dp-recent-table">
                        <thead>
                          <tr>
                            {activeFields.filter(f => {
                              if (f.name === "cableCutByWhomOther") return false;
                              
                              // If the current record set has no technical fields filled, we can dynamically simplify columns
                              const hasAnyTechnicalFilled = currentFormRecords.some((r: any) => 
                                r.formData?.makeModel || r.formData?.serialNo || r.formData?.powerOutput || r.formData?.batteryVoltage
                              );
                              
                              if (selectedForm.name === "Walkie-Talkie Testing" && !hasAnyTechnicalFilled) {
                                const techFields = ["makeModel", "serialNo", "powerOutput", "batteryVoltage", "batteryCurrent", "antennaStatus", "toBeTestedCount", "balanceWalkieTalkies"];
                                return !techFields.includes(f.name);
                              }
                              
                              return true;
                            }).map(field => (
                              <th key={field.name}>{field.label}</th>
                            ))}
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentFormRecords.map((record: any) => (
                            <tr
                              key={record.id}
                              onClick={() => {
                                const isDraft = record.status === "DRAFT";
                                if (isDraft || role === "SUPER_ADMIN") {
                                  startEdit(record);
                                }
                              }}
                              style={{ 
                                cursor: (record.status === "DRAFT" || role === "SUPER_ADMIN") ? "pointer" : "default" 
                              }}
                              title={
                                record.status === "DRAFT" 
                                  ? "Click to edit draft" 
                                  : (role === "SUPER_ADMIN" ? "Click to edit record" : "")
                              }
                              className="dp-recent-row"
                            >
                              {activeFields.filter(f => {
                                if (f.name === "cableCutByWhomOther") return false;
                                
                                const hasAnyTechnicalFilled = currentFormRecords.some((r: any) => 
                                  r.formData?.makeModel || r.formData?.serialNo || r.formData?.powerOutput || r.formData?.batteryVoltage
                                );
                                
                                if (selectedForm.name === "Walkie-Talkie Testing" && !hasAnyTechnicalFilled) {
                                  const techFields = ["makeModel", "serialNo", "powerOutput", "batteryVoltage", "batteryCurrent", "antennaStatus", "toBeTestedCount", "balanceWalkieTalkies"];
                                  return !techFields.includes(f.name);
                                }
                                
                                return true;
                              }).map(field => {
                                let val = record.formData?.[field.name];
                                if (val === "Other" || val === "Others") {
                                  val = record.formData?.[`${field.name}Other`] || record.formData?.[`${field.name}Others`] || val;
                                }
                                if (val === undefined) {
                                  if (field.name === "majorSection") val = record.majorSection;
                                  else if (field.name === "section") val = record.section;
                                  else if (field.name === "stationCode") val = record.stationCode || record.stationName;
                                  else if (field.name === "assetId") val = recordAssetLabel(record, metadata);
                                  else if (field.name === "failureTime") val = record.failureTime ? formatDateTime24(record.failureTime) : "";
                                  else if (field.name === "rectificationTime") val = record.rectificationTime ? formatDateTime24(record.rectificationTime) : "";
                                  else if (field.name === "durationText") val = record.durationText;
                                  else if (field.name === "reason") val = record.reason;
                                  else if (field.name === "remarks") val = record.remarks;
                                }
                                if (field.type === "datetime-local" && val) {
                                  try {
                                    val = formatDateTime24(val);
                                  } catch (e) {}
                                }
                                const isRectificationCell = field.name === "rectificationTime";
                                const isSubmitted = record.status !== "DRAFT";
                                const isStandardUser = role !== "SUPER_ADMIN";
                                const isAllOk = record.reason === "All OK" || (record.formData && record.formData.actionType === "OK");
                                const isAlreadyRectified = !!record.rectificationTime;
                                
                                const handleCellClick = (e: React.MouseEvent) => {
                                  if (isRectificationCell && isSubmitted && isStandardUser && !isAllOk && !isAlreadyRectified) {
                                    e.stopPropagation();
                                    setRectifyingRecord(record);
                                    setRectificationTimeInput(formatDateTimeInput(record.rectificationTime) || "");
                                  }
                                };

                                return (
                                  <td 
                                    key={field.name}
                                    onClick={handleCellClick}
                                    style={{
                                      cursor: (isRectificationCell && isSubmitted && isStandardUser && !isAllOk && !isAlreadyRectified) ? "pointer" : "inherit",
                                      backgroundColor: (isRectificationCell && isSubmitted && isStandardUser && !isAllOk && !isAlreadyRectified) ? "rgba(16, 185, 129, 0.05)" : "transparent"
                                    }}
                                    title={
                                      (isRectificationCell && isSubmitted && isStandardUser && !isAllOk && !isAlreadyRectified)
                                        ? "Click to rectify fault"
                                        : undefined
                                    }
                                  >
                                    {val !== undefined && val !== null && val !== "" ? String(val) : (isAllOk ? "" : "-")}
                                  </td>
                                );
                              })}
                              <td>
                                {record.status === "DRAFT" ? (
                                  <span style={{
                                    background: "#fffbeb",
                                    color: "#d97706",
                                    border: "1px solid #fde68a",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    display: "inline-block",
                                    textTransform: "uppercase"
                                  }}>Draft</span>
                                ) : (() => {
                                  const isOk = record.status === "All Ok" || record.status === "RECTIFIED" || record.reason === "All OK" || (record.formData && record.formData.actionType === "OK");
                                  return (
                                    <span style={{
                                      background: isOk ? "#ecfdf5" : "#fef2f2",
                                      color: isOk ? "#059669" : "#dc2626",
                                      border: `1px solid ${isOk ? "#a7f3d0" : "#fecaca"}`,
                                      padding: "2px 6px",
                                      borderRadius: "4px",
                                      fontSize: "11px",
                                      fontWeight: 700,
                                      display: "inline-block",
                                      textTransform: "uppercase"
                                    }}>
                                      Submitted
                                    </span>
                                  );
                                })()}
                              </td>
                              <td onClick={e => e.stopPropagation()}>
                                {record.status === "DRAFT" ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteDraft(record.id);
                                    }}
                                    style={{
                                      background: "transparent",
                                      border: "none",
                                      color: "#ef4444",
                                      cursor: "pointer",
                                      padding: "4px",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      borderRadius: "4px"
                                    }}
                                    title="Delete Draft"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                ) : (
                                  "-"
                                )}
                              </td>
                            </tr>
                          ))}
                          {currentFormRecords.length === 0 && (
                            <tr>
                              <td colSpan={activeFields.length + 2} style={{ textAlign: "center", color: "var(--muted)", padding: 18 }}>No records submitted for this form today.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}
              </div>

              {canFill && (
                <div className="dp-form-actions">
                  {editingRecordId && (
                    <button
                      className="export-button"
                      type="button"
                      style={{ background: "transparent", color: "var(--muted)", borderColor: "var(--line)", marginRight: "auto" }}
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </button>
                  )}
                  {!editingRecordId && !(selectedForm?.name === "Walkie-Talkie Testing" && walkieTalkieMode === "testing") && (() => {
                    const draftsCount = records.filter((r: any) => r.formType === selectedForm?.name && r.status === "DRAFT").length;
                    const hasDrafts = draftsCount > 0;
                    const isCurrentFormEmpty = isFormEmpty();
                    const isOkButtonDisabled = isSubmittingAllOk || createRecord.isPending || (isCompletedToday && !editingRecordId) || hasDrafts || !isCurrentFormEmpty;
                    
                    return (
                      <button 
                        className="export-button ok-button" 
                        type="button" 
                        onClick={handleOk} 
                        disabled={isOkButtonDisabled}
                        onMouseEnter={() => setIsOkHovered(true)}
                        onMouseLeave={() => setIsOkHovered(false)}
                        style={{
                          opacity: isOkButtonDisabled ? 0.6 : 1,
                          cursor: isOkButtonDisabled ? "not-allowed" : "pointer",
                          transition: "all 0.2s ease-in-out",
                        }}
                      >
                        {isSubmittingAllOk ? (
                          <>
                            <span className="dp-btn-loader" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            {isOkButtonDisabled ? (
                              <Ban size={16} />
                            ) : (
                              <CheckCircle2 size={16} />
                            )}
                            ALL OK
                          </>
                        )}
                      </button>
                    );
                  })()}
                  {editingRecordId && (
                    <button 
                      className="export-button" 
                      type="submit" 
                      disabled={isSavingDraft || createRecord.isPending || updateRecord.isPending}
                    >
                      {isSavingDraft ? (
                        <>
                          <span className="dp-btn-loader" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Send size={16} />
                          Update Daily Position
                        </>
                      )}
                    </button>
                  )}
                  {!editingRecordId && (() => {
                    const draftsCount = records.filter((r: any) => r.formType === selectedForm?.name && r.status === "DRAFT").length;
                    const hasNoDrafts = draftsCount === 0;
                    const isCurrentFormEmpty = isFormEmpty();
                    const isWtTestingBalanced = selectedForm?.name === "Walkie-Talkie Testing" && 
                      walkieTalkieMode === "testing" && 
                      Number(values.testedCount || 0) >= Number(values.toBeTestedCount || 0) && 
                      Number(values.toBeTestedCount || 0) > 0;
                    const isHtmlDisabled = isSavingAndNext || createRecord.isPending || updateRecord.isPending || (isCompletedToday && !editingRecordId) || isWtTestingBalanced;
                    const isSubmitDisabledStyle = isHtmlDisabled || (hasNoDrafts && isCurrentFormEmpty);
                    return (
                      <button 
                        className="export-button" 
                        type="button" 
                        onClick={handleSaveAndNext} 
                        disabled={isSubmitDisabledStyle}
                        style={{
                          opacity: isSubmitDisabledStyle ? 0.6 : 1,
                          cursor: isSubmitDisabledStyle ? "not-allowed" : "pointer",
                          transition: "all 0.2s ease-in-out"
                        }}
                      >
                        {isSavingAndNext ? (
                          <>
                            <span className="dp-btn-loader" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            {isSubmitDisabledStyle ? (
                              <Ban size={16} />
                            ) : (
                              <Send size={16} />
                            )}
                            Submit
                          </>
                        )}
                      </button>
                    );
                  })()}
                </div>
              )}
            </form>
          </main>
        </section>
      )}

      {viewMode === "history" && renderHistory()}

      {detailsRecord && (() => {
        const isAllOk = detailsRecord.reason === "All OK" || (detailsRecord.formData && detailsRecord.formData.actionType === "OK");
        return (
          <div className="modal-backdrop dp-modal-backdrop" onClick={() => setDetailsRecord(null)}>
            <div className="modal-card dp-details-modal" onClick={event => event.stopPropagation()}>
              <button className="modal-close" type="button" onClick={() => setDetailsRecord(null)} aria-label="Close">
                <X size={16} />
              </button>
              <div className="dp-details-header">
                <div>
                  <span>Daily Position Record</span>
                  <h2>{detailsRecord.formType}</h2>
                  <p>{detailsRecord.division} / {detailsRecord.stationCode || detailsRecord.stationName || detailsRecord.section || (isAllOk ? "" : "-")}</p>
                </div>
                <em className={`status-chip status-${isAllOk ? "All Ok" : String(detailsRecord.status || "").toLowerCase()}`}>
                  {isAllOk ? "All Ok" : detailsRecord.status}
                </em>
              </div>

              <div className="dp-details-summary">
                {[
                  ["Category", detailsRecord.category],
                  ["Action", detailsRecord.formData?.actionType || (isAllOk || detailsRecord.status === "All Ok" ? "OK" : "FAULT")],
                  ["Submitted", detailsRecord.date ? formatDate24(detailsRecord.date) : (isAllOk ? "" : "-")],
                ].map(([label, value]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>

              {/* Location Details (Priority 1) */}
              {(() => {
                const locationKeys = ["majorSection", "section", "stationCode", "stationCodeOther", "exchangeName", "videoPhoneLocation", "pfNo", "lineNo", "unitNo", "location", "siteName"];
                const locationItems = Object.entries(detailsRecord.formData || {})
                  .filter(([key]) => locationKeys.includes(key))
                  .map(([key, value]) => {
                    let displayVal = value;
                    if (value === "Other" || value === "Others") {
                      displayVal = detailsRecord.formData?.[`${key}Other`] || detailsRecord.formData?.[`${key}Others`] || value;
                    }
                    return {
                      key,
                      label: humanizeFieldName(key, detailsRecord.formType),
                      value: displayValue(displayVal, isAllOk)
                    };
                  });

                if (locationItems.length === 0) return null;
                return (
                  <section className="dp-details-section" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px 14px", marginTop: "12px" }}>
                    <h3 style={{ margin: "0 0 8px 0", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--muted)" }}>Location Details</h3>
                    <div className="dp-details-grid">
                      {locationItems.map(item => (
                        <div key={item.key}>
                          <span>{item.label}</span>
                          <strong style={{ fontWeight: 650 }}>{item.value}</strong>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })()}

              {/* Reason & Remarks Section (Priority 2) */}
              <section className="dp-details-section" style={{ marginTop: "12px" }}>
                <h3 style={{ margin: "0 0 6px 0", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--muted)" }}>Reason / Failures details</h3>
                <div style={{ fontSize: "12px", color: "var(--navy)", lineHeight: "1.5", background: isAllOk ? "rgba(34, 197, 94, 0.02)" : "rgba(239, 68, 68, 0.02)", padding: "10px 12px", borderRadius: "6px", border: isAllOk ? "1px solid rgba(34, 197, 94, 0.08)" : "1px solid rgba(239, 68, 68, 0.08)" }}>
                  <strong style={{ fontWeight: 500 }}>
                    {isAllOk ? (detailsRecord.remarks || detailsRecord.reason || "System All Ok") : (
                      <>
                        {detailsRecord.reason || detailsRecord.remarks || "No reason specified"}
                        {detailsRecord.remarks && detailsRecord.remarks.trim() !== (detailsRecord.reason || "").trim() && ` · ${detailsRecord.remarks}`}
                      </>
                    )}
                  </strong>
                </div>
              </section>

              {/* Fault Timing (Priority 3) */}
              {!isAllOk && (detailsRecord.failureTime || detailsRecord.rectificationTime) && (
                <section className="dp-details-section" style={{ marginTop: "12px" }}>
                  <h3>Fault Timing</h3>
                  <div className="dp-details-grid">
                    {[
                      ["Failure Time", detailsRecord.failureTime ? formatDateTime24(detailsRecord.failureTime) : "-"],
                      ["Rectification Time", detailsRecord.rectificationTime ? formatDateTime24(detailsRecord.rectificationTime) : "-"],
                      ["Duration of Failure", detailsRecord.durationText || "-"],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <span>{label}</span>
                        <strong>{value}</strong>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Submitted Form Fields (Priority 4 - excluding locationKeys) */}
              {(() => {
                const locationKeys = ["majorSection", "section", "stationCode", "stationCodeOther", "exchangeName", "videoPhoneLocation", "pfNo", "lineNo", "unitNo", "location", "siteName"];
                const formFieldItems = Object.entries(detailsRecord.formData || {})
                  .filter(([key]) => {
                    if (key === "actionType" || key === "checkedAt" || key === "maintenanceType") return false;
                    if (key === "failureTime" || key === "rectificationTime" || key === "reason" || key === "remarks") return false;
                    if (key.endsWith("Other") || key.endsWith("Others")) return false;
                    if (locationKeys.includes(key)) return false;
                    return true;
                  })
                  .map(([key, value]) => {
                    let displayVal = value;
                    if (value === "Other" || value === "Others") {
                      displayVal = detailsRecord.formData?.[`${key}Other`] || detailsRecord.formData?.[`${key}Others`] || value;
                    }
                    return {
                      key,
                      label: humanizeFieldName(key, detailsRecord.formType),
                      value: displayValue(displayVal, isAllOk)
                    };
                  });

                return (
                  <section className="dp-details-section" style={{ marginTop: "12px", paddingBottom: "16px" }}>
                    <h3>Submitted Form Fields</h3>
                    <div className="dp-details-grid">
                      {formFieldItems.map(item => (
                        <div key={item.key}>
                          <span>{item.label}</span>
                          <strong>{item.value}</strong>
                        </div>
                      ))}
                      {formFieldItems.length === 0 && (
                        <div>
                          <span>Form Data</span>
                          <strong>No additional fields submitted.</strong>
                        </div>
                      )}
                    </div>
                  </section>
                );
              })()}

              {/* Footer Metadata */}
              <div style={{
                borderTop: "1px solid #e2e8f0",
                padding: "12px 24px",
                margin: "12px -24px -24px -24px",
                background: "#f8fafc",
                display: "flex",
                justifyContent: "flex-start",
                fontSize: "11.5px",
                color: "#64748b",
                borderRadius: "0 0 12px 12px"
              }}>
                <span>
                  Submitted by: <strong style={{ color: "#1e293b", fontWeight: 700 }}>{detailsRecord.createdBy?.name || detailsRecord.createdByUsername || "System User"}</strong> 
                  {detailsRecord.createdBy?.designation ? ` (${detailsRecord.createdBy.designation})` : ""}{detailsRecord.createdBy?.mobile ? ` [${detailsRecord.createdBy.mobile}]` : ""} at <strong style={{ color: "#1e293b", fontWeight: 700 }}>{detailsRecord.createdAt ? formatDateTime24(detailsRecord.createdAt) : (detailsRecord.date ? formatDate24(detailsRecord.date) : "-")}</strong>
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {rectifyingRecord && (
        <div className="modal-backdrop dp-modal-backdrop" onClick={() => setRectifyingRecord(null)}>
          <div className="modal-card" onClick={event => event.stopPropagation()} style={{ width: "min(460px, 95vw)", padding: "24px" }}>
            <button className="modal-close" type="button" onClick={() => setRectifyingRecord(null)} aria-label="Close">
              <X size={16} />
            </button>
            <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: "600", color: "#1e293b" }}>Rectify Fault</h3>
            <p style={{ margin: "0 0 20px 0", fontSize: "14px", color: "#64748b" }}>
              Update the rectification date and time for <strong>{rectifyingRecord.formType === "Exchange" && rectifyingRecord.formData?.exchangeName ? rectifyingRecord.formData.exchangeName : rectifyingRecord.formType}</strong> at <strong>{rectifyingRecord.stationCode || rectifyingRecord.stationName || rectifyingRecord.section || "-"}</strong>.
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

              updateRecord.mutate({
                id: rectifyingRecord.id,
                body: {
                  ...rectifyingRecord,
                  rectificationTime: rectificationTimeInput,
                  formData: updatedFormData,
                }
              }, {
                onSuccess: () => {
                  setRectifyingRecord(null);
                }
              });
            }}>
              <div className="dp-field" style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>
                  Rectification Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={rectificationTimeInput}
                  max={toLocalDateTimeValue(new Date())}
                  onChange={(e) => setRectificationTimeInput(e.target.value)}
                  onClick={(e) => { try { e.currentTarget.showPicker(); } catch (err) {} }}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "14px",
                    cursor: "pointer"
                  }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setRectifyingRecord(null)}
                  className="export-button"
                  style={{ background: "transparent", color: "#64748b", borderColor: "#e2e8f0" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="export-button"
                  disabled={updateRecord.isPending}
                >
                  {updateRecord.isPending ? "Submitting..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {successModal && (
        <>
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes scaleIn {
              from { transform: scale(0.95); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
          `}</style>
          <div
            className="modal-backdrop"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              backgroundColor: "rgba(15, 23, 42, 0.4)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 999999,
              animation: "fadeIn 0.2s ease-out"
            }}
          >
            <div
              className="modal-card"
              style={{
                background: "#ffffff",
                padding: "32px 24px",
                borderRadius: "16px",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                maxWidth: "360px",
                width: "90%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                gap: "20px",
                border: "1px solid #e2e8f0",
                animation: "scaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)"
              }}
            >
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "#f0fdf4",
                  border: "4px solid #dcfce7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#16a34a",
                  fontSize: "28px",
                  fontWeight: "bold",
                  boxShadow: "0 4px 10px rgba(22, 163, 74, 0.15)"
                }}
              >
                Γ£ô
              </div>
              <div style={{ margin: 0 }}>
                {successModal.message}
              </div>
              <button
                type="button"
                className="export-button"
                onClick={successModal.onOk}
                style={{
                  marginTop: "4px",
                  minWidth: "110px",
                  justifyContent: "center",
                  background: "#1e3a8a",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: "600",
                  fontSize: "14px",
                  padding: "10px 24px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  boxShadow: "0 4px 6px -1px rgba(30, 58, 138, 0.2)"
                }}
              >
                OK
              </button>
            </div>
          </div>
        </>
      )}
    </article>
  );
}

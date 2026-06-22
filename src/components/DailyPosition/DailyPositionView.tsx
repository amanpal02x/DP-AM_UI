import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Edit, Eye, Send, Trash2 } from "lucide-react";
import { api } from "../../api/apiClient";
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

const toDateValue = (date = new Date()) => {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
};

const toLocalDateTimeValue = (date = new Date()) => {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
};

const formatDateTimeInput = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : toLocalDateTimeValue(date);
};

const calcDurationText = (failureTime?: string, rectificationTime?: string) => {
  if (!failureTime || !rectificationTime) return "";
  const start = new Date(failureTime);
  const end = new Date(rectificationTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return "";
  const minutes = Math.floor((end.getTime() - start.getTime()) / 60000);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
};

const statusFromForm = (form: DailyPositionFormDefinition, values: Record<string, any>) => {
  if (form.statusMode === "log") {
    if (!values.rectificationTime) return "FAULTY";
    return "OPERATIONAL";
  }
  if (form.statusMode === "maintenance") {
    if (values.balanceTemporaryJoints !== undefined) {
      return Number(values.balanceTemporaryJoints) > 0 ? "UNDER_MAINTENANCE" : "OPERATIONAL";
    }
    if (values.balanceInsulationFaults !== undefined) {
      return Number(values.balanceInsulationFaults) > 0 ? "UNDER_MAINTENANCE" : "OPERATIONAL";
    }
    if (values.balanceWalkieTalkies !== undefined) {
      return Number(values.balanceWalkieTalkies) > 0 ? "UNDER_MAINTENANCE" : "OPERATIONAL";
    }
    if (values.pendingRepair !== undefined) {
      return Number(values.pendingRepair) > 0 ? "UNDER_MAINTENANCE" : "OPERATIONAL";
    }
    const pending = Number(values.temporaryJointsCount || values.totalInsulationFaults || values.defectiveSets || 0);
    const done = Number(values.rectifiedJoints || values.rectifiedFaults || values.repairedSets || 0);
    return pending > done ? "UNDER_MAINTENANCE" : "OPERATIONAL";
  }
  if (values.failureTime && !values.rectificationTime) return "FAULTY";
  if (values.failureTime && values.rectificationTime) return "RECTIFIED";
  if (!values.rectificationTime) return "FAULTY";
  return "OPERATIONAL";
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

const humanizeFieldName = (key: string) => {
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

const displayValue = (value: any) => {
  if (value === undefined || value === null || value === "") return "-";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
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
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }} onClick={e => e.stopPropagation()}>
          {value && !readOnly && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
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
          <span style={{ fontSize: "10px", color: "#64748b" }}>▼</span>
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

function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder,
  required,
  readOnly,
}: {
  options: Array<string | { value: string; label: string }>;
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
          marginRight: value && !readOnly ? "24px" : "0px",
          color: value ? (readOnly ? "#64748b" : "#1e293b") : "#94a3b8"
        }}>
          {selectedOpt ? selectedOpt.label : placeholder}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }} onClick={e => e.stopPropagation()}>
          {value && !readOnly && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
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
          <span style={{ fontSize: "10px", color: "#64748b" }}>▼</span>
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

function DailyPositionFieldInput({
  field,
  value,
  values,
  setValue,
  metadata,
  selectedDivision,
  readOnly,
}: {
  field: DailyPositionField;
  value: any;
  values: Record<string, any>;
  setValue: (name: string, value: any) => void;
  metadata: any;
  selectedDivision: string;
  readOnly: boolean;
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
            <span style={{ fontSize: "10px", color: "#64748b", marginLeft: "8px" }}>▼</span>
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
    const REASON_OPTIONS = [
      "Cable Cut",
      "Link Failure",
      "Equipment Failure (STM / MUX)",
      "Mux Card",
      "Power Supply"
    ];

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
            <span style={{ fontSize: "10px", color: "#64748b", marginLeft: "8px" }}>▼</span>
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
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
          <input
            type="file"
            id="file-upload"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setValue(field.name, file.name);
              }
            }}
          />
          <label
            htmlFor="file-upload"
            className="export-button"
            style={{
              cursor: "pointer",
              background: "#f8fafc",
              color: "#334155",
              borderColor: "#cbd5e1",
              margin: 0,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              fontSize: "13px",
              border: "1px solid #cbd5e1",
              borderRadius: "4px"
            }}
          >
            Choose File
          </label>
          <span style={{ fontSize: "13px", color: "var(--muted)" }}>
            {value || "No file attached"}
          </span>
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
    const balance = Math.max(0, total - tested);
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
  }

  return (
    <div className={`dp-field ${field.fullWidth ? "full" : ""}`}>
      <label>
        {field.label}
        {field.type === "datetime-local" && field.name !== "lastTestingTime" && (
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
          <input type={field.type} {...maxProps} {...commonProps} />
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
      {time.toLocaleDateString(undefined, {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      })}{" "}
      | {time.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
    </p>
  );
};

export default function DailyPositionView({ role, division, user, mode, showToast }: DailyPositionViewProps) {
  const queryClient = useQueryClient();
  const canFill = role === "TESTROOM";
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
    setDpHistoryFilter,
    dpHistoryCategoryFilter: historyCategory,
    setDpHistoryCategoryFilter: setHistoryCategory
  } = useAppStore();

  const [localViewMode, setLocalViewMode] = useState<"form" | "history" | null>(null);
  const viewMode = localViewMode || mode || (canFill ? "form" : "history");
  const canChooseDivision = role === "SUPER_ADMIN";

  const [selectedDivision, setSelectedDivision] = useState(role === "SUPER_ADMIN" ? "" : (division || ""));
  const [selectedDate, setSelectedDate] = useState(toDateValue());
  const [values, setValues] = useState<Record<string, any>>({});
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [detailsRecord, setDetailsRecord] = useState<any | null>(null);
  const [maintenanceType, setMaintenanceType] = useState<"Divisional" | "HQ">("Divisional");
  const [shouldNavigateToNext, setShouldNavigateToNext] = useState(false);
  const [rectifyingRecord, setRectifyingRecord] = useState<any | null>(null);
  const [rectificationTimeInput, setRectificationTimeInput] = useState("");
  const [successModal, setSuccessModal] = useState<{ message: React.ReactNode; onOk: () => void } | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSavingAndNext, setIsSavingAndNext] = useState(false);
  const [isSubmittingAllOk, setIsSubmittingAllOk] = useState(false);

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
    return activeFields.filter(field => {
      if (field.name === "cpmsNo") {
        return values.cpmsEntry === "YES";
      }
      if (field.name === "cableCutByWhomOther") {
        return values.cableCutByWhom === "Other";
      }
      if (field.name === "natureOfFaultOther") {
        return values.natureOfFault === "Other";
      }
      return true;
    });
  }, [activeFields, values.cpmsEntry, values.cableCutByWhom, values.natureOfFault]);

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

  const metadataQuery = useQuery({
    queryKey: ["daily-position-metadata", selectedDivision],
    queryFn: () => api.dailyPosition.metadata(selectedDivision ? { division: selectedDivision } : {}),
  });

  const recordsQuery = useQuery({
    queryKey: ["daily-position-records", selectedDivision, selectedDate, dpHistoryFilter],
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
        params.date = selectedDate;
      }
      return api.dailyPosition.list(params);
    },
  });

  const createRecord = useMutation({
    mutationFn: (body: any) => api.dailyPosition.create(body),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["daily-position-records"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dp-summary-table"] });
      
      const isAllOk = variables?.formData?.actionType === "OK";
      const isSaveAndNext = shouldNavigateToNext;
      
      let actionMsg: React.ReactNode = null;
      if (isAllOk) {
        actionMsg = <div style={{ fontSize: "16px", fontWeight: "600", color: "#0f172a" }}>Status Updated Successfully</div>;
      } else if (isSaveAndNext) {
        actionMsg = (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ fontSize: "16px", fontWeight: "600", color: "#0f172a" }}>Record Saved Successfully</div>
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
          if (isSaveAndNext) {
            setShouldNavigateToNext(false);
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
    return [...rawRecords].sort((a: any, b: any) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : (a.failureTime ? new Date(a.failureTime).getTime() : 0);
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : (b.failureTime ? new Date(b.failureTime).getTime() : 0);
      if (aTime !== bTime) {
        return aTime - bTime;
      }
      return String(a.id || "").localeCompare(String(b.id || ""));
    });
  }, [recordsQuery.data?.data]);

  const isCompletedToday = useMemo(() => {
    const hasLocalCompletion = completedFormsLocal.includes(selectedForm?.name);
    const hasServerCompletion = records.some(
      (r: any) => r.formType === selectedForm?.name && r.status !== "DRAFT"
    );
    return hasLocalCompletion || hasServerCompletion;
  }, [completedFormsLocal, records, selectedForm?.name]);

  const isFormEmpty = () => {
    return !visibleActiveFields.some(field => {
      if (field.name === "maintenanceType") return false;
      return !!values[field.name];
    });
  };

  const [historySearch, setHistorySearch] = useState("");
  const [historyDivision, setHistoryDivision] = useState("");
  const [historyFormType, setHistoryFormType] = useState("");
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
      if (historyDivision && r.division !== historyDivision) return false;
      if (historyCategory && r.category !== historyCategory) return false;
      if (historyFormType && r.formType !== historyFormType) return false;
      if (historyStatus && r.status !== historyStatus) return false;
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
  }, [records, historySearch, historyDivision, historyCategory, historyFormType, historyStatus]);
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

      if (name === "toBeTestedCount" || name === "testedCount") {
        const total = Number(next.toBeTestedCount || 0);
        const tested = Number(next.testedCount || 0);
        next.balanceWalkieTalkies = Math.max(0, total - tested);
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

      if (name === "cpmsEntry" && nextValue !== "YES") {
        next.cpmsNo = "";
      }

      if (name === "cableCutByWhom" && nextValue !== "Other") {
        next.cableCutByWhomOther = "";
      }

      if (name === "natureOfFault" && nextValue !== "Other") {
        next.natureOfFaultOther = "";
      }

      return next;
    });
  };

  const buildPayload = (actionType: "OK" | "FAULT" | "DRAFT" = "FAULT") => {
    const station = metadata?.stations?.find((item: any) => item.code === values.stationCode);
    const isOk = actionType === "OK";
    const isDraft = actionType === "DRAFT";
    const editingRecord = editingRecordId ? records.find((r: any) => r.id === editingRecordId) : null;
    return {
      division: selectedDivision,
      category: selectedForm.category,
      formType: selectedForm.name,
      systemCode: selectedForm.systemCode,
      majorSection: values.majorSection || null,
      section: values.section || null,
      stationCode: values.stationCode || null,
      stationName: values.stationCode === "Others" ? (values.stationCodeOther || "Others") : (station?.name || null),
      assetId: values.assetId || null,
      telecomAsset: selectedForm.name,
      status: isDraft ? "DRAFT" : (isOk ? "OPERATIONAL" : statusFromForm(selectedForm, values)),
      failureTime: isOk ? null : (values.failureTime || null),
      rectificationTime: isOk ? null : (values.rectificationTime || null),
      durationText: isOk ? null : calcDurationText(values.failureTime, values.rectificationTime),
      reason: isOk ? "All OK" : (values.reason || null),
      remarks: isOk ? (values.remarks || "No fault reported.") : (values.remarks || null),
      date: editingRecord ? (editingRecord.date || selectedDate) : selectedDate,
      formData: {
        ...values,
        actionType,
        checkedAt: new Date().toISOString(),
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

    setIsSavingDraft(true);
    if (editingRecordId) {
      const editingRecord = records.find((r: any) => r.id === editingRecordId);
      const isEditingDraft = editingRecord && editingRecord.status === "DRAFT";
      updateRecord.mutate({ 
        id: editingRecordId, 
        body: buildPayload(isEditingDraft ? "DRAFT" : "FAULT") 
      });
      return;
    }
    createRecord.mutate(buildPayload("DRAFT"));
  };

  const handleOk = () => {
    if (!canFill || !selectedForm) return;
    setIsSubmittingAllOk(true);
    createRecord.mutate(buildPayload("OK"));
    markFormCompleted(selectedForm.name);
  };

  const handleDeleteDraft = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this draft?")) return;
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

    setIsSavingAndNext(true);
    try {
      const drafts = records.filter(r => r.formType === selectedForm.name && r.status === "DRAFT");
      const isEmpty = isFormEmpty();

      if (!isEmpty) {
        // Validate current form fields (visible fields only)
        for (const field of visibleActiveFields) {
          if (field.required && !values[field.name]) {
            showToast(`Please fill in all required fields, or click Save to add as draft.`);
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

        // Save current form values as draft first
        try {
          const payload = buildPayload("DRAFT");
          const res = await api.dailyPosition.create(payload);
          drafts.push(res.data);
        } catch (err: any) {
          showToast(err.message || "Failed to save draft.");
          setIsSavingAndNext(false);
          return;
        }
      }

      if (drafts.length === 0) {
        // No drafts & empty form -> Submit as All OK
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
        // Submit all saved drafts by updating their status to final status
        try {
          const promises = drafts.map((draft: any) => {
            const finalStatus = statusFromForm(selectedForm, draft.formData || {});
            return api.dailyPosition.update(draft.id, {
              ...draft,
              status: finalStatus
            });
          });
          await Promise.all(promises);
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
    } else {
      setValues({});
    }
    setEditingRecordId(null);
  };

  const currentFormRecords = records
    .filter((record: any) => record.formType === selectedForm?.name)
    .slice(0, 8);

  const renderHistory = () => (
    <section className="dp-history-panel">
      <div className="dp-history-filters" style={{ display: "flex", gap: "12px", flexWrap: "wrap", padding: "12px 16px", background: "#f8fafc", borderRadius: "8px", marginBottom: "16px", border: "1px solid #e2e8f0", alignItems: "flex-end" }}>
        <div style={{ flex: "1 1 180px" }}>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>Filter Type</label>
          <select
            value={dpHistoryFilter}
            onChange={event => setDpHistoryFilter(event.target.value as any)}
            style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", background: "#fff" }}
          >
            <option value="date">Filter by Date</option>
            <option value="active-faults">Active/Pending Faults Only</option>
            <option value="resolved-faults">Resolved Faults Only</option>
          </select>
        </div>
        <div style={{ flex: "1 1 200px" }}>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>Search Station, Remarks, Section...</label>
          <input 
            type="text" 
            placeholder="Search..." 
            value={historySearch} 
            onChange={e => setHistorySearch(e.target.value)} 
            style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px" }}
          />
        </div>
        {role === "SUPER_ADMIN" && (
          <div style={{ flex: "1 1 150px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>Division</label>
            <select 
              value={historyDivision} 
              onChange={e => setHistoryDivision(e.target.value)}
              style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", background: "#fff" }}
            >
              <option value="">All Divisions</option>
              <option value="Bilaspur">Bilaspur</option>
              <option value="Raipur">Raipur</option>
              <option value="Nagpur">Nagpur</option>
            </select>
          </div>
        )}
        <div style={{ flex: "1 1 150px" }}>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>Category</label>
          <select 
            value={historyCategory} 
            onChange={e => setHistoryCategory(e.target.value)}
            style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", background: "#fff" }}
          >
            <option value="">All Categories</option>
            {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        <div style={{ flex: "1 1 150px" }}>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>Form Type</label>
          <select 
            value={historyFormType} 
            onChange={e => setHistoryFormType(e.target.value)}
            style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", background: "#fff" }}
          >
            <option value="">All Form Types</option>
            {uniqueFormTypes.map(ft => <option key={ft} value={ft}>{ft}</option>)}
          </select>
        </div>
        <div style={{ flex: "1 1 150px" }}>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>Status</label>
          <select 
            value={historyStatus} 
            onChange={e => setHistoryStatus(e.target.value)}
            style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", background: "#fff" }}
          >
            <option value="">All Statuses</option>
            {uniqueStatuses.map(st => <option key={st} value={st}>{st}</option>)}
          </select>
        </div>
        {(historySearch || historyDivision || historyCategory || historyFormType || historyStatus) && (
          <button 
            type="button" 
            onClick={() => {
              setHistorySearch("");
              setHistoryDivision("");
              setHistoryCategory("");
              setHistoryFormType("");
              setHistoryStatus("");
            }}
            className="action-btn text-red"
            style={{ height: "34px", padding: "0 12px", border: "1px solid #fca5a5", borderRadius: "6px", background: "#fef2f2", fontSize: "13px" }}
          >
            Clear Filters
          </button>
        )}
      </div>
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
              <th>Remarks</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredHistoryRecords.map((record: any) => {
              const isAllOk = record.reason === "All OK" || (record.formData && record.formData.actionType === "OK");
              const isClosed = record.status === "RECTIFIED" || record.status === "OPERATIONAL" || isAllOk;
              const canEdit = (role === "SUPER_ADMIN") || (canFill && (isTodayRecord(record) || !isClosed) && (!user?.id || record.createdById === user.id));
              return (
                <tr key={record.id}>
                  <td>{record.division}</td>
                  <td>{record.category}</td>
                  <td><strong>{record.formType === "Exchange" && record.formData?.exchangeName ? record.formData.exchangeName : record.formType}</strong></td>
                  <td>{record.stationCode || record.stationName || record.section || "-"}</td>
                  <td><span className={`pill status-${isAllOk ? "operational" : String(record.status || "").toLowerCase()}`}>{isAllOk ? "OPERATIONAL" : record.status}</span></td>
                  <td>{record.failureTime ? (isTodayRecord(record) ? new Date(record.failureTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : new Date(record.failureTime).toLocaleDateString([], { month: "short", day: "numeric" }) + " " + new Date(record.failureTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })) : "-"}</td>
                  <td>{record.rectificationTime ? (isTodayRecord(record) ? new Date(record.rectificationTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : new Date(record.rectificationTime).toLocaleDateString([], { month: "short", day: "numeric" }) + " " + new Date(record.rectificationTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })) : "-"}</td>
                  <td>{record.remarks || record.reason || "-"}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button type="button" className="action-btn text-blue" onClick={() => setDetailsRecord(record)}>
                      <Eye size={14} /> View Details
                    </button>
                    {canEdit && (
                      <button type="button" className="action-btn text-blue" onClick={() => startEdit(record)}>
                        <Edit size={14} /> Edit
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {filteredHistoryRecords.length === 0 && (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", color: "var(--muted)", padding: 24 }}>
                  {historySearch || historyDivision || historyCategory || historyFormType || historyStatus
                    ? "No Daily Position records found matching current criteria."
                    : dpHistoryFilter === "active-faults"
                    ? "No active/pending faults found."
                    : dpHistoryFilter === "resolved-faults"
                    ? "No resolved faults found."
                    : "No Daily Position records for this date."}
                </td>
              </tr>
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
          {viewMode === "history" && dpHistoryFilter === "date" && (
            <label className="division-select">
              <span>Position Date</span>
              <input
                type="date"
                value={selectedDate}
                onChange={event => setSelectedDate(event.target.value)}
                onClick={e => { try { e.currentTarget.showPicker(); } catch (err) {} }}
                style={{
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                  background: "#fff"
                }}
              />
            </label>
          )}
        </div>
      </section>

      {(canFill || (role === "SUPER_ADMIN" && editingRecordId)) && viewMode === "form" && (
        <section className="dp-workspace" style={{ display: "block" }}>
          <main className="dp-form-shell secr-form-shell">
            <form onSubmit={handleSubmit}>
              <div className="dp-form-scrollable-container">
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

                {isCompletedToday && !editingRecordId && (
                  <div
                    style={{
                      background: "#ecfdf5",
                      border: "1px solid #10b981",
                      color: "#065f46",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      marginBottom: "16px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontWeight: 600,
                      fontSize: "14px"
                    }}
                  >
                    <CheckCircle2 size={18} style={{ color: "#10b981" }} />
                    Completed for Today
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
                      readOnly={isCompletedToday && !editingRecordId}
                    />
                  ))}
                </div>

                <section className="dp-recent-form-records">
                  <div className="dp-recent-header">
                    <h3>Recent Submitted Records</h3>
                    <span>{selectedForm.name}</span>
                  </div>
                  <div className="table-scroll-container">
                    <table className="data-table dp-recent-table">
                      <thead>
                        <tr>
                          {activeFields.map(field => (
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
                            onClick={() => startEdit(record)}
                            style={{ cursor: "pointer" }}
                            title="Click to edit record"
                            className="dp-recent-row"
                          >
                            {activeFields.map(field => {
                              let val = record.formData?.[field.name];
                              if (val === undefined) {
                                if (field.name === "majorSection") val = record.majorSection;
                                else if (field.name === "section") val = record.section;
                                else if (field.name === "stationCode") val = record.stationCode || record.stationName;
                                else if (field.name === "assetId") val = recordAssetLabel(record, metadata);
                                else if (field.name === "failureTime") val = record.failureTime ? new Date(record.failureTime).toLocaleString() : "";
                                else if (field.name === "rectificationTime") val = record.rectificationTime ? new Date(record.rectificationTime).toLocaleString() : "";
                                else if (field.name === "durationText") val = record.durationText;
                                else if (field.name === "reason") val = record.reason;
                                else if (field.name === "remarks") val = record.remarks;
                              }
                              if (field.type === "datetime-local" && val) {
                                try {
                                  val = new Date(val).toLocaleString();
                                } catch (e) {}
                              }
                              return <td key={field.name}>{val !== undefined && val !== null ? String(val) : "-"}</td>;
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
                                const isOk = record.status === "OPERATIONAL" || record.status === "RECTIFIED" || record.reason === "All OK" || (record.formData && record.formData.actionType === "OK");
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
              </div>

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
                {!editingRecordId && (
                  <button 
                    className="export-button ok-button" 
                    type="button" 
                    onClick={handleOk} 
                    disabled={isSubmittingAllOk || createRecord.isPending || (isCompletedToday && !editingRecordId)}
                  >
                    {isSubmittingAllOk ? (
                      <>
                        <span className="dp-btn-loader" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        ALL OK
                      </>
                    )}
                  </button>
                )}
                <button 
                  className="export-button" 
                  type="submit" 
                  onClick={() => setShouldNavigateToNext(false)} 
                  disabled={isSavingDraft || createRecord.isPending || updateRecord.isPending || (isCompletedToday && !editingRecordId)}
                >
                  {isSavingDraft ? (
                    <>
                      <span className="dp-btn-loader" />
                      {editingRecordId ? "Updating..." : "Saving..."}
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      {editingRecordId ? "Update Daily Position" : "Save"}
                    </>
                  )}
                </button>
                {!editingRecordId && (
                  <button 
                    className="export-button" 
                    type="button" 
                    onClick={handleSaveAndNext} 
                    disabled={isSavingAndNext || createRecord.isPending || updateRecord.isPending || (isCompletedToday && !editingRecordId)}
                  >
                    {isSavingAndNext ? (
                      <>
                        <span className="dp-btn-loader" />
                        Saving & Next...
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        Save & Next
                      </>
                    )}
                  </button>
                )}
              </div>
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
              <button className="modal-close" type="button" onClick={() => setDetailsRecord(null)}>X</button>
              <div className="dp-details-header">
                <div>
                  <span>Daily Position Record</span>
                  <h2>{detailsRecord.formType}</h2>
                  <p>{detailsRecord.division} / {detailsRecord.stationCode || detailsRecord.stationName || detailsRecord.section || "-"}</p>
                </div>
                <em className={`status-chip status-${isAllOk ? "operational" : String(detailsRecord.status || "").toLowerCase()}`}>
                  {isAllOk ? "OPERATIONAL" : detailsRecord.status}
                </em>
              </div>

              <div className="dp-details-summary">
                {[
                  ["Category", detailsRecord.category],
                  ["Action", detailsRecord.formData?.actionType || (isAllOk || detailsRecord.status === "OPERATIONAL" ? "OK" : "FAULT")],
                  ["Submitted", detailsRecord.date ? new Date(detailsRecord.date).toLocaleString() : "-"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>

              <section className="dp-details-section">
                <h3>Fault Timing</h3>
                <div className="dp-details-grid">
                  {[
                    ["Failure Time", detailsRecord.failureTime ? new Date(detailsRecord.failureTime).toLocaleString() : "-"],
                    ["Rectification Time", detailsRecord.rectificationTime ? new Date(detailsRecord.rectificationTime).toLocaleString() : "-"],
                    ["Duration of Failure", detailsRecord.durationText || "-"],
                    ["Reason", detailsRecord.reason || "-"],
                    ["Remarks", detailsRecord.remarks || "-"],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
              </section>

              <section className="dp-details-section">
                <h3>Submitted Form Fields</h3>
                <div className="dp-details-grid">
                  {Object.entries(detailsRecord.formData || {}).map(([key, value]) => (
                    <div key={key}>
                      <span>{humanizeFieldName(key)}</span>
                      <strong>{displayValue(value)}</strong>
                    </div>
                  ))}
                  {Object.keys(detailsRecord.formData || {}).length === 0 && (
                    <div>
                      <span>Form Data</span>
                      <strong>No additional fields submitted.</strong>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        );
      })()}

      {rectifyingRecord && (
        <div className="modal-backdrop dp-modal-backdrop" onClick={() => setRectifyingRecord(null)}>
          <div className="modal-card" onClick={event => event.stopPropagation()} style={{ width: "min(460px, 95vw)", padding: "24px" }}>
            <button className="modal-close" type="button" onClick={() => setRectifyingRecord(null)}>X</button>
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
                  Rectification Date & Time <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "normal" }}>(Date, Hours & Min)</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={rectificationTimeInput}
                  max={toLocalDateTimeValue(new Date())}
                  onChange={(e) => setRectificationTimeInput(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "14px",
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
                  style={{ background: "var(--primary)", color: "#fff" }}
                >
                  {updateRecord.isPending ? "Saving..." : "Save Rectification"}
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
                ✓
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

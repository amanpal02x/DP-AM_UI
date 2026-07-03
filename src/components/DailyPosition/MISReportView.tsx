import React, { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Printer, Calendar, Loader2 } from "lucide-react";
import { api } from "../../api/apiClient";
import { formatDateTime24, formatDate24 } from "../../utils/dateTime";
import type { UserRole } from "../../types";
import { DAILY_POSITION_FORMS } from "./dailyPositionForms";

type MISReportViewProps = {
  role: UserRole;
  userDivision: string;
  showToast: (msg: string) => void;
};

const toDateValue = (date = new Date()) => {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
};

// Reusable Custom Styled Select Dropdown Component with Search
function MISSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const filtered = useMemo(() => {
    if (!search) return options;
    return options.filter(opt => opt.label.toLowerCase().includes(search.toLowerCase()));
  }, [options, search]);

  const selectedLabel = options.find(o => o.value === value)?.label || placeholder;

  return (
    <div ref={containerRef} style={{ display: "flex", flexDirection: "column", gap: "4px", position: "relative", width: "100%" }}>
      <label style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#64748b", letterSpacing: "0.5px" }}>{label}</label>
      
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          height: "38px",
          width: "100%",
          padding: "0 12px",
          borderRadius: "6px",
          border: isOpen ? "1px solid #3b82f6" : "1px solid #cbd5e1",
          background: disabled ? "#f1f5f9" : "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "13px",
          fontWeight: "600",
          color: "var(--navy)",
          cursor: disabled ? "not-allowed" : "pointer",
          outline: "none",
          textAlign: "left",
          boxShadow: isOpen ? "0 0 0 3px rgba(59, 130, 246, 0.15)" : "none",
          transition: "border-color 0.2s ease, box-shadow 0.2s ease"
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: "16px" }}>
          {selectedLabel}
        </span>
        <span style={{ display: "inline-flex", color: "#64748b" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
            zIndex: 9999,
            maxHeight: "260px",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden"
          }}
        >
          {options.length > 6 && (
            <div style={{ padding: "8px", borderBottom: "1px solid #e2e8f0" }}>
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: "100%",
                  height: "32px",
                  padding: "0 10px",
                  fontSize: "12px",
                  borderRadius: "4px",
                  border: "1px solid #cbd5e1",
                  outline: "none",
                  boxSizing: "border-box"
                }}
              />
            </div>
          )}

          <div style={{ overflowY: "auto", flex: 1, padding: "4px 0" }}>
            {filtered.map(opt => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: "13px",
                    fontWeight: isSelected ? "700" : "500",
                    color: isSelected ? "#1e3a8a" : "#334155",
                    background: isSelected ? "#eff6ff" : "transparent",
                    border: "none",
                    textAlign: "left",
                    cursor: "pointer",
                    outline: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    transition: "background 0.15s"
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = "#f1f5f9";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {opt.label}
                  </span>
                  {isSelected && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ padding: "12px", fontSize: "12px", color: "#64748b", textAlign: "center" }}>
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MISReportView({ role, userDivision, showToast }: MISReportViewProps) {
  const isStaffOrTestroom = role === "STAFF" || role === "TESTROOM";
  const defaultDiv = isStaffOrTestroom ? (userDivision || "") : "";

  // Filter States
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30); // Default last 30 days
    return toDateValue(d);
  });
  const [dateTo, setDateTo] = useState(toDateValue());
  const [selectedDiv, setSelectedDiv] = useState(defaultDiv);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "RESOLVED">("ALL");
  const [formTypeFilter, setFormTypeFilter] = useState("");
  
  // Dropdown section filters
  const [majorSectionFilter, setMajorSectionFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [stationFilter, setStationFilter] = useState("");

  const [isGenerating, setIsGenerating] = useState(false);

  const formTypesOptions = useMemo(() => [
    { value: "", label: "All Form Types" },
    ...DAILY_POSITION_FORMS.map(f => ({ value: f.name, label: f.name }))
  ], []);

  // Fetch metadata dynamically (Stations, Sections, Major Sections) based on selected division
  const metadataQuery = useQuery({
    queryKey: ["daily-position-metadata-mis", selectedDiv],
    queryFn: () => api.dailyPosition.metadata(selectedDiv ? { division: selectedDiv } : {}),
    staleTime: 5 * 60 * 1000,
  });

  const divisionOptions = useMemo(() => {
    const options = [
      { value: "Bilaspur", label: "Bilaspur" },
      { value: "Raipur", label: "Raipur" },
      { value: "Nagpur", label: "Nagpur" }
    ];
    if (!isStaffOrTestroom) {
      return [{ value: "", label: "All Divisions" }, ...options];
    }
    return options;
  }, [isStaffOrTestroom]);

  const majorSectionsOptions = useMemo(() => {
    const list = metadataQuery.data?.data?.majorSections || [];
    return [
      { value: "", label: "All Major Sections" },
      ...list.map((ms: any) => ({ value: ms.name, label: ms.name }))
    ];
  }, [metadataQuery.data?.data?.majorSections]);
  
  const sectionsOptions = useMemo(() => {
    const msList = metadataQuery.data?.data?.majorSections || [];
    let list: any[] = [];
    if (majorSectionFilter) {
      const selectedMS = msList.find((ms: any) => ms.name === majorSectionFilter);
      list = selectedMS ? selectedMS.sections || [] : [];
    } else {
      const seen = new Set();
      for (const ms of msList) {
        for (const sec of (ms.sections || [])) {
          if (!seen.has(sec.name)) {
            seen.add(sec.name);
            list.push(sec);
          }
        }
      }
      list.sort((a: any, b: any) => a.name.localeCompare(b.name));
    }
    return [
      { value: "", label: "All Sections" },
      ...list.map((sec: any) => ({ value: sec.name, label: sec.name }))
    ];
  }, [metadataQuery.data?.data?.majorSections, majorSectionFilter]);

  const stationsOptions = useMemo(() => {
    const list = metadataQuery.data?.data?.stations || [];
    return [
      { value: "", label: "All Stations" },
      ...list.map((st: any) => ({ value: st.code, label: `${st.code} - ${st.name}` }))
    ];
  }, [metadataQuery.data?.data?.stations]);

  const statusOptions = [
    { value: "ALL", label: "All Faults (Active & Rectified)" },
    { value: "ACTIVE", label: "Active Faults Only" },
    { value: "RESOLVED", label: "Rectified Faults Only" }
  ];

  // Fetch report data (triggered manually)
  const { data: recordsRes, refetch } = useQuery({
    queryKey: ["mis-report-records", selectedDiv, dateFrom, dateTo, statusFilter, formTypeFilter],
    queryFn: () => {
      const params: any = {
        division: selectedDiv || "",
        dateFrom,
        dateTo,
        limit: 2000, // Return a large set for reporting
      };
      if (statusFilter === "ACTIVE") {
        params.isFaulty = "true";
      } else if (statusFilter === "RESOLVED") {
        params.isResolved = "true";
      }
      if (formTypeFilter) {
        params.formType = formTypeFilter;
      }
      return api.dailyPosition.list(params);
    },
    enabled: false, // Prevent auto-run on mount
  });

  const records = recordsRes?.data || [];

  // In-memory scope filtering & filtering out "All OK" check-ins
  const filteredRecords = useMemo(() => {
    return records.filter((r: any) => {
      if (r.status === "DRAFT") return false;

      // MIS Report is strictly a total fault report: filter out routine "All OK" records
      const isAllOk = r.reason === "All OK" || (r.formData && r.formData.actionType === "OK");
      if (isAllOk) return false;

      // Text filters
      if (majorSectionFilter) {
        const major = String(r.majorSection || "").toLowerCase();
        if (!major.includes(majorSectionFilter.toLowerCase())) return false;
      }
      if (sectionFilter) {
        const sec = String(r.section || "").toLowerCase();
        if (!sec.includes(sectionFilter.toLowerCase())) return false;
      }
      if (stationFilter) {
        const st = String(r.stationCode || r.stationName || "").toLowerCase();
        if (!st.includes(stationFilter.toLowerCase())) return false;
      }

      return true;
    });
  }, [records, majorSectionFilter, sectionFilter, stationFilter]);

  // Compute live stats based on the filtered dataset
  const stats = useMemo(() => {
    let total = 0;
    let active = 0;
    let resolved = 0;
    let totalDurationMinutes = 0;
    let resolvedWithDurationCount = 0;

    for (const r of filteredRecords) {
      total++;
      const isUnresolved = !r.rectificationTime && r.status !== "RECTIFIED" && r.status !== "All Ok";
      if (isUnresolved) {
        active++;
      } else {
        resolved++;
        if (r.failureTime && r.rectificationTime) {
          const start = new Date(r.failureTime).getTime();
          const end = new Date(r.rectificationTime).getTime();
          if (!isNaN(start) && !isNaN(end) && end >= start) {
            totalDurationMinutes += (end - start) / 60000;
            resolvedWithDurationCount++;
          }
        }
      }
    }

    const mttrHours = resolvedWithDurationCount > 0 
      ? (totalDurationMinutes / resolvedWithDurationCount / 60).toFixed(1) 
      : "-";

    return { total, active, resolved, mttrHours };
  }, [filteredRecords]);

  const handleGenerateAndPrint = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      const { data } = await refetch();
      const fetchedList = data?.data || [];
      
      // Perform inline filtering to verify output has matching records
      const matched = fetchedList.filter((r: any) => {
        if (r.status === "DRAFT") return false;
        const isAllOk = r.reason === "All OK" || (r.formData && r.formData.actionType === "OK");
        if (isAllOk) return false;

        if (majorSectionFilter && !String(r.majorSection || "").toLowerCase().includes(majorSectionFilter.toLowerCase())) return false;
        if (sectionFilter && !String(r.section || "").toLowerCase().includes(sectionFilter.toLowerCase())) return false;
        if (stationFilter && !String(r.stationCode || r.stationName || "").toLowerCase().includes(stationFilter.toLowerCase())) return false;
        return true;
      });

      if (matched.length === 0) {
        showToast("No daily position records representing faults found matching selected criteria.");
        return;
      }

      // Allow DOM to render print container briefly before opening print dialog
      setTimeout(() => {
        window.print();
      }, 350);
    } catch (err: any) {
      showToast(err.message || "Failed to generate report.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <article className="mis-report-page" style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflowY: "auto" }}>
      {/* Styles for print layout overrides */}
      <style>{`
        @media screen {
          .mis-print-preview-container {
            display: none !important;
          }
        }
        @media print {
          body * {
            visibility: hidden !important;
          }
          .mis-print-preview-container, .mis-print-preview-container * {
            visibility: visible !important;
          }
          .mis-print-preview-container {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: #fff !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
          .data-table {
            border: 1px solid #cbd5e1 !important;
            border-collapse: collapse !important;
            width: 100% !important;
            font-size: 11px !important;
          }
          .data-table th, .data-table td {
            border: 1px solid #cbd5e1 !important;
            padding: 8px 10px !important;
            color: #334155 !important;
            background: #fff !important;
          }
          .data-table th {
            background: #f8fafc !important;
            font-weight: 700 !important;
            text-transform: uppercase !important;
            color: #1e293b !important;
          }
          .stats-grid-print {
            display: flex !important;
            flex-direction: row !important;
            justify-content: space-between !important;
            gap: 16px !important;
            margin-bottom: 24px !important;
            width: 100% !important;
          }
          .stats-card-print {
            border: 1px solid #e2e8f0 !important;
            background: #f8fafc !important;
            padding: 14px !important;
            flex: 1 !important;
            text-align: center !important;
            border-radius: 8px !important;
          }
        }
      `}</style>

      {/* ON-SCREEN VIEW: A beautifully centered clean form card */}
      <div className="mis-screen-view" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", background: "var(--background)", minHeight: "100%" }}>
        <form 
          onSubmit={handleGenerateAndPrint}
          style={{ 
            width: "100%", 
            maxWidth: "620px", 
            background: "#ffffff", 
            padding: "28px", 
            borderRadius: "12px", 
            border: "1px solid #e2e8f0", 
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03)" 
          }}
        >
          {/* Compact Inline Header */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
            <div style={{ padding: "8px", background: "rgba(59,130,246,0.08)", color: "var(--blue)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Printer size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "var(--navy)" }}>MIS Report Generator</h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "var(--muted)" }}>Configure and compile telecom fault records for printing</p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Row 1: Date From / Date To */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#64748b", letterSpacing: "0.5px" }}>Date From</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#64748b", pointerEvents: "none" }}>
                    <Calendar size={13} />
                  </span>
                  <input
                    type="date"
                    required
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    style={{ width: "100%", padding: "6px 10px 6px 30px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", color: "#1e293b", outline: "none", boxSizing: "border-box", height: "38px" }}
                  />
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#64748b", letterSpacing: "0.5px" }}>Date To</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#64748b", pointerEvents: "none" }}>
                    <Calendar size={13} />
                  </span>
                  <input
                    type="date"
                    required
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    style={{ width: "100%", padding: "6px 10px 6px 30px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", color: "#1e293b", outline: "none", boxSizing: "border-box", height: "38px" }}
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Division / Form Type */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <MISSelect
                label="Division"
                value={selectedDiv}
                onChange={(val) => {
                  setSelectedDiv(val);
                  setMajorSectionFilter("");
                  setSectionFilter("");
                  setStationFilter("");
                }}
                disabled={isStaffOrTestroom}
                options={divisionOptions}
                placeholder="All Divisions"
              />
              <MISSelect
                label="Form Type"
                value={formTypeFilter}
                onChange={setFormTypeFilter}
                options={formTypesOptions}
                placeholder="All Form Types"
              />
            </div>

            {/* Row 3: Status / Major Section */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <MISSelect
                label="Status"
                value={statusFilter}
                onChange={(val) => setStatusFilter(val as any)}
                options={statusOptions}
                placeholder="All Faults (Active & Rectified)"
              />
              <MISSelect
                label="Major Section"
                value={majorSectionFilter}
                onChange={(val) => {
                  setMajorSectionFilter(val);
                  setSectionFilter(""); // reset sub section
                }}
                options={majorSectionsOptions}
                placeholder="All Major Sections"
              />
            </div>

            {/* Row 4: Section / Station */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <MISSelect
                label="Section"
                value={sectionFilter}
                onChange={setSectionFilter}
                options={sectionsOptions}
                placeholder="All Sections"
              />
              <MISSelect
                label="Station"
                value={stationFilter}
                onChange={setStationFilter}
                options={stationsOptions}
                placeholder="All Stations"
              />
            </div>

            {/* Row 5: Action Submit button */}
            <button
              type="submit"
              disabled={isGenerating}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                height: "38px",
                width: "100%",
                marginTop: "8px",
                padding: "0 16px",
                background: "var(--blue)",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: "600",
                cursor: isGenerating ? "not-allowed" : "pointer",
                boxShadow: "0 4px 6px -1px rgba(59,130,246,0.3)"
              }}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Generating report...
                </>
              ) : (
                <>
                  <Printer size={15} />
                  Generate & Print Report
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* PRINT-ONLY PREVIEW CONTAINER (Strictly hidden on screen, visible during browser print) */}
      <div className="mis-print-preview-container">
        <div style={{ marginBottom: "20px", borderBottom: "2px solid #000", paddingBottom: "10px" }}>
          <h1 style={{ fontSize: "22px", margin: "0 0 6px 0", fontWeight: "800", color: "#000" }}>
            South East Central Railway — Telecom Daily Position Report
          </h1>
          <p style={{ margin: "0", fontSize: "12px", color: "#333" }}>
            <strong>Reporting Period:</strong> {formatDate24(new Date(dateFrom))} to {formatDate24(new Date(dateTo))} | 
            <strong> Division:</strong> {selectedDiv || "All Divisions"} | 
            <strong> Filters Applied:</strong> {[
              majorSectionFilter && `Major Section: ${majorSectionFilter}`,
              sectionFilter && `Section: ${sectionFilter}`,
              stationFilter && `Station: ${stationFilter}`,
            ].filter(Boolean).join(" | ") || "None"}
          </p>
        </div>

        {/* Dynamic KPI summary cards in Print output */}
        <div className="stats-grid-print">
          <div className="stats-card-print">
            <span style={{ fontSize: "10px", textTransform: "uppercase", fontWeight: "700", color: "#555" }}>Total Faults</span>
            <h3 style={{ margin: "4px 0 0 0", fontSize: "18px", fontWeight: "800" }}>{stats.total}</h3>
          </div>
          <div className="stats-card-print">
            <span style={{ fontSize: "10px", textTransform: "uppercase", fontWeight: "700", color: "#555" }}>Active Faults</span>
            <h3 style={{ margin: "4px 0 0 0", fontSize: "18px", fontWeight: "800", color: "#d9534f" }}>{stats.active}</h3>
          </div>
          <div className="stats-card-print">
            <span style={{ fontSize: "10px", textTransform: "uppercase", fontWeight: "700", color: "#555" }}>Resolved Faults</span>
            <h3 style={{ margin: "4px 0 0 0", fontSize: "18px", fontWeight: "800", color: "#5cb85c" }}>{stats.resolved}</h3>
          </div>
          <div className="stats-card-print">
            <span style={{ fontSize: "10px", textTransform: "uppercase", fontWeight: "700", color: "#555" }}>MTTR (Hours)</span>
            <h3 style={{ margin: "4px 0 0 0", fontSize: "18px", fontWeight: "800" }}>{stats.mttrHours}</h3>
          </div>
        </div>

        {/* Detailed Print Table */}
        <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr>
              <th style={{ width: "8%" }}>Division</th>
              <th style={{ width: "15%" }}>Form Type</th>
              <th style={{ width: "15%" }}>Station / Section</th>
              <th style={{ width: "10%" }}>Status</th>
              <th style={{ width: "12%" }}>Failure Time</th>
              <th style={{ width: "12%" }}>Rectification Time</th>
              <th>Failures details / Remarks</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.map((r: any) => {
              return (
                <tr key={r.id}>
                  <td>{r.division}</td>
                  <td><strong>{r.formType === "Exchange" && r.formData?.exchangeName ? r.formData.exchangeName : r.formType}</strong></td>
                  <td>{r.stationCode || r.stationName || r.section || "-"}</td>
                  <td>
                    <span style={{ fontWeight: 600, color: r.status === "FAULTY" ? "#d9534f" : "#5cb85c" }}>
                      {r.status}
                    </span>
                  </td>
                  <td>{r.failureTime ? formatDateTime24(r.failureTime) : "-"}</td>
                  <td>{r.rectificationTime ? formatDateTime24(r.rectificationTime) : "-"}</td>
                  <td>{r.remarks || r.reason || "-"}</td>
                </tr>
              );
            })}
            {filteredRecords.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: "20px", textAlign: "center" }}>
                  No daily position records representing faults matched the selected query parameters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}

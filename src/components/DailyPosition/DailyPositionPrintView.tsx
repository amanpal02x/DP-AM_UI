import React, { useMemo } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { Printer, X } from "lucide-react";
import { api } from "../../api/apiClient";
import { formatDateTime24, formatPositionDate, formatTime24 } from "../../utils/dateTime";
import { DAILY_POSITION_FORMS } from "./dailyPositionForms";

type DailyPositionPrintViewProps = {
  selectedDate: string;
  onClose: () => void;
  filterDivision?: string;
  positionType?: "MORNING" | "CURRENT";
};

export default function DailyPositionPrintView({ selectedDate, onClose, filterDivision, positionType = "MORNING" }: DailyPositionPrintViewProps) {
  // Fetch data for the divisions on the selected date
  const bspQuery = useQuery({
    queryKey: ["dp-print-table", "Bilaspur", selectedDate, positionType],
    queryFn: () => api.dailyPosition.positionSummary({ division: "Bilaspur", date: selectedDate, positionType }),
    staleTime: 30 * 1000,
    enabled: !filterDivision || filterDivision === "Bilaspur",
  });

  const rprQuery = useQuery({
    queryKey: ["dp-print-table", "Raipur", selectedDate, positionType],
    queryFn: () => api.dailyPosition.positionSummary({ division: "Raipur", date: selectedDate, positionType }),
    staleTime: 30 * 1000,
    enabled: !filterDivision || filterDivision === "Raipur",
  });

  const ngpQuery = useQuery({
    queryKey: ["dp-print-table", "Nagpur", selectedDate, positionType],
    queryFn: () => api.dailyPosition.positionSummary({ division: "Nagpur", date: selectedDate, positionType }),
    staleTime: 30 * 1000,
    enabled: !filterDivision || filterDivision === "Nagpur",
  });

  const isLoading = 
    ( (!filterDivision || filterDivision === "Bilaspur") && bspQuery.isLoading ) ||
    ( (!filterDivision || filterDivision === "Raipur") && rprQuery.isLoading ) ||
    ( (!filterDivision || filterDivision === "Nagpur") && ngpQuery.isLoading );

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

  const bspMap = useMemo(() => buildEntriesMap(bspQuery.data?.data?.records || []), [bspQuery.data]);
  const rprMap = useMemo(() => buildEntriesMap(rprQuery.data?.data?.records || []), [rprQuery.data]);
  const ngpMap = useMemo(() => buildEntriesMap(ngpQuery.data?.data?.records || []), [ngpQuery.data]);

  const divisionMaps: Record<string, Record<string, any[]>> = {
    Bilaspur: bspMap,
    Raipur: rprMap,
    Nagpur: ngpMap,
  };

  const DIVISIONS = filterDivision ? [filterDivision] : ["Bilaspur", "Raipur", "Nagpur"];

  const displayedForms = useMemo(() => {
    return DAILY_POSITION_FORMS.filter(
      (form) => form.category !== "Daily Log" && form.name !== "Daily Position Log"
    );
  }, []);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, ".");
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper to format failure time
  const formatTime = (isoString?: string) => {
    if (!isoString) return "";
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    const dateStr = d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "2-digit" }).replace(/\//g, ".");
    const timeStr = formatTime24(d);
    return `${dateStr} ${timeStr}`;
  };

  const positionTitle = positionType === "MORNING"
    ? `MORNING POSITION OF ${formatPositionDate(selectedDate).toUpperCase()}`
    : `CURRENT POSITION OF ${formatPositionDate(selectedDate).toUpperCase()}`;

  // Helper to get formatted duration text
  const getDurationText = (entry: any) => {
    const formData = entry.formData || {};
    const failureTime = entry.failureTime || formData.dateTime || null;
    const rectificationTime = entry.rectificationTime || formData.rectifiedDateTime || null;
    if (failureTime && rectificationTime) {
      const start = new Date(failureTime);
      const end = new Date(rectificationTime);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end >= start) {
        const minutes = Math.floor((end.getTime() - start.getTime()) / 60000);
        const hrs = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
      }
    }
    if (entry.durationMinutes !== undefined && entry.durationMinutes !== null) {
      const hrs = Math.floor(entry.durationMinutes / 60);
      const mins = entry.durationMinutes % 60;
      return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
    }
    return "-";
  };

  const actualFailureTime = (entry: any) =>
    entry.failureTime || entry.formData?.dateTime || null;

  const actualRectificationTime = (entry: any) =>
    entry.rectificationTime || entry.formData?.rectifiedDateTime || null;

  const actualLocation = (entry: any) =>
    entry.section
    || entry.formData?.section
    || entry.stationCode
    || entry.stationName
    || entry.formData?.stationCode
    || entry.majorSection
    || entry.formData?.majorSection
    || entry.formData?.sectionYard
    || entry.formData?.stationLobby
    || "-";

  const presentMetric = (label: string, value: any) =>
    value === undefined || value === null || value === "" ? null : `${label}: ${value}`;

  const actualRemarks = (entry: any, formName: string) => {
    const fd = entry.formData || {};
    const details: Array<string | null> = [];

    if (formName === "Temporary Joints") {
      details.push(
        presentMetric("Total joints", fd.temporaryJointsCount),
        presentMetric("Rectified joints", fd.rectifiedJoints),
        presentMetric(
          "Balance joints",
          fd.balanceTemporaryJoints !== undefined
            ? fd.balanceTemporaryJoints
            : fd.temporaryJointsCount !== undefined && fd.rectifiedJoints !== undefined
              ? Number(fd.temporaryJointsCount) - Number(fd.rectifiedJoints)
              : undefined
        ),
        fd.actionPlan ? `Action plan: ${fd.actionPlan}` : null
      );
    } else if (formName === "Low Insulation") {
      details.push(
        presentMetric("Total faults", fd.totalInsulationFaults),
        presentMetric("Balance faults", fd.balanceInsulationFaults),
        fd.actionPlanTdc ? `Action plan: ${fd.actionPlanTdc}` : null
      );
    } else if (formName === "Walkie-Talkie Testing") {
      details.push(
        presentMetric("To be tested", fd.toBeTestedCount),
        presentMetric("Tested", fd.testedCount),
        presentMetric("Balance", fd.balanceWalkieTalkies)
      );
    } else if (formName === "Walkie-Talkie Repairing") {
      details.push(
        presentMetric("Opening defective", fd.openingDefective),
        presentMetric("Received", fd.receivedFromUser),
        presentMetric("Sent for repair", fd.sentToFirm),
        presentMetric("Repaired received", fd.repairedFromFirm),
        presentMetric("Returned", fd.returnedToUser),
        presentMetric("Pending repair", fd.pendingRepair),
        presentMetric("Condemned", fd.setsCondemned)
      );
    }

    const primary = entry.reason === "All OK"
      ? null
      : entry.reason || entry.remarks || null;
    if (entry.remarks && entry.remarks !== primary) details.push(entry.remarks);
    if (primary) details.unshift(primary);

    return details.filter(Boolean).join(" | ") || "-";
  };

  return createPortal(
    <div className="print-preview-overlay" style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(15, 23, 42, 0.6)",
      backdropFilter: "blur(4px)",
      zIndex: 99999,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start",
      padding: "20px",
      overflowY: "auto"
    }}>
      {/* CSS overrides for print display */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          #root {
            display: none !important;
          }
          body {
            background: #ffffff !important;
          }
          .print-preview-overlay {
            position: static !important;
            background: none !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            display: block !important;
            width: 100% !important;
          }
          .print-preview-content {
            position: static !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            width: 100% !important;
          }
          .print-exclude {
            display: none !important;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
        }
      `}} />

      {/* Main Printable Document Sheet */}
      {isLoading ? (
        <div className="print-exclude" style={{
          width: "100%",
          maxWidth: "1100px",
          height: "400px",
          background: "#ffffff",
          borderRadius: "8px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          color: "#64748b",
          fontSize: "14px",
          position: "relative"
        }}>
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: "16px",
              right: "16px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              background: "#f1f5f9",
              color: "#334155",
              border: "1px solid #e2e8f0",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "background 0.2s"
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#e2e8f0"}
            onMouseLeave={e => e.currentTarget.style.background = "#f1f5f9"}
          >
            <X size={16} />
            Close
          </button>
          <div className="inline-spinner" style={{ width: "36px", height: "36px", border: "3px solid #e2e8f0", borderTopColor: "#2563eb", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          <span>Fetching consolidated data...</span>
        </div>
      ) : (
        <div className="print-preview-content" style={{
          width: "100%",
          maxWidth: "1100px",
          background: "#ffffff",
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
          padding: "40px",
          color: "#000000",
          fontFamily: "Arial, sans-serif",
          position: "relative"
        }}>
          {/* Action buttons (Print and Close) placed at the top-right corner of the form */}
          <div className="print-exclude" style={{
            position: "absolute",
            top: "24px",
            right: "24px",
            display: "flex",
            gap: "10px"
          }}>
            <button
              onClick={handlePrint}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                background: "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "background 0.2s"
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#1d4ed8"}
              onMouseLeave={e => e.currentTarget.style.background = "#2563eb"}
            >
              <Printer size={16} />
              Print Report
            </button>
            <button
              onClick={onClose}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                background: "#f1f5f9",
                color: "#334155",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "background 0.2s"
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#e2e8f0"}
              onMouseLeave={e => e.currentTarget.style.background = "#f1f5f9"}
            >
              <X size={16} />
              Close
            </button>
          </div>
          {/* Header Section */}
          <div style={{ textAlign: "center", borderBottom: "2px solid #000000", paddingBottom: "16px", marginBottom: "20px" }}>
            <h1 style={{ margin: "0 0 6px 0", fontSize: "20px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px" }}>
              SOUTH EAST CENTRAL RAILWAY
            </h1>
            <h2 style={{ margin: "0 0 10px 0", fontSize: "16px", fontWeight: "bold" }}>
              PCSTE/SECR POSITION
            </h2>
            <div style={{ marginBottom: "8px", fontSize: "13px", fontWeight: "bold" }}>
              {positionTitle}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", fontSize: "13px", fontWeight: "bold" }}>
              <span>{filterDivision ? `${filterDivision.toUpperCase()} DIVISION` : "BILASPUR / RAIPUR / NAGPUR DIVISION"}</span>
              <span>DATE: {formatDate(selectedDate)}</span>
            </div>
          </div>

          {/* Report Data Grid */}
          <table style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "11px",
            lineHeight: "1.3"
          }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={{ border: "1px solid #000000", padding: "6px", width: "4%", textAlign: "center" }}>Sr. No.</th>
                <th style={{ border: "1px solid #000000", padding: "6px", width: filterDivision ? "32%" : "22%", textAlign: "left" }}>Name of the circuit</th>
                {!filterDivision && (
                  <th style={{ border: "1px solid #000000", padding: "6px", width: "10%", textAlign: "center" }}>Division</th>
                )}
                <th style={{ border: "1px solid #000000", padding: "6px", width: "13%", textAlign: "left" }}>Failure Time</th>
                <th style={{ border: "1px solid #000000", padding: "6px", width: "13%", textAlign: "left" }}>Rectified Time</th>
                <th style={{ border: "1px solid #000000", padding: "6px", width: "7%", textAlign: "center" }}>Failure Durations</th>
                <th style={{ border: "1px solid #000000", padding: "6px", width: "11%", textAlign: "left" }}>Faulty Section/station</th>
                <th style={{ border: "1px solid #000000", padding: "6px", width: "20%", textAlign: "left" }}>Failure Remarks & Action taken</th>
              </tr>
            </thead>
            <tbody>
              {displayedForms.map((form, index) => {
                const srNo = index + 1;

                return (
                  <React.Fragment key={form.systemCode}>
                    {DIVISIONS.map((div, divIndex) => {
                      const map = divisionMaps[div] || {};
                      const formEntries = map[form.name] || map[form.systemCode] || [];
                      const activeEntries = formEntries.filter((e: any) => e.status !== "DRAFT");

                      // Find active faults
                      const faultEntries = activeEntries.filter((e: any) => {
                        const s = (e.positionStatus || e.status || "").toUpperCase();
                        const isAllOk = e.reason === "All OK" || (e.formData && e.formData.actionType === "OK");
                        return s !== "OPERATIONAL" && s !== "RECTIFIED" && !isAllOk;
                      });

                      const hasFault = faultEntries.length > 0;
                      const hasRecords = activeEntries.length > 0;

                      // Display values variables
                      let failTimeStr = "-";
                      let rtTimeStr = "-";
                      let durationStr = "-";
                      let faultySec = "-";
                      let actionRemarks = "-";

                      if (hasFault) {
                        const latestFault = faultEntries[0];
                        failTimeStr = formatTime(actualFailureTime(latestFault)) || "-";
                        rtTimeStr = formatTime(actualRectificationTime(latestFault)) || "-";
                        durationStr = getDurationText(latestFault);
                        faultySec = actualLocation(latestFault);
                        actionRemarks = actualRemarks(latestFault, form.name);
                      } else if (hasRecords) {
                        const latestRecord = activeEntries[0];
                        failTimeStr = formatTime(actualFailureTime(latestRecord)) || "-";
                        rtTimeStr = formatTime(actualRectificationTime(latestRecord)) || "-";
                        durationStr = getDurationText(latestRecord);
                        faultySec = actualLocation(latestRecord);
                        actionRemarks = actualRemarks(latestRecord, form.name);
                      }

                      if (actionRemarks === "No fault reported.") {
                        actionRemarks = "-";
                      }

                      return (
                        <tr key={div} style={{
                          borderBottom: divIndex === DIVISIONS.length - 1 ? "1.5px solid #000000" : "1px solid #cbd5e1"
                        }}>
                          {/* Rowspans for first division row */}
                          {divIndex === 0 && (
                            <>
                              <td rowSpan={DIVISIONS.length} style={{
                                border: "1px solid #000000",
                                padding: "6px",
                                textAlign: "center",
                                fontWeight: "bold",
                                verticalAlign: "middle"
                              }}>
                                {srNo}
                              </td>
                              <td rowSpan={DIVISIONS.length} style={{
                                border: "1px solid #000000",
                                padding: "6px",
                                fontWeight: "bold",
                                verticalAlign: "middle"
                              }}>
                                {form.name}
                              </td>
                            </>
                          )}
                           {!filterDivision && (
                             <td style={{
                               border: "1px solid #000000",
                               padding: "6px",
                               textAlign: "center",
                               fontWeight: "bold",
                               color: div === "Bilaspur" ? "#1e3a8a" : div === "Raipur" ? "#b91c1c" : "#15803d"
                             }}>
                               {div}
                             </td>
                           )}
                          <td style={{ border: "1px solid #000000", padding: "6px", color: hasFault ? "#b91c1c" : "inherit" }}>
                            {failTimeStr}
                          </td>
                          <td style={{ border: "1px solid #000000", padding: "6px" }}>
                            {rtTimeStr}
                          </td>
                          <td style={{ border: "1px solid #000000", padding: "6px", textAlign: "center" }}>
                            {durationStr}
                          </td>
                          <td style={{ border: "1px solid #000000", padding: "6px", fontWeight: hasFault ? "bold" : "normal", color: hasFault ? "#b91c1c" : "inherit" }}>
                            {faultySec}
                          </td>
                          <td style={{ border: "1px solid #000000", padding: "6px" }}>
                            {actionRemarks}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          {/* Footer Area */}
          <div style={{ marginTop: "30px", borderTop: "1px solid #000000", paddingTop: "12px", display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#475569" }}>
            <span>SECR Daily Position Summary System</span>
            <span>Generated on {formatDateTime24(new Date(), true)} IST</span>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}

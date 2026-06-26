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

  const stationsQuery = useQuery({
    queryKey: ["stations-list"],
    queryFn: () => api.stations.list(),
  });

  const isLoading = 
    stationsQuery.isLoading ||
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
    const base = DAILY_POSITION_FORMS.filter(
      (form) => form.category !== "Daily Log" && form.name !== "Daily Position Log"
    );
    const wifi = base.find(f => f.name === "Wi-Fi");
    if (wifi) {
      return [...base.filter(f => f.name !== "Wi-Fi"), wifi];
    }
    return base;
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

  const getNextDayFormatted = (dateStr: string) => {
    const d = new Date(`${dateStr}T00:00:00`);
    if (isNaN(d.getTime())) return dateStr;
    d.setDate(d.getDate() + 1);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, ".");
  };

  const formatAsOnDate = (dateStr: string) => {
    const d = new Date(`${dateStr}T00:00:00`);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    const month = d.toLocaleDateString("en-US", { month: "long" });
    const year = d.getFullYear();
    return `Position as on ${day} ${month} ${year}`;
  };

  const positionTitle = formatAsOnDate(selectedDate);

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
    if (failureTime && !rectificationTime) {
      const start = new Date(failureTime);
      if (!Number.isNaN(start.getTime())) {
        const end = new Date();
        const diffMs = end.getTime() - start.getTime();
        if (diffMs > 0) {
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          const days = Math.floor(diffDays);
          const hrs = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          if (days > 0) {
            return `${days} day${days > 1 ? "s" : ""}`;
          } else {
            return `${hrs} hr${hrs > 1 ? "s" : ""}`;
          }
        }
        return "0 days";
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

  const formatWatermarkDate = (dateStr: string) => {
    const d = new Date(`${dateStr}T00:00:00`);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    const month = d.toLocaleDateString("en-US", { month: "short" });
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const watermarkText = formatWatermarkDate(selectedDate);

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
        .print-watermark {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 0;
          user-select: none;
          background-repeat: repeat;
        }
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
            position: relative !important;
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
          .print-watermark {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            z-index: 1 !important;
            overflow: hidden !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-watermark svg {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-preview-content {
            position: relative !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            width: 100% !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
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
          {/* Watermark — inline SVG tiles that always render in print (background-image is blocked by browsers) */}
          <div
            className="print-watermark"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              zIndex: 1,
              overflow: "hidden",
              userSelect: "none"
            }}
          >
            {Array.from({ length: 60 }).map((_, i) => {
              const col = i % 4;
              const row = Math.floor(i / 4);
              return (
                <svg
                  key={i}
                  xmlns="http://www.w3.org/2000/svg"
                  width="300"
                  height="130"
                  style={{
                    position: "absolute",
                    top: `${row * 130}px`,
                    left: `${col * 300}px`,
                    overflow: "visible"
                  }}
                >
                  <text
                    x="50%"
                    y="50%"
                    fontFamily="Arial, sans-serif"
                    fontSize="20"
                    fontWeight="bold"
                    fill="#000000"
                    fillOpacity="0.07"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform="rotate(-30 150 65)"
                  >
                    {watermarkText}
                  </text>
                </svg>
              );
            })}
          </div>

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
              DATE: {getNextDayFormatted(selectedDate)}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", fontSize: "13px", fontWeight: "bold" }}>
              <span>{filterDivision ? `${filterDivision.toUpperCase()} DIVISION` : "BILASPUR / RAIPUR / NAGPUR DIVISION"}</span>
              <span>{positionTitle}</span>
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
                <th style={{ border: "1px solid #000000", padding: "6px", width: "7%", textAlign: "center" }}>Failure durations/Pending</th>
                <th style={{ border: "1px solid #000000", padding: "6px", width: "11%", textAlign: "left" }}>Faulty Section/station</th>
                <th style={{ border: "1px solid #000000", padding: "6px", width: "20%", textAlign: "left" }}>Failure Remarks & Action taken</th>
              </tr>
            </thead>
            <tbody>
              {displayedForms.map((form, index) => {
                const srNo = index + 1;

                // Handle Walkie-Talkie Testing, Repairing, Temporary Joints, Low Insulation
                const isWtRepair = form.name === "Walkie-Talkie Repairing";
                const isWtTest = form.name === "Walkie-Talkie Testing";
                const isJoints = form.name === "Temporary Joints";
                const isInsulation = form.name === "Low Insulation";

                // Prepare rendering data for each division
                const divisionRenderData = DIVISIONS.map((div) => {
                  const map = divisionMaps[div] || {};
                  const formEntries = map[form.name] || map[form.systemCode] || [];
                  const activeEntries = formEntries.filter((e: any) => e.status !== "DRAFT");

                  // Find active faults
                  const faultEntries = activeEntries.filter((e: any) => {
                    const s = (e.status || "").toUpperCase();
                    const isAllOk = e.reason === "All OK" || (e.formData && e.formData.actionType === "OK");
                    return s !== "OPERATIONAL" && s !== "RECTIFIED" && !isAllOk;
                  });

                  let entries: any[] = [];
                  if (faultEntries.length > 0) {
                    entries = faultEntries;
                  } else if (activeEntries.length > 0) {
                    // Show the latest entry (typically an OK/Operational/Rectified state)
                    entries = [activeEntries[0]];
                  } else {
                    // Show a placeholder empty row
                    entries = [{ isPlaceholder: true }];
                  }

                  return {
                    div,
                    entries,
                  };
                });

                // Calculate the total number of rows across all divisions for this form
                const totalRows = divisionRenderData.reduce((acc, curr) => acc + curr.entries.length, 0);

                let formRowIndex = 0;

                return (
                  <React.Fragment key={form.systemCode}>
                    {divisionRenderData.map((divData, divIndex) => {
                      const { div, entries } = divData;

                      return entries.map((entry, entryIndex) => {
                        const isFirstFormRow = formRowIndex === 0;
                        const isFirstDivRow = entryIndex === 0;
                        formRowIndex++;

                        // Display values variables
                        let failTimeStr = "-";
                        let rtTimeStr = "-";
                        let durationStr = "-";
                        let faultySec = "-";
                        let actionRemarks = "-";

                        const hasFault = !entry.isPlaceholder && 
                                         !entry.rectificationTime && 
                                         entry.status !== "OPERATIONAL" && 
                                         entry.status !== "RECTIFIED" && 
                                         entry.reason !== "All OK" &&
                                         !(entry.formData && entry.formData.actionType === "OK");

                        if (!entry.isPlaceholder) {
                          if (isWtRepair) {
                            const fd = entry.formData || {};
                            const pending = Number(fd.openingDefective || 0) + Number(fd.receivedFromUser || 0) - Number(fd.returnedToUser || 0) - Number(fd.setsCondemned || 0);
                            failTimeStr = `Opening Def: ${fd.openingDefective ?? 0} | Recv: ${fd.receivedFromUser ?? 0}`;
                            rtTimeStr = `Repaired: ${fd.repairedFromFirm ?? 0} | Sent: ${fd.sentToFirm ?? 0}`;
                            durationStr = `Pend: ${pending}`;
                            faultySec = `Cond: ${fd.setsCondemned ?? 0}`;
                            actionRemarks = entry.remarks || "WT Repairing logged.";
                          } else if (isWtTest) {
                            const fd = entry.formData || {};
                            failTimeStr = `To Test: ${fd.toBeTestedCount ?? 0}`;
                            rtTimeStr = `Tested: ${fd.testedCount ?? 0}`;
                            durationStr = `Bal: ${fd.balanceWalkieTalkies ?? 0}`;
                            faultySec = fd.makeModel || "WT Testing";
                            actionRemarks = entry.remarks || "WT Testing logged.";
                          } else if (isJoints) {
                            const fd = entry.formData || {};
                            failTimeStr = formatTime(fd.dateTime) || "-";
                            rtTimeStr = formatTime(fd.rectifiedDateTime) || "-";
                            // Show actual time duration, not count
                            durationStr = getDurationText({ failureTime: fd.dateTime, rectificationTime: fd.rectifiedDateTime });
                            // Show actual section/station location, not balance count
                            faultySec = actualLocation(entry);
                            actionRemarks = fd.actionPlan || entry.remarks || "Joints logged.";
                          } else if (isInsulation) {
                            const fd = entry.formData || {};
                            failTimeStr = formatTime(entry.failureTime) || "-";
                            rtTimeStr = formatTime(entry.rectificationTime) || "-";
                            // Show actual time duration, not count
                            durationStr = getDurationText(entry);
                            // Show actual section/station location, not balance count
                            faultySec = actualLocation(entry);
                            actionRemarks = fd.actionPlanTdc || entry.remarks || "Insulation faults logged.";
                          } else {
                            failTimeStr = formatTime(entry.failureTime) || "-";
                            rtTimeStr = formatTime(entry.rectificationTime) || "-";
                            durationStr = getDurationText(entry);
                            
                            // Map location to name/code
                            const codeOrName = entry.stationCode || entry.stationName || entry.formData?.stationCode || entry.formData?.stationName;
                            if (codeOrName) {
                              const sList = stationsQuery.data?.data || [];
                              const found = sList.find(
                                (s: any) =>
                                  String(s.code).toLowerCase() === codeOrName.toLowerCase() ||
                                  String(s.name).toLowerCase() === codeOrName.toLowerCase()
                              );
                              faultySec = found ? `${found.name}/${found.code}` : codeOrName;
                            } else if (entry.section || entry.formData?.section) {
                              faultySec = entry.section || entry.formData?.section;
                            } else if (entry.formData?.majorSection) {
                              faultySec = entry.formData.majorSection;
                            } else if (entry.formData?.exchangeName) {
                              faultySec = entry.formData.exchangeName;
                            }

                            actionRemarks = entry.remarks || entry.reason || "OK";
                            if (actionRemarks === "No fault reported.") {
                              actionRemarks = "-";
                            }
                          }
                          const isAllOk = !entry.isPlaceholder && 
                                         (entry.reason === "All OK" || 
                                          (entry.formData && entry.formData.actionType === "OK"));
                         if (isAllOk) {
                           if (failTimeStr === "-") failTimeStr = "";
                           if (rtTimeStr === "-") rtTimeStr = "";
                           if (durationStr === "-") durationStr = "";
                           if (faultySec === "-") faultySec = "";
                           if (actionRemarks === "-") actionRemarks = "";
                         }
                        }

                        return (
                          <tr key={`${div}-${entry.id || entryIndex}`} style={{
                            borderBottom: (divIndex === DIVISIONS.length - 1 && entryIndex === entries.length - 1) ? "1.5px solid #000000" : "1px solid #cbd5e1"
                          }}>
                            {/* Rowspans for first division row */}
                            {isFirstFormRow && (
                              <>
                                <td rowSpan={totalRows} style={{
                                  border: "1px solid #000000",
                                  padding: "6px",
                                  textAlign: "center",
                                  fontWeight: "bold",
                                  verticalAlign: "middle"
                                }}>
                                  {srNo}
                                </td>
                                <td rowSpan={totalRows} style={{
                                  border: "1px solid #000000",
                                  padding: "6px",
                                  fontWeight: "bold",
                                  verticalAlign: "middle"
                                }}>
                                  {form.name}
                                </td>
                              </>
                            )}
                            {!filterDivision && isFirstDivRow && (
                              <td rowSpan={entries.length} style={{
                                border: "1px solid #000000",
                                padding: "6px",
                                textAlign: "center",
                                fontWeight: "bold",
                                verticalAlign: "middle"
                              }}>
                                {div}
                              </td>
                            )}
                            <td style={{ border: "1px solid #000000", padding: "6px" }}>
                              {failTimeStr}
                            </td>
                            <td style={{ border: "1px solid #000000", padding: "6px" }}>
                              {rtTimeStr}
                            </td>
                            <td style={{ border: "1px solid #000000", padding: "6px", textAlign: "center" }}>
                              {durationStr}
                            </td>
                            <td style={{ border: "1px solid #000000", padding: "6px", fontWeight: hasFault ? "bold" : "normal" }}>
                              {faultySec}
                            </td>
                            <td style={{ border: "1px solid #000000", padding: "6px" }}>
                              {actionRemarks}
                            </td>
                          </tr>
                        );
                      });
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

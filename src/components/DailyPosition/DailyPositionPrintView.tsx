import React, { useMemo } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { Printer, X } from "lucide-react";
import { api } from "../../api/apiClient";
import { formatDateTime24, formatPositionDate, formatTime24 } from "../../utils/dateTime";
import { DAILY_POSITION_FORMS } from "./dailyPositionForms";
import { useAppStore } from "../../App";

type DailyPositionPrintViewProps = {
  selectedDate: string;
  onClose: () => void;
  filterDivision?: string;
  positionType?: "MORNING" | "CURRENT";
};

export default function DailyPositionPrintView({ selectedDate, onClose, filterDivision, positionType = "MORNING" }: DailyPositionPrintViewProps) {
  const { role } = useAppStore();
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

  const lobbiesQuery = useQuery({
    queryKey: ["walkie-talkie-lobbies-print"],
    queryFn: () => api.walkieTalkie.listLobbies().then((res: any) => res.data || []),
  });

  const activeFaultsQuery = useQuery({
    queryKey: ["daily-position-active-faults-print"],
    queryFn: () => api.dailyPosition.list({ limit: 1000, isFaulty: "true" }).then((res: any) => res.data || []),
  });

  const isLoading =
    stationsQuery.isLoading ||
    lobbiesQuery.isLoading ||
    activeFaultsQuery.isLoading ||
    ((!filterDivision || filterDivision === "Bilaspur") && bspQuery.isLoading) ||
    ((!filterDivision || filterDivision === "Raipur") && rprQuery.isLoading) ||
    ((!filterDivision || filterDivision === "Nagpur") && ngpQuery.isLoading);

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

  const getDivisionAllOkTime = (divName: string, formName: string, formSystemCode: string) => {
    const map = divisionMaps[divName] || {};
    const formEntries = map[formName] || map[formSystemCode] || [];
    const activeEntries = formEntries.filter((e: any) => e.status !== "DRAFT");
    const allOkEntry = activeEntries.find((e: any) => {
      const s = (e.status || "").toUpperCase();
      const isAllOk = e.reason === "All OK" || (e.formData && e.formData.actionType === "OK");
      return s === "All Ok" || isAllOk;
    });
    if (allOkEntry && allOkEntry.formData?.testingTime) {
      const date = new Date(allOkEntry.formData.testingTime);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString("en-US", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true
        });
      }
    }
    return null;
  };

  const displayedForms = useMemo(() => {
    const base = DAILY_POSITION_FORMS.filter(
      (form) => form.category !== "Daily Log" && form.name !== "Daily Position Log"
    );

    const isEligibleRole = !role || role === "SUPER_ADMIN" || role === "VIEWER" || role === "ALL_DIVISION_VIEWER" || role === "DIVISIONAL_VIEWER";
    const isSuperAdminOrViewerPrint = isEligibleRole && (!filterDivision || DIVISIONS.length > 1);

    if (isSuperAdminOrViewerPrint) {
      const isWifiOrWt = (f: any) => {
        const l = (f.name || "").toLowerCase();
        return l.includes("wi-fi") || l.includes("wifi") || l.includes("walkie");
      };
      const regularForms = base.filter(f => !isWifiOrWt(f));
      const wifiOrWtForms = base.filter(f => isWifiOrWt(f));
      return [...regularForms, ...wifiOrWtForms];
    }

    const wifi = base.find(f => f.name === "Wi-Fi");
    if (wifi) {
      return [...base.filter(f => f.name !== "Wi-Fi"), wifi];
    }
    return base;
  }, [role, filterDivision, DIVISIONS.length]);

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
      <style dangerouslySetInnerHTML={{
        __html: `
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
          @page {
            size: A4 portrait;
            margin: 8mm 10mm 8mm 10mm;
          }
          html, body {
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          #root {
            display: none !important;
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
            background: #ffffff !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-exclude {
            display: none !important;
          }
          table {
            width: 100% !important;
            table-layout: fixed !important;
            word-wrap: break-word !important;
            word-break: break-word !important;
            border-collapse: collapse !important;
          }
          tr {
            page-break-inside: auto !important;
            break-inside: auto !important;
          }
          thead {
            display: table-header-group !important;
          }
          th, td {
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
            box-sizing: border-box !important;
            padding: 4px 5px !important;
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
        }`
      }} />

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
              PCSTE/SECR MORNING POSITION
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
          {(() => {
            const isSuperAdminOrViewer = !role || role === "SUPER_ADMIN" || role === "VIEWER" || role === "ALL_DIVISION_VIEWER" || role === "DIVISIONAL_VIEWER";
            const isSuperAdminOrViewerPrint = isSuperAdminOrViewer && (!filterDivision || DIVISIONS.length > 1);

            // Division users for Bilaspur/Raipur/Nagpur also get a dedicated WT section
            const isDivisionWtPrint = !!filterDivision && (
              filterDivision === "Bilaspur" || filterDivision === "Raipur" || filterDivision === "Nagpur"
            );

            const isWtForm = (f: any) => f.name === "Walkie-Talkie Testing" || f.name === "Walkie-Talkie Repairing";
            const shouldSeparateWt = isSuperAdminOrViewerPrint || isDivisionWtPrint;
            const mainForms = shouldSeparateWt ? displayedForms.filter(f => !isWtForm(f)) : displayedForms;
            const wtForms = shouldSeparateWt ? displayedForms.filter(f => isWtForm(f)) : [];

            return (
              <>
                <table style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "11px",
                  lineHeight: "1.3"
                }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      <th style={{ border: "1px solid #000000", padding: "6px", width: filterDivision ? "4%" : "3%", textAlign: "center" }}>Sr. No.</th>
                      <th style={{ border: "1px solid #000000", padding: "6px", width: filterDivision ? "24%" : "17%", textAlign: "left" }}>Name of the circuit</th>
                      {!filterDivision && (
                        <th style={{ border: "1px solid #000000", padding: "6px", width: "8%", textAlign: "center" }}>Division</th>
                      )}
                      <th style={{ border: "1px solid #000000", padding: "6px", width: filterDivision ? "12%" : "11%", textAlign: "left" }}>Failure Time</th>
                      <th style={{ border: "1px solid #000000", padding: "6px", width: filterDivision ? "12%" : "11%", textAlign: "left" }}>Rectified Time</th>
                      <th style={{ border: "1px solid #000000", padding: "6px", width: filterDivision ? "8%" : "8%", textAlign: "center" }}>Failure durations/Pending</th>
                      <th style={{ border: "1px solid #000000", padding: "6px", width: filterDivision ? "12%" : "11%", textAlign: "left" }}>Faulty Section/station</th>
                      <th style={{ border: "1px solid #000000", padding: "6px", width: filterDivision ? "28%" : "31%", textAlign: "left" }}>Failure Remarks & Action taken</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mainForms.map((form, index) => {
                      const srNo = index + 1;

                      const isWtRepair = form.name === "Walkie-Talkie Repairing";
                      const isWtTest = form.name === "Walkie-Talkie Testing";
                      const isJoints = form.name === "Temporary Joints";
                      const isInsulation = form.name === "Low Insulation";

                      let divisionRenderData = DIVISIONS.map((div) => {
                        const map = divisionMaps[div] || {};
                        const formEntries = map[form.name] || map[form.systemCode] || [];
                        const activeEntries = formEntries.filter((e: any) => e.status !== "DRAFT");

                        const faultEntries = activeEntries.filter((e: any) => {
                          const s = (e.status || "").toUpperCase();
                          const isAllOk = e.reason === "All OK" || (e.formData && e.formData.actionType === "OK");
                          return s !== "All Ok" && s !== "RECTIFIED" && !isAllOk;
                        });

                        let entries: any[] = [];
                        if (isWtTest || isWtRepair) {
                          entries = activeEntries.length > 0 ? activeEntries : [{ isPlaceholder: true }];
                        } else if (faultEntries.length > 0) {
                          entries = faultEntries;
                        } else if (activeEntries.length > 0) {
                          entries = [activeEntries[0]];
                        } else {
                          entries = [{ isPlaceholder: true }];
                        }

                        return {
                          div,
                          entries,
                          hasFaults: faultEntries.length > 0,
                        };
                      });

                      const SECR_CONSOLIDATED_FORMS = [
                        "Control & ICMS Position",
                        "FOIS",
                        "Hotline",
                        "Video Conferencing with Divisions",
                        "Railway Board Video Phones",
                        "CFTM Conference",
                        "Railnet / Internet",
                        "PRS/UTS",
                        "Cable Cut (OFC & Quad)",
                        "Temporary Joints",
                        "Low Insulation",
                        "Passenger Amenities",
                        "Exchange",
                        "Rail Madad",
                      ];
                      const SECR_CONSOLIDATED_CODES = [
                        "SECR/TEL/ICMS-01",
                        "SECR/TEL/FOIS-02",
                        "SECR/TEL/HOT-03",
                        "SECR/TEL/VC-04",
                        "SECR/TEL/VPHONE-05",
                        "SECR/TEL/CONF-06",
                        "SECR/TEL/NET-08",
                        "SECR/TEL/PRSUTS-11",
                        "SECR/TEL/CUT-13",
                        "SECR/TEL/JNT-14",
                        "SECR/TEL/INS-15",
                        "SECR/TEL/PA-16",
                        "SECR/TEL/EX-ALL",
                        "SECR/TEL/MAD-07",
                      ];

                      const isConsolidatedForm = SECR_CONSOLIDATED_FORMS.includes(form.name) || SECR_CONSOLIDATED_CODES.includes(form.systemCode);
                      const isWifiForm = form.name === "Wi-Fi" || form.systemCode === "SECR/TEL/WIFI-09";

                      if (isWifiForm && isSuperAdminOrViewer && !filterDivision && DIVISIONS.length === 3) {
                        divisionRenderData = DIVISIONS.map((div) => {
                          const map = divisionMaps[div] || {};
                          const formEntries = map[form.name] || map[form.systemCode] || [];
                          const activeEntries = formEntries.filter((e: any) => e.status !== "DRAFT");
                          const faultEntries = activeEntries.filter((e: any) => {
                            const s = (e.status || "").toUpperCase();
                            const isAllOk = e.reason === "All OK" || (e.formData && e.formData.actionType === "OK");
                            return s !== "All Ok" && s !== "RECTIFIED" && !isAllOk;
                          });

                          return {
                            div,
                            entries: [{ isWifiSummary: true, faultCount: faultEntries.length }],
                            hasFaults: faultEntries.length > 0,
                          };
                        });
                      } else if (isConsolidatedForm && isSuperAdminOrViewer && !filterDivision && DIVISIONS.length === 3) {
                        const allDivisionsAllOk = divisionRenderData.every((d) => !d.hasFaults);
                        if (allDivisionsAllOk) {
                          divisionRenderData = [
                            {
                              div: "SECR",
                              entries: [{ isPlaceholder: true }],
                              hasFaults: false,
                            },
                          ];
                        }
                      }

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

                              let failTimeStr = "-";
                              let rtTimeStr = "-";
                              let durationStr = "-";
                              let faultySec = "-";
                              let actionRemarks = "-";

                              const hasFault = !entry.isPlaceholder &&
                                !entry.isWifiSummary &&
                                !entry.rectificationTime &&
                                entry.status !== "All Ok" &&
                                entry.status !== "RECTIFIED" &&
                                entry.reason !== "All OK" &&
                                !(entry.formData && entry.formData.actionType === "OK");

                              if (entry.isWifiSummary) {
                                failTimeStr = "";
                                rtTimeStr = "";
                                durationStr = "";
                                faultySec = "";
                                let stationCount = 0;
                                if (div === "Bilaspur") stationCount = 82;
                                else if (div === "Raipur") stationCount = 30;
                                else if (div === "Nagpur") stationCount = 91;

                                actionRemarks = stationCount > 0
                                  ? `Faults: ${entry.faultCount}/${stationCount} Stations`
                                  : `Faults: ${entry.faultCount}`;
                              } else if (!entry.isPlaceholder) {
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
                                  durationStr = getDurationText({ failureTime: fd.dateTime, rectificationTime: fd.rectifiedDateTime });
                                  faultySec = actualLocation(entry);
                                  actionRemarks = fd.actionPlan || entry.remarks || "Joints logged.";
                                } else if (isInsulation) {
                                  const fd = entry.formData || {};
                                  failTimeStr = formatTime(entry.failureTime) || "-";
                                  rtTimeStr = formatTime(entry.rectificationTime) || "-";
                                  durationStr = getDurationText(entry);
                                  faultySec = actualLocation(entry);
                                  actionRemarks = fd.actionPlanTdc || entry.remarks || "Insulation faults logged.";
                                } else {
                                  failTimeStr = formatTime(entry.failureTime) || "-";
                                  rtTimeStr = formatTime(entry.rectificationTime) || "-";
                                  durationStr = getDurationText(entry);

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
                              }

                              if (!hasFault) {
                                if (failTimeStr === "-") failTimeStr = "";
                                if (rtTimeStr === "-") rtTimeStr = "";
                                if (durationStr === "-") durationStr = "";
                                if (faultySec === "-") faultySec = "";
                                if (!actionRemarks || actionRemarks === "-" || actionRemarks === "" || actionRemarks === "OK" || actionRemarks === "All OK" || actionRemarks === "All Ok" || actionRemarks === "Joints logged." || actionRemarks === "Insulation faults logged.") {
                                  actionRemarks = "All OK";
                                }
                              }

                              if (actionRemarks === "All OK") {
                                if (div === "SECR") {
                                  const bspTime = getDivisionAllOkTime("Bilaspur", form.name, form.systemCode);
                                  const rTime = getDivisionAllOkTime("Raipur", form.name, form.systemCode);
                                  const ngpTime = getDivisionAllOkTime("Nagpur", form.name, form.systemCode);
                                  const parts: string[] = [];
                                  if (bspTime) parts.push(`BSP- ${bspTime}`);
                                  if (rTime) parts.push(`R - ${rTime}`);
                                  if (ngpTime) parts.push(`NGP- ${ngpTime}`);
                                  if (parts.length > 0) {
                                    actionRemarks = `All OK (${parts.join(", ")})`;
                                  }
                                } else {
                                  let abbrev = "";
                                  if (div === "Bilaspur") abbrev = "BSP";
                                  else if (div === "Raipur") abbrev = "R";
                                  else if (div === "Nagpur") abbrev = "NGP";
                                  const time = getDivisionAllOkTime(div, form.name, form.systemCode);
                                  if (time && abbrev) {
                                    actionRemarks = `All OK (${abbrev}- ${time})`;
                                  }
                                }
                              }

                              return (
                                <tr key={`${div}-${entry.id || entryIndex}`} style={{
                                  borderBottom: (divIndex === DIVISIONS.length - 1 && entryIndex === entries.length - 1) ? "1.5px solid #000000" : "1px solid #cbd5e1"
                                }}>
                                  {isFirstFormRow && (
                                    <>
                                      <td rowSpan={totalRows} style={{
                                        border: "1px solid #000000",
                                        padding: "5px",
                                        textAlign: "center",
                                        fontWeight: "bold",
                                        verticalAlign: "middle"
                                      }}>
                                        {srNo}
                                      </td>
                                      <td rowSpan={totalRows} style={{
                                        border: "1px solid #000000",
                                        padding: "5px",
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
                                      padding: "5px",
                                      textAlign: "center",
                                      fontWeight: "bold",
                                      verticalAlign: "middle"
                                    }}>
                                      {div}
                                    </td>
                                  )}
                                  <td style={{ border: "1px solid #000000", padding: "5px" }}>
                                    {failTimeStr}
                                  </td>
                                  <td style={{ border: "1px solid #000000", padding: "5px" }}>
                                    {rtTimeStr}
                                  </td>
                                  <td style={{ border: "1px solid #000000", padding: "5px", textAlign: "center" }}>
                                    {durationStr}
                                  </td>
                                  <td style={{ border: "1px solid #000000", padding: "5px", fontWeight: hasFault ? "bold" : "normal" }}>
                                    {faultySec}
                                  </td>
                                  <td style={{ border: "1px solid #000000", padding: "5px" }}>
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

                {/* Dedicated Walkie-Talkie Section Table for Super Admin / Viewer Print Reports */}
                {wtForms.length > 0 && (
                  <div style={{ marginTop: "20px" }}>
                    <div style={{ fontWeight: "bold", fontSize: "12px", marginBottom: "6px" }}>
                      5W WALKIE-TALKIE TESTING POSITION
                    </div>
                    <table style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "11px",
                      lineHeight: "1.3",
                      tableLayout: "fixed"
                    }}>
                      <thead>
                        <tr style={{ background: "#f8fafc" }}>
                          <th style={{ border: "1px solid #000000", padding: "6px", width: "5%", textAlign: "center" }}>Sr. No.</th>
                          {!filterDivision && <th style={{ border: "1px solid #000000", padding: "6px", width: "10%", textAlign: "center" }}>Division</th>}
                          <th style={{ border: "1px solid #000000", padding: "6px", width: filterDivision ? "47%" : "41%", textAlign: "left" }}>Lobby / Location</th>
                          <th style={{ border: "1px solid #000000", padding: "6px", width: filterDivision ? "16%" : "14%", textAlign: "center" }}>Total Sets</th>
                          <th style={{ border: "1px solid #000000", padding: "6px", width: filterDivision ? "16%" : "14%", textAlign: "center" }}>Sets Tested</th>
                          <th style={{ border: "1px solid #000000", padding: "6px", width: filterDivision ? "16%" : "16%", textAlign: "center" }}>
                            Balance to be Tested
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {wtForms.map((form, wtIdx) => {
                          const srNo = mainForms.length + wtIdx + 1;
                          const isWtRepair = form.name === "Walkie-Talkie Repairing";
                          const isWtTest = form.name === "Walkie-Talkie Testing";

                          let divisionRenderData = DIVISIONS.map((div) => {
                            const map = divisionMaps[div] || {};
                            const formEntries = map[form.name] || map[form.systemCode] || [];
                            const activeEntries = formEntries.filter((e: any) => e.status !== "DRAFT");

                            const computedEntries = activeEntries.map((entry: any) => {
                              let lobbyStr = "-";
                              let totalSets = 0;
                              let testedSets = 0;
                              let balance = 0;

                              const fd = entry.formData || {};
                              if (isWtTest) {
                                lobbyStr = fd.stationLobby || fd.lobbyName || fd.stationCode || entry.stationLobby || entry.stationCode || entry.stationName || "-";
                                totalSets = Number(fd.toBeTestedCount ?? fd.totalSets ?? 0);
                                testedSets = Number(fd.testedCount ?? 0);
                                const bal = fd.balanceWalkieTalkies ?? (totalSets - testedSets);
                                balance = bal < 0 ? 0 : bal;
                              } else if (isWtRepair) {
                                lobbyStr = fd.lobbyName || fd.stationLobby || fd.stationCode || entry.stationCode || entry.stationName || "-";
                                const tot = Number(fd.openingDefective || 0) + Number(fd.receivedFromUser || 0);
                                totalSets = tot;
                                testedSets = Number(fd.repairedFromFirm || 0);
                                const bal = tot - Number(fd.returnedToUser || 0) - Number(fd.setsCondemned || 0);
                                balance = bal < 0 ? 0 : bal;
                              }

                              return {
                                lobbyStr: lobbyStr.trim(),
                                totalSets,
                                testedSets,
                                balance,
                                id: entry.id
                              };
                            });

                            const groupedMap: Record<string, { lobbyStr: string; totalSets: number; testedSets: number; balance: number; ids: string[] }> = {};
                            computedEntries.forEach((entry) => {
                              const key = entry.lobbyStr.toLowerCase().trim();
                              if (key === "testing") return; // exclude testing data

                              if (!groupedMap[key]) {
                                groupedMap[key] = {
                                  lobbyStr: entry.lobbyStr,
                                  totalSets: 0,
                                  testedSets: 0,
                                  balance: 0,
                                  ids: []
                                };
                              }
                              groupedMap[key].totalSets += entry.totalSets;
                              groupedMap[key].testedSets += entry.testedSets;
                              groupedMap[key].balance += entry.balance;
                              groupedMap[key].ids.push(entry.id);
                            });
                            const groupedEntries = Object.values(groupedMap);

                            let finalEntries: any[] = [];
                            
                            const normalizeDiv = (divName?: string) => {
                              if (!divName) return "Others";
                              const l = divName.toLowerCase();
                              if (l.includes("raipur") || l === "r") return "Raipur";
                              if (l.includes("bilaspur") || l === "bsp") return "Bilaspur";
                              if (l.includes("nagpur") || l === "ngp") return "Nagpur";
                              return "Others";
                            };

                            const masterLobbies = (lobbiesQuery.data || []) as any[];
                            const divisionLobbies = masterLobbies.filter((l: any) => {
                              const lDiv = normalizeDiv(l.division);
                              const targetDiv = normalizeDiv(div);
                              const lobbyKey = (l.lobbyName || "").toLowerCase().trim();
                              return lDiv === targetDiv && lobbyKey !== "testing";
                            });

                            const activeFaults = (activeFaultsQuery.data || []) as any[];

                            if (divisionLobbies.length > 0) {
                              finalEntries = divisionLobbies.map((l: any) => {
                                const lobbyName = l.lobbyName;
                                const lobbyKey = lobbyName.toLowerCase().trim();

                                const totSets = Array.isArray(l.walkieTalkies) && l.walkieTalkies.length > 0
                                  ? l.walkieTalkies.length
                                  : (l.totalWalkieTalkies || 0);

                                const entry = groupedEntries.find(g => 
                                  g.lobbyStr.toLowerCase().trim() === lobbyKey || 
                                  (lobbyKey.includes("durg") && g.lobbyStr.toLowerCase().trim() === "durg")
                                );

                                const tSets = entry ? Math.max(Number(entry.testedSets || 0), Number(l.testedCount || 0)) : Number(l.testedCount || 0);

                                const lobbyFaults = activeFaults.filter((r: any) => {
                                  const isWT = (r.formType || r.name || "").toLowerCase().includes("walkie-talkie");
                                  const recordLobby = (r.formData?.stationLobby || r.formData?.lobbyName || r.stationCode || r.stationName || "").toLowerCase().trim();
                                  const matchesLobby = recordLobby === lobbyKey || (lobbyKey.includes("durg") && recordLobby === "durg");
                                  const isDraft = r.status === "DRAFT";
                                  const isRectified = r.status === "RECTIFIED" || r.reason === "All OK" || (r.formData && r.formData.actionType === "OK") || r.formData?.reportType === "Healthy";
                                  return isWT && matchesLobby && !isDraft && !isRectified;
                                });

                                const fSets = lobbyFaults.length;
                                const fSerials = lobbyFaults.map(r => r.formData?.serialNo).filter(Boolean);
                                const fSerialsStr = fSerials.length > 0 ? ` (${fSerials.join(", ")})` : "";

                                const bal = Math.max(0, totSets - tSets);

                                return {
                                  isPlaceholder: false,
                                  lobbyStr: lobbyName,
                                  totalSets: totSets,
                                  testedSets: tSets,
                                  faultySets: fSets,
                                  faultySerialsStr: fSerialsStr,
                                  balance: bal,
                                  ids: entry ? entry.ids : []
                                };
                              });
                            } else {
                              finalEntries = [{
                                isPlaceholder: true,
                                lobbyStr: "-",
                                totalSets: 0,
                                testedSets: 0,
                                faultySets: 0,
                                faultySerialsStr: "",
                                balance: 0,
                                ids: [] as string[]
                              }];
                            }

                            // Merge lobbies of division into a single row only when printing all divisions (no specific filterDivision)
                            if (!filterDivision && finalEntries.length > 0 && !finalEntries[0].isPlaceholder) {
                              const combinedLobbies = finalEntries.map(e => e.lobbyStr).join(", ");
                              const sumTotalSets = finalEntries.reduce((sum, e) => sum + (e.totalSets || 0), 0);
                              const sumTestedSets = finalEntries.reduce((sum, e) => sum + (e.testedSets || 0), 0);
                              const sumBalance = finalEntries.reduce((sum, e) => sum + (e.balance || 0), 0);
                              const allIds = finalEntries.flatMap(e => e.ids || []);

                              finalEntries = [{
                                isPlaceholder: false,
                                lobbyStr: combinedLobbies,
                                totalSets: sumTotalSets,
                                testedSets: sumTestedSets,
                                faultySets: 0,
                                faultySerialsStr: "",
                                balance: sumBalance,
                                ids: allIds
                              }];
                            }

                            return {
                              div,
                              entries: finalEntries,
                            };
                          });

                          const totalRows = divisionRenderData.reduce((acc, curr) => acc + curr.entries.length, 0);
                          let formRowIndex = 0;

                          const grandTotalSets = divisionRenderData.reduce((sum, d) => sum + d.entries.reduce((acc: number, e: any) => acc + (e.isPlaceholder ? 0 : (e.totalSets || 0)), 0), 0);
                          const grandTestedSets = divisionRenderData.reduce((sum, d) => sum + d.entries.reduce((acc: number, e: any) => acc + (e.isPlaceholder ? 0 : (e.testedSets || 0)), 0), 0);
                          const grandBalance = divisionRenderData.reduce((sum, d) => sum + d.entries.reduce((acc: number, e: any) => acc + (e.isPlaceholder ? 0 : (e.balance || 0)), 0), 0);

                          return (
                            <React.Fragment key={form.systemCode}>
                              {divisionRenderData.map((divData, divIndex) => {
                                const { div, entries } = divData;

                                return entries.map((entry, entryIndex) => {
                                  const isFirstFormRow = formRowIndex === 0;
                                  const isFirstDivRow = entryIndex === 0;
                                  formRowIndex++;

                                  let lobbyStr = "-";
                                  let totalSetsStr = "0";
                                  let testedSetsStr = "0";
                                  let faultySetsStr = "0";
                                  let balanceStr = "0";

                                  if (!entry.isPlaceholder) {
                                    lobbyStr = entry.lobbyStr;
                                    totalSetsStr = String(entry.totalSets);
                                    testedSetsStr = String(entry.testedSets);
                                    balanceStr = String(entry.balance);
                                  }

                                  return (
                                    <tr key={`${div}-${entry.ids?.join('-') || entryIndex}`} style={{
                                      borderBottom: (divIndex === DIVISIONS.length - 1 && entryIndex === entries.length - 1) ? "1.5px solid #000000" : "1px solid #cbd5e1"
                                    }}>
                                      {isFirstFormRow && (
                                        <td rowSpan={totalRows} style={{
                                          border: "1px solid #000000",
                                          padding: "5px",
                                          textAlign: "center",
                                          fontWeight: "bold",
                                          verticalAlign: "middle"
                                        }}>
                                          {srNo}
                                        </td>
                                      )}
                                      {!filterDivision && isFirstDivRow && (
                                        <td rowSpan={entries.length} style={{
                                          border: "1px solid #000000",
                                          padding: "5px",
                                          textAlign: "center",
                                          fontWeight: "bold",
                                          verticalAlign: "middle"
                                        }}>
                                          {div}
                                        </td>
                                      )}
                                      <td style={{ border: "1px solid #000000", padding: "5px" }}>
                                        {lobbyStr}
                                      </td>
                                      <td style={{ border: "1px solid #000000", padding: "5px", textAlign: "center" }}>
                                        {totalSetsStr}
                                      </td>
                                      <td style={{ border: "1px solid #000000", padding: "5px", textAlign: "center" }}>
                                        {testedSetsStr}
                                      </td>
                                      <td style={{ border: "1px solid #000000", padding: "5px", textAlign: "center" }}>
                                        {balanceStr}
                                      </td>
                                    </tr>
                                  );
                                });
                              })}
                              {/* Grand Total Row */}
                              <tr style={{ fontWeight: "bold", background: "#f8fafc" }}>
                                 <td style={{ border: "1px solid #000000", padding: "6px", textAlign: "center" }} colSpan={filterDivision ? 1 : 2}>
                                   Total
                                 </td>
                                 <td style={{ border: "1px solid #000000", padding: "6px" }}>
                                   -
                                 </td>
                                 <td style={{ border: "1px solid #000000", padding: "6px", textAlign: "center" }}>
                                   {grandTotalSets}
                                 </td>
                                 <td style={{ border: "1px solid #000000", padding: "6px", textAlign: "center" }}>
                                   {grandTestedSets}
                                 </td>

                                 <td style={{ border: "1px solid #000000", padding: "6px", textAlign: "center" }}>
                                   {grandBalance}
                                 </td>
                               </tr>
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                     </table>
                    </div>
                 )}
               </>
             );
           })()}

          {/* Footer Area */}
          <div style={{ marginTop: "30px", borderTop: "1px solid #000000", paddingTop: "12px", display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#475569" }}>
            <span>SECR Daily Position System</span>
            <span>Generated on {formatDateTime24(new Date(), true)} IST</span>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}

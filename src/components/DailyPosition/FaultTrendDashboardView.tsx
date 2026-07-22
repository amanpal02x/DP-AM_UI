import React, { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";
import {
  Calendar,
  Filter,
  AlertCircle,
  CheckCircle2,
  Clock,
  Activity,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  Check,
  Eye,
  Search,
  RefreshCw
} from "lucide-react";
import { api } from "../../api/apiClient";
import { DAILY_POSITION_CATEGORIES, DAILY_POSITION_FORMS } from "./dailyPositionForms";
import { formatDate24 } from "../../utils/dateTime";
import type { UserRole } from "../../types";

type FaultTrendDashboardViewProps = {
  role: UserRole;
  userDivision: string;
  openPanel: (title: string, itemId?: string | null) => void;
  showToast: (msg: string) => void;
};

// Map of form names to categories to serve as a fallback/mapping resolver
const FORM_TO_CATEGORY_MAP = DAILY_POSITION_FORMS.reduce((acc, form) => {
  acc[form.name] = form.category;
  return acc;
}, {} as Record<string, string>);

// Map of categories to their list of subcategories/form names
const CATEGORY_SUBFORMS_MAP = DAILY_POSITION_CATEGORIES.reduce((acc, cat) => {
  acc[cat] = DAILY_POSITION_FORMS.filter(f => f.category === cat).map(f => f.name);
  return acc;
}, {} as Record<string, string[]>);

export default function FaultTrendDashboardView({
  role,
  userDivision,
  openPanel,
  showToast
}: FaultTrendDashboardViewProps) {
  // 1. Filter States
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState<boolean>(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number; maxHeight: number }>({
    top: 0,
    left: 0,
    width: 280,
    maxHeight: 340
  });

  const [selectedDivision, setSelectedDivision] = useState<string>(
    userDivision && userDivision !== "HQ" ? userDivision : ""
  );
  const [datePreset, setDatePreset] = useState<string>("90days");
  const [tableSearch, setTableSearch] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Calculate dynamic overlay position based on available viewport space
  const updateDropdownPosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const defaultMaxHeight = 340;

    let top = rect.bottom + 4;
    let maxHeight = Math.min(defaultMaxHeight, Math.max(spaceBelow - 16, 150));

    // If space below is limited (< 260px) and there's more space above, open upward
    if (spaceBelow < 260 && spaceAbove > spaceBelow) {
      const actualMaxHeight = Math.min(defaultMaxHeight, Math.max(spaceAbove - 16, 150));
      top = Math.max(8, rect.top - actualMaxHeight - 4);
      maxHeight = actualMaxHeight;
    }

    let left = rect.left;
    const width = Math.max(280, rect.width);
    if (left + width > window.innerWidth - 16) {
      left = Math.max(16, window.innerWidth - width - 16);
    }

    setDropdownPos({ top, left, width, maxHeight });
  };

  const toggleCategoryDropdown = () => {
    if (!isCategoryDropdownOpen) {
      updateDropdownPosition();
      // On open, expand the active category if set, else collapse all
      setExpandedCategory(selectedCategory || null);
      setIsCategoryDropdownOpen(true);
    } else {
      setIsCategoryDropdownOpen(false);
    }
  };

  const handleCategoryRowClick = (cat: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    // Accordion: toggle selected category, collapse any other
    setExpandedCategory(prev => (prev === cat ? null : cat));
    setSelectedCategory(cat);
    setSelectedSubcategory("");
    setCurrentPage(1);
    setTimeout(updateDropdownPosition, 50);
  };

  const handleSubcategoryClick = (cat: string, subName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCategory(cat);
    setSelectedSubcategory(subName);
    setCurrentPage(1);
    setIsCategoryDropdownOpen(false);
  };

  // Reposition on window scroll or resize
  useEffect(() => {
    if (!isCategoryDropdownOpen) return;

    const handleScrollOrResize = () => {
      updateDropdownPosition();
    };

    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isCategoryDropdownOpen]);

  // Handle click outside for custom category dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsCategoryDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // 2. Fetch Data using React Query
  const { data: recordsRes, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["fault-trend-records", selectedDivision, datePreset],
    queryFn: () => {
      const params: any = { limit: 1000 };
      
      // Pass division if locked or selected
      const activeDiv = selectedDivision || (userDivision && userDivision !== "HQ" ? userDivision : "");
      if (activeDiv) {
        params.division = activeDiv;
      }

      // Compute dateFrom based on preset
      const now = new Date();
      let dateFromStr = "";
      if (datePreset === "7days") {
        const d = new Date();
        d.setDate(now.getDate() - 7);
        dateFromStr = d.toISOString().split("T")[0];
      } else if (datePreset === "30days") {
        const d = new Date();
        d.setDate(now.getDate() - 30);
        dateFromStr = d.toISOString().split("T")[0];
      } else if (datePreset === "90days") {
        const d = new Date();
        d.setDate(now.getDate() - 90);
        dateFromStr = d.toISOString().split("T")[0];
      } else if (datePreset === "180days") {
        const d = new Date();
        d.setDate(now.getDate() - 180);
        dateFromStr = d.toISOString().split("T")[0];
      } else if (datePreset === "year") {
        dateFromStr = `${now.getFullYear()}-01-01`;
      }
      
      if (dateFromStr) {
        params.dateFrom = dateFromStr;
      }

      return api.dailyPosition.list(params);
    },
    staleTime: 30_000,
  });

  const rawRecords = recordsRes?.data || [];

  // 3. Filter routine check-ins (e.g. "All OK" actions are not faults)
  const faults = useMemo(() => {
    return rawRecords.filter((r: any) => {
      if (r.status === "DRAFT") return false;
      const isAllOk = r.reason === "All OK" || (r.formData && r.formData.actionType === "OK");
      return !isAllOk;
    });
  }, [rawRecords]);

  // Helper: Resolve a record's category
  const getRecordCategory = (r: any) => {
    return r.category || FORM_TO_CATEGORY_MAP[r.formType] || "Others";
  };

  // 4. In-Memory Filtered Data (by Category & Subcategory)
  const filteredFaults = useMemo(() => {
    return faults.filter((r: any) => {
      if (selectedSubcategory) {
        const formType = r.formType || r.formData?.formType || "";
        return formType.toLowerCase() === selectedSubcategory.toLowerCase();
      }
      if (selectedCategory) {
        const cat = getRecordCategory(r);
        return cat.toUpperCase() === selectedCategory.toUpperCase();
      }
      return true;
    });
  }, [faults, selectedCategory, selectedSubcategory]);

  // 5. Aggregations & Metrics

  // KPI Card Stats
  const kpiStats = useMemo(() => {
    const total = filteredFaults.length;
    const resolved = filteredFaults.filter((r: any) => !!r.rectificationTime).length;
    const active = total - resolved;
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 100;

    // MTTR calculation in Hours
    let totalDurationMs = 0;
    let timedResolvedCount = 0;
    filteredFaults.forEach((r: any) => {
      if (r.failureTime && r.rectificationTime) {
        const fail = new Date(r.failureTime);
        const rect = new Date(r.rectificationTime);
        const diff = rect.getTime() - fail.getTime();
        if (diff > 0) {
          totalDurationMs += diff;
          timedResolvedCount++;
        }
      }
    });
    const avgDurationHours = timedResolvedCount > 0 
      ? (totalDurationMs / timedResolvedCount / 3600000).toFixed(1) 
      : "0.0";

    return {
      total,
      active,
      resolved,
      resolutionRate,
      mttr: avgDurationHours
    };
  }, [filteredFaults]);

  // Helper: Get start of Monday for a date
  const getStartOfWeek = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  // Weekly Trend: Group by Mon-Sun weeks chronological
  const weeklyTrendData = useMemo(() => {
    if (datePreset === "7days") {
      const daysMap = new Map<string, { date: Date; reported: number; resolved: number }>();
      const now = new Date();
      
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const label = d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
        daysMap.set(label, { date: d, reported: 0, resolved: 0 });
      }

      filteredFaults.forEach((r: any) => {
        if (!r.failureTime) return;
        const failDate = new Date(r.failureTime);
        const failLabel = failDate.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
        if (daysMap.has(failLabel)) {
          daysMap.get(failLabel)!.reported++;
        }

        if (r.rectificationTime) {
          const rectDate = new Date(r.rectificationTime);
          const rectLabel = rectDate.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
          if (daysMap.has(rectLabel)) {
            daysMap.get(rectLabel)!.resolved++;
          }
        }
      });

      return Array.from(daysMap.entries()).map(([label, data]) => ({
        week: label,
        Reported: data.reported,
        Resolved: data.resolved
      }));
    }

    const weeksMap = new Map<string, { weekStart: Date; reported: number; resolved: number }>();
    
    // Determine bounds
    const now = new Date();
    let startRange = new Date();
    if (datePreset === "30days") startRange.setDate(now.getDate() - 30);
    else if (datePreset === "90days") startRange.setDate(now.getDate() - 90);
    else if (datePreset === "180days") startRange.setDate(now.getDate() - 180);
    else startRange = new Date(now.getFullYear(), 0, 1);

    let iter = getStartOfWeek(startRange);
    const endRange = getStartOfWeek(now);

    // Initialize map
    while (iter <= endRange) {
      const mon = new Date(iter);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      const label = `${mon.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} - ${sun.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
      weeksMap.set(label, { weekStart: new Date(mon), reported: 0, resolved: 0 });
      iter.setDate(iter.getDate() + 7);
    }

    // Fill map
    filteredFaults.forEach((r: any) => {
      if (!r.failureTime) return;
      const failDate = new Date(r.failureTime);
      
      for (const [label, data] of weeksMap.entries()) {
        const wStart = data.weekStart;
        const wEnd = new Date(wStart);
        wEnd.setDate(wStart.getDate() + 7);
        if (failDate >= wStart && failDate < wEnd) {
          data.reported++;
          break;
        }
      }

      if (r.rectificationTime) {
        const rectDate = new Date(r.rectificationTime);
        for (const [label, data] of weeksMap.entries()) {
          const wStart = data.weekStart;
          const wEnd = new Date(wStart);
          wEnd.setDate(wStart.getDate() + 7);
          if (rectDate >= wStart && rectDate < wEnd) {
            data.resolved++;
            break;
          }
        }
      }
    });

    return Array.from(weeksMap.entries()).map(([label, data]) => ({
      week: label,
      Reported: data.reported,
      Resolved: data.resolved
    }));
  }, [filteredFaults, datePreset]);

  // Category, Sub-category, or Reason Distribution Data
  const breakdownData = useMemo(() => {
    const counts: Record<string, number> = {};
    
    if (selectedSubcategory) {
      // Reason breakdown inside specific subcategory
      filteredFaults.forEach((r: any) => {
        const reason = r.reason || r.formData?.reason || "Unspecified";
        const clean = reason.charAt(0).toUpperCase() + reason.slice(1).toLowerCase();
        counts[clean] = (counts[clean] || 0) + 1;
      });
    } else if (selectedCategory) {
      // Subcategory / Form breakdown inside specific category
      filteredFaults.forEach((r: any) => {
        const subcat = r.formType || r.reason || "Unspecified";
        counts[subcat] = (counts[subcat] || 0) + 1;
      });
    } else {
      // Category distribution
      filteredFaults.forEach((r: any) => {
        const cat = getRecordCategory(r);
        counts[cat] = (counts[cat] || 0) + 1;
      });
    }

    const colors = ["#3b82f6", "#10b981", "#ef4444", "#8b5cf6", "#f59e0b", "#06b6d4", "#ec4899", "#64748b"];
    return Object.entries(counts)
      .map(([name, value], idx) => ({
        name,
        value,
        color: colors[idx % colors.length]
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // top 8 categories/subcategories/reasons
  }, [filteredFaults, selectedCategory, selectedSubcategory]);

  // Monthly Summary: Group by Month (Chronological last 6 months)
  const monthlySummaryData = useMemo(() => {
    const monthsMap = new Map<string, number>();
    const now = new Date();
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
      monthsMap.set(label, 0);
    }

    filteredFaults.forEach((r: any) => {
      if (!r.failureTime) return;
      const date = new Date(r.failureTime);
      const label = date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
      if (monthsMap.has(label)) {
        monthsMap.set(label, monthsMap.get(label)! + 1);
      }
    });

    return Array.from(monthsMap.entries()).map(([month, count]) => ({
      Month: month,
      Faults: count
    }));
  }, [filteredFaults]);

  // Detailed Data Grid filtering
  const tableData = useMemo(() => {
    let result = filteredFaults;
    if (tableSearch) {
      const s = tableSearch.toLowerCase();
      result = result.filter(
        (r: any) =>
          String(r.stationCode || "").toLowerCase().includes(s) ||
          String(r.formType || "").toLowerCase().includes(s) ||
          String(r.reason || "").toLowerCase().includes(s) ||
          String(r.icmsEntryNo || "").toLowerCase().includes(s)
      );
    }
    return result;
  }, [filteredFaults, tableSearch]);

  const paginatedTableData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return tableData.slice(start, start + itemsPerPage);
  }, [tableData, currentPage]);

  const totalPages = Math.ceil(tableData.length / itemsPerPage) || 1;

  // Handle Chart Clicks (interactive filter)
  const handleChartClick = (clickedName: string) => {
    if (!selectedCategory && !selectedSubcategory) {
      // If we clicked on a category, filter by it
      const matchCat = DAILY_POSITION_CATEGORIES.find(c => c.toUpperCase() === clickedName.toUpperCase());
      if (matchCat) {
        setSelectedCategory(matchCat);
        setSelectedSubcategory("");
        setCurrentPage(1);
        showToast(`Filtered by category: ${matchCat}`);
        return;
      }

      // If we clicked on a subcategory/form
      const matchForm = DAILY_POSITION_FORMS.find(f => f.name.toUpperCase() === clickedName.toUpperCase());
      if (matchForm) {
        setSelectedCategory(matchForm.category);
        setSelectedSubcategory(matchForm.name);
        setCurrentPage(1);
        showToast(`Filtered by subcategory: ${matchForm.name}`);
      }
    }
  };

  const getDropdownLabel = () => {
    if (selectedSubcategory) {
      return selectedSubcategory;
    }
    if (selectedCategory) {
      return selectedCategory;
    }
    return "All Categories";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%" }}>
      {/* 6. Dashboard Controls & Sticky KPI Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
        {/* 6. Dashboard Controls */}
        <div className="panel" style={{ padding: "16px 20px", overflow: "visible", position: "relative", zIndex: 100 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "18px", color: "var(--navy)", fontWeight: 800 }}>Fault Analytics Dashboard</h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b" }}>Graphical trends and detailed breakdowns of equipment breakdowns</p>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              {/* Division Selector */}
              {(!userDivision || userDivision === "HQ") && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#475569" }}>Division:</span>
                  <select
                    value={selectedDivision}
                    onChange={(e) => {
                      setSelectedDivision(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="form-control"
                    style={{ padding: "6px 12px", fontSize: "13px", height: "36px", width: "150px", borderRadius: "6px" }}
                  >
                    <option value="">All Divisions</option>
                    <option value="Raipur">Raipur</option>
                    <option value="Bilaspur">Bilaspur</option>
                    <option value="Nagpur">Nagpur</option>
                  </select>
                </div>
              )}

              {/* Category Search Filter with Expandable Subcategories */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#475569" }}>Category:</span>
                <button
                  ref={triggerRef}
                  type="button"
                  onClick={toggleCategoryDropdown}
                  className="form-control"
                  style={{
                    padding: "0 12px",
                    fontSize: "13px",
                    height: "36px",
                    minWidth: "190px",
                    maxWidth: "280px",
                    borderRadius: "6px",
                    background: "#ffffff",
                    border: "1px solid var(--line, #cbd5e1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    color: (selectedCategory || selectedSubcategory) ? "var(--navy, #1e293b)" : "#475569",
                    fontWeight: (selectedCategory || selectedSubcategory) ? 600 : 400,
                    boxShadow: "0 1px 2px rgba(0,0,0,0.03)"
                  }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: "8px" }}>
                    {getDropdownLabel()}
                  </span>
                  <ChevronDown size={14} style={{ flexShrink: 0, color: "#64748b", transform: isCategoryDropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }} />
                </button>

                {/* Expandable Categories & Subcategories Menu Popover Portal */}
                {isCategoryDropdownOpen && createPortal(
                  <div
                    ref={dropdownRef}
                    style={{
                      position: "fixed",
                      top: `${dropdownPos.top}px`,
                      left: `${dropdownPos.left}px`,
                      width: `${dropdownPos.width}px`,
                      maxHeight: `${dropdownPos.maxHeight}px`,
                      overflowY: "auto",
                      background: "#ffffff",
                      border: "1px solid #cbd5e1",
                      borderRadius: "8px",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.18), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                      zIndex: 999999,
                      padding: "6px 0"
                    }}
                    className="custom-scrollbar"
                  >
                    {/* All Categories Option */}
                    <div
                      onClick={() => {
                        setSelectedCategory("");
                        setSelectedSubcategory("");
                        setCurrentPage(1);
                        setIsCategoryDropdownOpen(false);
                      }}
                      style={{
                        padding: "8px 14px",
                        fontSize: "13px",
                        fontWeight: (!selectedCategory && !selectedSubcategory) ? 700 : 500,
                        color: (!selectedCategory && !selectedSubcategory) ? "#2563eb" : "#334155",
                        background: (!selectedCategory && !selectedSubcategory) ? "#eff6ff" : "transparent",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderBottom: "1px solid #f1f5f9"
                      }}
                      onMouseEnter={(e) => { if (selectedCategory || selectedSubcategory) e.currentTarget.style.backgroundColor = "#f8fafc"; }}
                      onMouseLeave={(e) => { if (selectedCategory || selectedSubcategory) e.currentTarget.style.backgroundColor = "transparent"; }}
                    >
                      <span>All Categories</span>
                      {(!selectedCategory && !selectedSubcategory) && <Check size={14} style={{ color: "#2563eb" }} />}
                    </div>

                    {/* Main Categories and Subcategories Accordion */}
                    {DAILY_POSITION_CATEGORIES.map((cat) => {
                      const subforms = CATEGORY_SUBFORMS_MAP[cat] || [];
                      const isExpanded = expandedCategory === cat;
                      const isCatSelected = selectedCategory === cat && !selectedSubcategory;
                      const hasSubSelected = selectedCategory === cat && !!selectedSubcategory;

                      return (
                        <div key={cat} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          {/* Main Category Accordion Header Row */}
                          <div
                            onClick={(e) => handleCategoryRowClick(cat, e)}
                            style={{
                              padding: "9px 14px",
                              fontSize: "13px",
                              fontWeight: (isCatSelected || hasSubSelected) ? 700 : 600,
                              color: isCatSelected ? "#2563eb" : (hasSubSelected ? "#1d4ed8" : "#1e293b"),
                              background: isCatSelected ? "#eff6ff" : (hasSubSelected ? "#f0f7ff" : "transparent"),
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              cursor: "pointer",
                              userSelect: "none",
                              transition: "background-color 0.15s ease, color 0.15s ease"
                            }}
                            onMouseEnter={(e) => { if (!isCatSelected && !hasSubSelected) e.currentTarget.style.backgroundColor = "#f8fafc"; }}
                            onMouseLeave={(e) => { if (!isCatSelected && !hasSubSelected) e.currentTarget.style.backgroundColor = "transparent"; }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cat}</span>
                            </div>

                            {subforms.length > 0 && (
                              <div style={{ display: "flex", alignItems: "center", marginLeft: "8px" }}>
                                {isExpanded ? (
                                  <ChevronDown size={15} style={{ color: "#2563eb", transition: "transform 0.2s ease" }} />
                                ) : (
                                  <ChevronRight size={15} style={{ color: "#64748b", transition: "transform 0.2s ease" }} />
                                )}
                              </div>
                            )}
                          </div>

                          {/* Subcategories Accordion Content with Smooth Animation */}
                          {subforms.length > 0 && (
                            <div
                              style={{
                                maxHeight: isExpanded ? `${subforms.length * 38 + 10}px` : "0px",
                                opacity: isExpanded ? 1 : 0,
                                overflow: "hidden",
                                transition: "max-height 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease-in-out",
                                background: "#f8fafc"
                              }}
                            >
                              <div style={{ padding: "4px 0" }}>
                                {subforms.map((subName) => {
                                  const isSubSelected = selectedSubcategory === subName;
                                  return (
                                    <div
                                      key={subName}
                                      onClick={(e) => handleSubcategoryClick(cat, subName, e)}
                                      style={{
                                        padding: "7px 14px 7px 28px",
                                        fontSize: "12.5px",
                                        fontWeight: isSubSelected ? 700 : 500,
                                        color: isSubSelected ? "#2563eb" : "#475569",
                                        background: isSubSelected ? "#dbeafe" : "transparent",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        transition: "background 0.12s ease"
                                      }}
                                      onMouseEnter={(e) => { if (!isSubSelected) e.currentTarget.style.backgroundColor = "#e2e8f0"; }}
                                      onMouseLeave={(e) => { if (!isSubSelected) e.currentTarget.style.backgroundColor = "transparent"; }}
                                    >
                                      <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                                        <span
                                          style={{
                                            width: "5px",
                                            height: "5px",
                                            borderRadius: "50%",
                                            background: isSubSelected ? "#2563eb" : "#94a3b8",
                                            flexShrink: 0
                                          }}
                                        />
                                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                          {subName}
                                        </span>
                                      </div>
                                      {isSubSelected && <Check size={14} style={{ color: "#2563eb", flexShrink: 0, marginLeft: "6px" }} />}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>,
                  document.body
                )}
              </div>

              {/* Date Range Preset */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#475569" }}>Range:</span>
                <select
                  value={datePreset}
                  onChange={(e) => {
                    setDatePreset(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="form-control"
                  style={{ padding: "6px 12px", fontSize: "13px", height: "36px", width: "140px", borderRadius: "6px" }}
                >
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="90days">Last 90 Days</option>
                  <option value="180days">Last 180 Days</option>
                  <option value="year">This Year</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 7. Fixed KPI Metric Cards (Sticky Top Row) */}
        {!isLoading && !isError && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "12px", width: "100%", position: "sticky", top: "0px", zIndex: 90, background: "var(--bg-main, #f8fafc)", padding: 0 }}>
            {/* KPI: Total Faults */}
            <div className="panel" style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", borderLeft: "4px solid var(--blue)", minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "38px", height: "38px", borderRadius: "10px", background: "rgba(11, 109, 255, 0.1)", color: "var(--blue)", flexShrink: 0 }}>
                <Activity size={18} />
              </div>
              <div style={{ minWidth: 0 }}>
                <small style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Total Reported</small>
                <strong style={{ display: "block", fontSize: "20px", color: "var(--navy)", fontWeight: 800 }}>{kpiStats.total}</strong>
                <span style={{ fontSize: "10.5px", color: "#64748b", whiteSpace: "nowrap" }}>In selected period</span>
              </div>
            </div>

            {/* KPI: Active Faults */}
            <div className="panel" style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", borderLeft: "4px solid var(--red)", minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "38px", height: "38px", borderRadius: "10px", background: "rgba(239, 68, 68, 0.1)", color: "var(--red)", flexShrink: 0 }}>
                <AlertCircle size={18} />
              </div>
              <div style={{ minWidth: 0 }}>
                <small style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Active Pending</small>
                <strong style={{ display: "block", fontSize: "20px", color: "var(--red)", fontWeight: 800 }}>{kpiStats.active}</strong>
                <span style={{ fontSize: "10.5px", color: "#64748b", whiteSpace: "nowrap" }}>Unresolved faults</span>
              </div>
            </div>

            {/* KPI: Resolved Faults */}
            <div className="panel" style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", borderLeft: "4px solid var(--green)", minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "38px", height: "38px", borderRadius: "10px", background: "rgba(16, 185, 129, 0.1)", color: "var(--green)", flexShrink: 0 }}>
                <CheckCircle2 size={18} />
              </div>
              <div style={{ minWidth: 0 }}>
                <small style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Resolved</small>
                <strong style={{ display: "block", fontSize: "20px", color: "var(--green)", fontWeight: 800 }}>{kpiStats.resolved}</strong>
                <span style={{ fontSize: "10.5px", color: "#64748b", whiteSpace: "nowrap" }}>Rectification completed</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Charts & Tables Area */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%" }}>
        {/* Loading & Error States */}
        {isLoading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="panel" style={{ height: "100px", background: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
            ))}
          </div>
        ) : isError ? (
          <div className="panel text-center" style={{ padding: "40px" }}>
            <AlertCircle size={48} color="var(--red)" style={{ margin: "0 auto 12px auto" }} />
            <h3 style={{ color: "var(--navy)" }}>Failed to fetch fault analytics data</h3>
            <p style={{ color: "#64748b" }}>Please check your internet connection or backend server status.</p>
            <button className="export-button" onClick={() => refetch()} style={{ marginTop: "12px" }}>Retry Connection</button>
          </div>
        ) : (
          <>

          {/* 8. Charts Grid (Responsive layout) */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "12px" }}>
            {/* Chart 1: Weekly Fault Trends */}
            <article className="panel chart-panel" style={{ display: "flex", flexDirection: "column", height: "350px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ margin: 0, fontSize: "15px", color: "var(--navy)", fontWeight: 700 }}>
                  {datePreset === "7days" ? "Daily Fault Trends" : "Weekly Fault Trends"}
                </h3>
                {selectedCategory && (
                  <span className="pill info" style={{ fontSize: "10px", padding: "2px 8px" }}>Category: {selectedCategory}</span>
                )}
              </div>
              <div style={{ flex: 1, width: "100%", height: "100%", minHeight: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorReported" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--red)" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="var(--red)" stopOpacity={0.01} />
                      </linearGradient>
                      <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--green)" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="var(--green)" stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                    <XAxis
                      dataKey="week"
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
                    <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }} />
                    <Area
                      type="monotone"
                      dataKey="Reported"
                      stroke="var(--red)"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorReported)"
                      dot={{ r: 4, fill: "#fff", strokeWidth: 2 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="Resolved"
                      stroke="var(--green)"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorResolved)"
                      dot={{ r: 4, fill: "#fff", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </article>

            {/* Chart 2: Category Breakdown or Cause Analysis */}
            <article className="panel chart-panel" style={{ display: "flex", flexDirection: "column", height: "350px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ margin: 0, fontSize: "15px", color: "var(--navy)", fontWeight: 700 }}>
                  {selectedSubcategory
                    ? `${selectedSubcategory} Breakdown (By Reason)`
                    : selectedCategory
                    ? `${selectedCategory} Breakdown`
                    : "Category-wise Fault Analysis"}
                </h3>
                {(selectedCategory || selectedSubcategory) ? (
                  <button
                    onClick={() => {
                      setSelectedCategory("");
                      setSelectedSubcategory("");
                      setCurrentPage(1);
                    }}
                    style={{ background: "none", border: 0, padding: 0, fontSize: "11.5px", color: "var(--blue)", fontWeight: 700, cursor: "pointer" }}
                  >
                    Clear Filter
                  </button>
                ) : (
                  <span style={{ fontSize: "10.5px", color: "#64748b" }}>Click segment to drill-down</span>
                )}
              </div>
              <div className="donut-layout" style={{ flex: 1, display: "flex", alignItems: "center", minHeight: 0 }}>
                {breakdownData.length > 0 ? (
                  <>
                    <div className="donut-wrap" style={{ position: "relative", width: "160px", height: "160px", flexShrink: 0 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={breakdownData}
                            dataKey="value"
                            innerRadius="60%"
                            outerRadius="90%"
                            paddingAngle={2}
                            onClick={(node) => handleChartClick(node.name)}
                          >
                            {breakdownData.map((entry, idx) => (
                              <Cell key={idx} fill={entry.color} style={{ cursor: selectedCategory ? "default" : "pointer" }} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="donut-center" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
                        <strong style={{ display: "block", fontSize: "20px", color: "var(--navy)", fontWeight: 800 }}>{kpiStats.total}</strong>
                        <span style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase" }}>Faults</span>
                      </div>
                    </div>
                    <ul className="legend-list" style={{ flex: 1, overflowY: "auto", maxHeight: "230px", paddingLeft: "20px", listStyle: "none", margin: 0 }}>
                      {breakdownData.map((item, idx) => (
                        <li
                          key={idx}
                          onClick={() => handleChartClick(item.name)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            fontSize: "11.5px",
                            marginBottom: "8px",
                            cursor: selectedCategory ? "default" : "pointer",
                            padding: "4px",
                            borderRadius: "4px",
                            transition: "background 0.2s"
                          }}
                          className={selectedCategory ? "" : "hover-legend-item"}
                        >
                          <i style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", backgroundColor: item.color, flexShrink: 0 }} />
                          <span style={{ fontWeight: 600, color: "#475569", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", flex: 1 }} title={item.name}>
                            {item.name}
                          </span>
                          <strong style={{ color: "var(--navy)", fontWeight: 700 }}>{item.value}</strong>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", height: "100%", color: "#64748b", fontSize: "13px" }}>
                    No breakdown data available in selection.
                  </div>
                )}
              </div>
            </article>

            {/* Chart 3: Monthly Total Fault Summary */}
            <article className="panel chart-panel" style={{ display: "flex", flexDirection: "column", height: "350px", gridColumn: "span 2" }}>
              <div style={{ marginBottom: "16px" }}>
                <h3 style={{ margin: 0, fontSize: "15px", color: "var(--navy)", fontWeight: 700 }}>Monthly Total Fault Summary</h3>
              </div>
              <div style={{ flex: 1, width: "100%", height: "100%", minHeight: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlySummaryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                    <XAxis
                      dataKey="Month"
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
                    <Bar
                      dataKey="Faults"
                      fill="var(--blue)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={45}
                    >
                      {monthlySummaryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === monthlySummaryData.length - 1 ? "var(--blue)" : "rgba(11, 109, 255, 0.6)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>
          </div>

          {/* 9. Filtered Faults Table / Records Data Grid */}
          <div className="wide-list-container panel" style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", color: "var(--navy)", fontWeight: 700 }}>Filtered Fault Logs</h3>
                <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "#64748b" }}>Showing {tableData.length} records based on selected filters</p>
              </div>
              
              <div className="search-filter-row" style={{ margin: 0, flexShrink: 0 }}>
                <input
                  placeholder="Search table..."
                  value={tableSearch}
                  onChange={(e) => {
                    setTableSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: "6px 12px 6px 32px",
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='8'%3E%3C/circle%3E%3Cline x1='21' y1='21' x2='16.65' y2='16.65'%3E%3C/line%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "10px center",
                    fontSize: "13px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    height: "36px",
                    width: "220px",
                    outline: "none"
                  }}
                />
              </div>
            </div>

            <div className="table-scroll-container" style={{ overflow: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: "50px" }}>#</th>
                    <th>Failure Time</th>
                    <th>Station</th>
                    <th>Category</th>
                    <th>Fault Log Form</th>
                    <th>Status</th>
                    <th>Duration</th>
                    <th>Reason</th>
                    <th style={{ width: "80px", textAlign: "center" }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTableData.length > 0 ? (
                    paginatedTableData.map((r: any, idx: number) => {
                      const countIdx = (currentPage - 1) * itemsPerPage + idx + 1;
                      const cat = getRecordCategory(r);
                      const isFaulty = !r.rectificationTime;
                      
                      return (
                        <tr key={r.id}>
                          <td>{countIdx}</td>
                          <td style={{ fontSize: "12px", whiteSpace: "nowrap" }}>
                            {formatDate24(r.failureTime)}
                          </td>
                          <td style={{ fontWeight: 700, color: "var(--navy)" }}>{r.stationCode || "-"}</td>
                          <td>
                            <span className="pill info" style={{ textTransform: "uppercase", fontSize: "10px" }}>
                              {cat}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600 }}>{r.formType}</td>
                          <td>
                            <span className={`pill ${isFaulty ? "danger" : "success"}`} style={{ fontSize: "10px" }}>
                              {isFaulty ? "Faulty" : "Rectified"}
                            </span>
                          </td>
                          <td style={{ fontSize: "12px", whiteSpace: "nowrap" }}>
                            {r.formData?.durationText || r.durationText || "-"}
                          </td>
                          <td style={{ fontSize: "12px", maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.reason}>
                            {r.reason || "-"}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              className="action-btn"
                              onClick={() => openPanel("Daily Position Details", r.id)}
                              title="View Fault Details"
                              style={{ padding: "4px", background: "none", border: 0, cursor: "pointer", color: "var(--blue)" }}
                              type="button"
                            >
                              <Eye size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} style={{ textAlign: "center", color: "#64748b", padding: "20px" }}>
                        No records match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", flexWrap: "wrap", gap: "12px" }}>
                <span style={{ fontSize: "12.5px", color: "#64748b" }}>
                  Showing page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> (Total {tableData.length} records)
                </span>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    className="export-button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((c) => Math.max(1, c - 1))}
                    style={{ margin: 0, padding: "4px 10px", fontSize: "12px", background: currentPage === 1 ? "#f1f5f9" : "", color: currentPage === 1 ? "#94a3b8" : "" }}
                    type="button"
                  >
                    Previous
                  </button>
                  <button
                    className="export-button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((c) => Math.min(totalPages, c + 1))}
                    style={{ margin: 0, padding: "4px 10px", fontSize: "12px", background: currentPage === totalPages ? "#f1f5f9" : "", color: currentPage === totalPages ? "#94a3b8" : "" }}
                    type="button"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
      </div>
    </div>
  );
}

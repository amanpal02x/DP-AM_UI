import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  SlidersHorizontal, 
  Search, 
  Plus, 
  Trash2, 
  Save, 
  Download, 
  Sliders, 
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  Clock,
  Building,
  TrendingUp,
  X,
  Play,
  FileCode,
  Sparkles,
  ChevronRight,
  ArrowLeft,
  Settings,
  Layers,
  MapPin,
  ShieldAlert,
  Activity,
  ListCollapse
} from "lucide-react";
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  AreaChart, 
  Area,
  CartesianGrid 
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
import { api } from "../../api/apiClient";

interface ScreenerViewProps {
  showToast: (msg: string) => void;
}

interface Rule {
  id: string;
  field: string;
  operator: string;
  value: string;
}

const ENTITY_TYPES = [
  { value: "STATION", label: "Station Masters" },
  { value: "ASSET", label: "Telecom Assets" },
  { value: "LC_GATE", label: "LC Gates" },
  { value: "DAILY_POSITION", label: "Daily Position (Faults)" }
];

const FIELDS_BY_ENTITY: Record<string, { key: string; label: string; type: "string" | "boolean" | "number" }[]> = {
  STATION: [
    { key: "name", label: "Station Name", type: "string" },
    { key: "code", label: "Station Code", type: "string" },
    { key: "division", label: "Division", type: "string" },
    { key: "state", label: "State", type: "string" },
    { key: "category", label: "Category", type: "string" },
    { key: "hasIpis", label: "Has IPIS", type: "boolean" },
    { key: "hasPaSystem", label: "Has PA System", type: "boolean" },
    { key: "hasCctv", label: "Has CCTV", type: "boolean" },
    { key: "hasWifi", label: "Has Wi-Fi", type: "boolean" },
    { key: "hasExchange", label: "Has Exchange", type: "boolean" },
    { key: "hasTalkback", label: "Has Talkback", type: "boolean" },
    { key: "hasArt", label: "Has ART", type: "boolean" },
    { key: "hasTib", label: "Has TIB", type: "boolean" },
    { key: "hasAutoAnnouncement", label: "Has Auto Announcement", type: "boolean" }
  ],
  ASSET: [
    { key: "category", label: "Asset Category", type: "string" },
    { key: "telecomAsset", label: "Telecom Asset Name", type: "string" },
    { key: "assetMode", label: "Asset Mode", type: "string" },
    { key: "make", label: "Manufacturer/Make", type: "string" },
    { key: "model", label: "Model", type: "string" },
    { key: "serialNumber", label: "Serial Number", type: "string" },
    { key: "rdsoSpec", label: "RDSO Specification", type: "string" },
    { key: "status", label: "Operational Status", type: "string" },
    { key: "stationCode", label: "Station Code", type: "string" }
  ],
  LC_GATE: [
    { key: "gateNumber", label: "Gate Number", type: "string" },
    { key: "name", label: "Gate Name", type: "string" },
    { key: "category", label: "Gate Category", type: "string" },
    { key: "section", label: "Section", type: "string" },
    { key: "km", label: "KM Point", type: "string" },
    { key: "stationCode", label: "Associated Station", type: "string" }
  ],
  DAILY_POSITION: [
    { key: "division", label: "Division", type: "string" },
    { key: "category", label: "Failure Category", type: "string" },
    { key: "formType", label: "Equipment / Form Type", type: "number" },
    { key: "stationCode", label: "Station Code", type: "string" },
    { key: "stationName", label: "Station Name", type: "string" },
    { key: "status", label: "Fault Status", type: "string" },
    { key: "durationMinutes", label: "Downtime (Minutes)", type: "number" },
    { key: "reason", label: "Failure Reason", type: "string" },
    { key: "remarks", label: "Remarks/Action Taken", type: "string" }
  ]
};

const DEFAULT_COLUMNS: Record<string, string[]> = {
  STATION: ["code", "name", "division", "state", "category", "hasIpis", "hasCctv"],
  ASSET: ["stationCode", "category", "telecomAsset", "make", "model", "status"],
  LC_GATE: ["gateNumber", "name", "category", "section", "km", "stationCode"],
  DAILY_POSITION: ["date", "division", "category", "stationName", "status", "durationMinutes", "reason"]
};

const PREMADE_TEMPLATES = [
  {
    name: "Faulty Assets",
    description: "Telecom assets with status FAULTY",
    entityType: "ASSET",
    rawQuery: "status = FAULTY",
    rules: [{ id: "r1", field: "status", operator: "=", value: "FAULTY" }]
  },
  {
    name: "Stations without CCTV",
    description: "Station masters where CCTV is false",
    entityType: "STATION",
    rawQuery: "hasCctv = false",
    rules: [{ id: "r2", field: "hasCctv", operator: "=", value: "false" }]
  },
  {
    name: "High Downtime",
    description: "Faults exceeding 4 hours (240 mins)",
    entityType: "DAILY_POSITION",
    rawQuery: "durationMinutes > 240",
    rules: [{ id: "r3", field: "durationMinutes", operator: ">", value: "240" }]
  },
  {
    name: "IPIS in Raipur",
    description: "Raipur division stations with IPIS",
    entityType: "STATION",
    rawQuery: "division = Raipur AND hasIpis = true",
    rules: [
      { id: "r4", field: "division", operator: "=", value: "Raipur" },
      { id: "r5", field: "hasIpis", operator: "=", value: "true" }
    ]
  }
];

const CHART_COLORS = ["#0b6dff", "#0db76b", "#7047e8", "#ff8a00", "#13b8a7", "#ff3328"];

export default function ScreenerView({ showToast }: ScreenerViewProps) {
  const queryClient = useQueryClient();
  const [hasExecuted, setHasExecuted] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"raw" | "visual">("raw");
  const [entityType, setEntityType] = useState<string>("STATION");
  const [rules, setRules] = useState<Rule[]>([{ id: "1", field: "division", operator: "=", value: "Raipur" }]);
  const [rawQuery, setRawQuery] = useState<string>("division = Raipur");
  const [page, setPage] = useState<number>(1);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(DEFAULT_COLUMNS.STATION);
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [saveName, setSaveName] = useState<string>("");
  const [saveDesc, setSaveDesc] = useState<string>("");
  const [showColumnsModal, setShowColumnsModal] = useState<boolean>(false);
  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  useEffect(() => {
    setSelectedColumns(DEFAULT_COLUMNS[entityType] || []);
    if (FIELDS_BY_ENTITY[entityType] && FIELDS_BY_ENTITY[entityType].length > 0) {
      const firstField = FIELDS_BY_ENTITY[entityType][0];
      setRules([{ id: "1", field: firstField.key, operator: "=", value: firstField.type === "boolean" ? "true" : "" }]);
      setRawQuery(`${firstField.key} = ${firstField.type === "boolean" ? "true" : '""'}`);
    }
    setPage(1);
  }, [entityType]);

  const { data: savedScreensData, isLoading: isSavedLoading } = useQuery({
    queryKey: ["savedScreens"],
    queryFn: () => api.screener.getSavedQueries()
  });

  const savedScreens = savedScreensData?.data || [];

  const executeMutation = useMutation({
    mutationFn: (body: any) => api.screener.execute(body),
    onSuccess: () => {
      setHasExecuted(true);
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to execute query.");
    }
  });

  const saveMutation = useMutation({
    mutationFn: (body: any) => api.screener.saveQuery(body),
    onSuccess: () => {
      showToast("Screen saved successfully!");
      setShowSaveModal(false);
      setSaveName("");
      setSaveDesc("");
      queryClient.invalidateQueries({ queryKey: ["savedScreens"] });
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to save screen.");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.screener.deleteQuery(id),
    onSuccess: (data, variables) => {
      showToast("Saved query deleted!");
      if (selectedSavedId === variables) setSelectedSavedId(null);
      queryClient.invalidateQueries({ queryKey: ["savedScreens"] });
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to delete query.");
    }
  });

  const updateRule = (id: string, updates: Partial<Rule>) => {
    const updated = rules.map(r => {
      if (r.id === id) {
        const next = { ...r, ...updates };
        if (updates.field) {
          const targetField = FIELDS_BY_ENTITY[entityType].find(f => f.key === updates.field);
          next.value = targetField?.type === "boolean" ? "true" : "";
        }
        return next;
      }
      return r;
    });
    setRules(updated);
    compileRulesToRaw(updated);
  };

  const addRule = () => {
    if (FIELDS_BY_ENTITY[entityType] && FIELDS_BY_ENTITY[entityType].length > 0) {
      const firstField = FIELDS_BY_ENTITY[entityType][0];
      setRules([
        ...rules,
        {
          id: Date.now().toString(),
          field: firstField.key,
          operator: "=",
          value: firstField.type === "boolean" ? "true" : ""
        }
      ]);
    }
  };

  const removeRule = (id: string) => {
    if (rules.length === 1) return;
    const filtered = rules.filter(r => r.id !== id);
    setRules(filtered);
    compileRulesToRaw(filtered);
  };

  const compileRulesToRaw = (activeRules: Rule[]) => {
    const segments = activeRules.map(r => {
      const valStr = r.value === "true" || r.value === "false" ? r.value : `"${r.value}"`;
      return `${r.field} ${r.operator} ${valStr}`;
    });
    setRawQuery(segments.join(" AND "));
  };

  const handleRunQuery = () => {
    executeMutation.mutate({
      entityType,
      rules: activeTab === "visual" ? rules : undefined,
      rawQuery: activeTab === "raw" ? rawQuery : undefined,
      page,
      limit: 50
    });
  };

  const handleLoadQuery = (q: any, id: string | null = null) => {
    setSelectedSavedId(id);
    setEntityType(q.entityType);
    if (q.columns && q.columns.length > 0) {
      setSelectedColumns(q.columns);
    }
    if (q.queryJson && Array.isArray(q.queryJson)) {
      setRules(q.queryJson);
      compileRulesToRaw(q.queryJson);
      setActiveTab("visual");
    } else if (q.rawQuery) {
      setRawQuery(q.rawQuery);
      setRules([]);
      setActiveTab("raw");
    }
    
    executeMutation.mutate({
      entityType: q.entityType,
      rules: q.queryJson && Array.isArray(q.queryJson) ? q.queryJson : undefined,
      rawQuery: q.rawQuery || undefined,
      page: 1,
      limit: 50
    });
    setSidebarOpen(false);
  };

  const handleSaveScreenClick = () => {
    if (!rawQuery.trim()) {
      showToast("Cannot save an empty query.");
      return;
    }
    setShowSaveModal(true);
  };

  const handleConfirmSave = () => {
    if (!saveName.trim()) {
      showToast("Name is required");
      return;
    }
    saveMutation.mutate({
      name: saveName,
      description: saveDesc,
      entityType,
      queryJson: rules,
      rawQuery,
      columns: selectedColumns
    });
  };

  const handleExcelExport = () => {
    const records = executeMutation.data?.data?.results || [];
    if (records.length === 0) {
      showToast("No data to export!");
      return;
    }

    const exportData = records.map((rec: any) => {
      const formatted: Record<string, any> = {};
      selectedColumns.forEach(col => {
        const fieldMeta = FIELDS_BY_ENTITY[entityType]?.find(f => f.key === col);
        let val = rec[col];
        if (typeof val === "boolean") {
          val = val ? "YES" : "NO";
        }
        formatted[fieldMeta?.label || col] = val ?? "-";
      });
      return formatted;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Screener Export");
    XLSX.writeFile(workbook, `${entityType.toLowerCase()}_screener_report.xlsx`);
    showToast("Export completed successfully!");
  };

  const queryResults = executeMutation.data?.data?.results || [];
  const dashboardStats = executeMutation.data?.data?.summaryStats || {};

  const getMostFrequent = (arr: any[]) => {
    if (!arr || arr.length === 0) return "N/A";
    return [...arr].sort((a, b) => b.count - a.count)[0]?.name || "N/A";
  };

  return (
    <div style={{ display: "flex", width: "100%", height: "100%", background: "#f8fafc", color: "var(--navy)", overflow: "hidden", position: "relative" }}>
      
      {/* Floating Collapsible Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              style={{ position: "fixed", inset: 0, background: "#0f172a", zIndex: 90 }}
            />
            <motion.div 
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.25 }}
              style={{ 
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 0,
                width: "290px", 
                background: "#ffffff", 
                borderRight: "1px solid #e2e8f0", 
                display: "flex", 
                flexDirection: "column", 
                gap: "24px", 
                padding: "24px", 
                overflowY: "auto", 
                zIndex: 100,
                boxShadow: "10px 0 30px rgba(0,0,0,0.05)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px" }}>
                <span style={{ fontSize: "14px", fontWeight: 750, color: "var(--navy)" }}>SCREENS LIBRARY</span>
                <button onClick={() => setSidebarOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}>
                  <X size={20} />
                </button>
              </div>

              <div>
                <h4 style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <SlidersHorizontal size={14} style={{ color: "var(--blue)" }} />
                  Saved Screens
                </h4>
                {isSavedLoading ? (
                  <div style={{ color: "#64748b", fontSize: "13px" }}>Loading...</div>
                ) : savedScreens.length === 0 ? (
                  <div style={{ color: "#94a3b8", fontSize: "12px", fontStyle: "italic" }}>No saved screens</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {savedScreens.map((s: any) => {
                      const isActive = selectedSavedId === s.id;
                      return (
                        <div 
                          key={s.id}
                          onClick={() => handleLoadQuery(s, s.id)}
                          style={{ 
                            display: "flex", 
                            justifyContent: "space-between", 
                            alignItems: "center", 
                            padding: "8px 12px", 
                            borderRadius: "8px", 
                            background: isActive ? "var(--blue-soft)" : "transparent",
                            border: isActive ? "1px solid var(--blue)" : "1px solid transparent",
                            cursor: "pointer",
                            transition: "background 0.2s"
                          }}
                        >
                          <div style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                            <div style={{ fontSize: "13px", fontWeight: 600, color: isActive ? "var(--blue)" : "#334155" }}>{s.name}</div>
                            <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>{s.entityType}</div>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if(confirm(`Delete "${s.name}"?`)) deleteMutation.mutate(s.id);
                            }}
                            style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: "4px" }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "20px" }}>
                <h4 style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Sparkles size={14} style={{ color: "var(--purple)" }} />
                  Templates
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {PREMADE_TEMPLATES.map((t, idx) => (
                    <div 
                      key={idx}
                      onClick={() => handleLoadQuery(t, `template-${idx}`)}
                      style={{ 
                        padding: "10px", 
                        borderRadius: "8px", 
                        background: "#f8fafc", 
                        border: "1px solid #e2e8f0", 
                        cursor: "pointer",
                        transition: "background 0.2s, border 0.2s"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--blue-soft)";
                        e.currentTarget.style.borderColor = "var(--blue)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#f8fafc";
                        e.currentTarget.style.borderColor = "#e2e8f0";
                      }}
                    >
                      <div style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>{t.name}</div>
                      <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>{t.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
        
        {/* Floating Sidebar Toggle Button */}
        <button 
          onClick={() => setSidebarOpen(true)}
          style={{ 
            position: "absolute", 
            top: "20px", 
            left: "20px", 
            zIndex: 80, 
            display: "flex", 
            alignItems: "center", 
            gap: "8px", 
            padding: "8px 14px", 
            borderRadius: "8px", 
            background: "#ffffff", 
            border: "1px solid #cbd5e1", 
            color: "#475569", 
            fontWeight: 600, 
            fontSize: "13px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
            cursor: "pointer"
          }}
        >
          <SlidersHorizontal size={14} style={{ color: "var(--blue)" }} /> Screens Library
        </button>

        <AnimatePresence mode="wait">
          {!hasExecuted ? (
            /* Claude AI Chat-Style Landing Page */
            <motion.div 
              key="landing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              style={{ 
                flex: 1, 
                display: "flex", 
                flexDirection: "column", 
                alignItems: "center", 
                justifyContent: "center", 
                padding: "80px 24px 40px 24px",
                maxWidth: "800px",
                margin: "0 auto",
                width: "100%"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                <div style={{ padding: "10px", borderRadius: "14px", background: "linear-gradient(135deg, var(--blue) 0%, var(--purple) 100%)", boxShadow: "0 4px 15px rgba(11, 109, 255, 0.2)" }}>
                  <Sparkles size={32} style={{ color: "#fff" }} />
                </div>
              </div>

              <h2 style={{ fontSize: "36px", fontWeight: 600, fontFamily: "Inter, sans-serif", textAlign: "center", marginBottom: "32px", color: "var(--navy)" }}>
                What shall we analyze today?
              </h2>

              {/* Central Pill Search Bar */}
              <div 
                style={{ 
                  width: "100%", 
                  background: "#ffffff", 
                  borderRadius: "20px", 
                  padding: "16px 20px", 
                  border: "1px solid #cbd5e1",
                  boxShadow: "0 10px 30px rgba(15, 23, 42, 0.05)",
                  display: "flex", 
                  flexDirection: "column",
                  gap: "12px"
                }}
              >
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <select 
                    value={entityType}
                    onChange={(e) => setEntityType(e.target.value)}
                    style={{ 
                      background: "#f1f5f9", 
                      border: "none", 
                      color: "var(--blue)", 
                      fontWeight: 700, 
                      fontSize: "13px", 
                      padding: "6px 12px", 
                      borderRadius: "10px", 
                      cursor: "pointer" 
                    }}
                  >
                    {ENTITY_TYPES.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>

                  <div style={{ height: "18px", width: "1px", background: "#e2e8f0" }} />

                  <input 
                    type="text"
                    value={rawQuery}
                    onChange={(e) => setRawQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleRunQuery()}
                    placeholder="Type a query (e.g. division = Raipur AND status = FAULTY)..."
                    style={{ 
                      flex: 1, 
                      background: "transparent", 
                      border: "none", 
                      color: "#0f172a", 
                      outline: "none", 
                      fontSize: "16px" 
                    }}
                  />

                  <motion.button 
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleRunQuery}
                    style={{ 
                      background: "var(--blue)", 
                      border: "none", 
                      color: "#fff", 
                      padding: "8px 18px", 
                      borderRadius: "12px", 
                      fontWeight: 700, 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "6px",
                      cursor: "pointer" 
                    }}
                  >
                    <Play size={14} fill="#fff" /> Run
                  </motion.button>
                </div>

                {/* Sub-bar Actions */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f1f5f9", paddingTop: "12px" }}>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button 
                      onClick={() => setActiveTab(activeTab === "visual" ? "raw" : "visual")}
                      style={{ 
                        background: "none", 
                        border: "none", 
                        color: "#64748b", 
                        fontSize: "12px", 
                        cursor: "pointer",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                    >
                      <Sliders size={12} /> {activeTab === "visual" ? "Use Raw Query" : "Use Visual Builder"}
                    </button>
                  </div>
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>Press Enter to search</span>
                </div>
              </div>

              {/* Visual Builder nested on landing page if toggled */}
              {activeTab === "visual" && (
                <div style={{ width: "100%", background: "#ffffff", border: "1px solid #cbd5e1", boxShadow: "0 10px 25px rgba(0,0,0,0.02)", borderRadius: "12px", padding: "16px", marginTop: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  {rules.map((rule) => {
                    const targetFields = FIELDS_BY_ENTITY[entityType] || [];
                    const matchedField = targetFields.find(f => f.key === rule.field);
                    return (
                      <div key={rule.id} style={{ display: "flex", gap: "8px" }}>
                        <select 
                          value={rule.field} 
                          onChange={(e) => updateRule(rule.id, { field: e.target.value })}
                          style={{ padding: "6px 10px", borderRadius: "8px", background: "#f8fafc", color: "#334155", border: "1px solid #e2e8f0", flex: 1, fontSize: "13px" }}
                        >
                          {targetFields.map(f => (
                            <option key={f.key} value={f.key}>{f.label}</option>
                          ))}
                        </select>
                        <select 
                          value={rule.operator} 
                          onChange={(e) => updateRule(rule.id, { operator: e.target.value })}
                          style={{ padding: "6px 10px", borderRadius: "8px", background: "#f8fafc", color: "#334155", border: "1px solid #e2e8f0", width: "80px", fontSize: "13px" }}
                        >
                          <option value="=">=</option>
                          <option value="!=">!=</option>
                          <option value="contains">contains</option>
                        </select>
                        <input 
                          type="text" 
                          value={rule.value} 
                          onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                          placeholder="Value..."
                          style={{ padding: "6px 10px", borderRadius: "8px", background: "#ffffff", color: "#0f172a", border: "1px solid #cbd5e1", flex: 1, fontSize: "13px" }}
                        />
                        <button onClick={() => removeRule(rule.id)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer" }}><X size={16} /></button>
                      </div>
                    );
                  })}
                  <button onClick={addRule} style={{ alignSelf: "flex-start", background: "none", border: "none", color: "var(--blue)", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>+ Add condition</button>
                </div>
              )}

              {/* Suggestion Quick-Buttons */}
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px", marginTop: "24px" }}>
                {PREMADE_TEMPLATES.map((t, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleLoadQuery(t, `template-${idx}`)}
                    style={{ 
                      background: "#ffffff", 
                      border: "1px solid #cbd5e1", 
                      color: "#475569", 
                      padding: "8px 16px", 
                      borderRadius: "30px", 
                      fontSize: "13px", 
                      fontWeight: 500,
                      cursor: "pointer",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--blue-soft)";
                      e.currentTarget.style.borderColor = "var(--blue)";
                      e.currentTarget.style.color = "var(--blue)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#ffffff";
                      e.currentTarget.style.borderColor = "#cbd5e1";
                      e.currentTarget.style.color = "#475569";
                    }}
                  >
                    {t.name}
                  </button>
                ))}
              </div>

            </motion.div>
          ) : (
            /* Results & Dashboard Analytics Grid */
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ flex: 1, overflowY: "auto", padding: "80px 24px 24px 24px", display: "flex", flexDirection: "column", gap: "24px" }}
            >
              
              {/* Header Navigation Back bar */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button 
                  onClick={() => setHasExecuted(false)}
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "8px", 
                    background: "none", 
                    border: "none", 
                    color: "var(--blue)", 
                    fontWeight: 700, 
                    cursor: "pointer",
                    fontSize: "14px"
                  }}
                >
                  <ArrowLeft size={16} /> New Search
                </button>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button 
                    onClick={handleSaveScreenClick}
                    style={{ 
                      padding: "8px 14px", 
                      borderRadius: "8px", 
                      background: "#ffffff", 
                      border: "1px solid #cbd5e1", 
                      color: "#475569", 
                      fontSize: "13px", 
                      fontWeight: 600, 
                      cursor: "pointer" 
                    }}
                  >
                    Save Screen
                  </button>
                </div>
              </div>

              {executeMutation.isPending ? (
                /* Shimmering Skeleton Loader View */
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  
                  {/* Skeleton KPI Row (3 columns) */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
                    {[1, 2, 3].map(i => (
                      <div key={i} className="shimmer-pulse" style={{ height: "76px", borderRadius: "10px", background: "#e2e8f0", animation: "pulse 1.5s infinite" }} />
                    ))}
                  </div>

                  {/* Skeleton Charts Row */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "24px" }}>
                    <div className="shimmer-pulse" style={{ height: "300px", borderRadius: "12px", background: "#e2e8f0", animation: "pulse 1.5s infinite" }} />
                    <div className="shimmer-pulse" style={{ height: "300px", borderRadius: "12px", background: "#e2e8f0", animation: "pulse 1.5s infinite" }} />
                  </div>

                  {/* Skeleton Table Row */}
                  <div className="shimmer-pulse" style={{ height: "200px", borderRadius: "12px", background: "#e2e8f0", animation: "pulse 1.5s infinite" }} />

                  <style>{`
                    @keyframes pulse {
                      0% { opacity: 0.6; }
                      50% { opacity: 0.3; }
                      100% { opacity: 0.6; }
                    }
                  `}</style>

                </div>
              ) : (
                /* Actual Dashboard Analytics Data */
                <>
                  {/* KPI Summary Row - Compact 3 Columns Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
                    
                    {/* Card 1: Matches count */}
                    <div style={{ padding: "12px 18px", background: "linear-gradient(135deg, rgba(11,109,255,0.06) 0%, rgba(11,109,255,0.01) 100%)", borderRadius: "10px", border: "1px solid rgba(11,109,255,0.12)", display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: "76px" }}>
                      <div>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--blue)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Matches Count</div>
                        <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--navy)", marginTop: "2px" }}>{dashboardStats.total || 0}</div>
                      </div>
                      <div style={{ padding: "8px", borderRadius: "8px", background: "#fff", color: "var(--blue)", boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}>
                        <TrendingUp size={18} />
                      </div>
                    </div>

                    {/* Card 2: Contextual Details depending on entity */}
                    {entityType === "STATION" && (
                      <div style={{ padding: "12px 18px", background: "linear-gradient(135deg, rgba(112,71,232,0.06) 0%, rgba(112,71,232,0.01) 100%)", borderRadius: "10px", border: "1px solid rgba(112,71,232,0.12)", display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: "76px" }}>
                        <div>
                          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--purple)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Primary Class</div>
                          <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--navy)", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "160px" }}>{getMostFrequent(dashboardStats.categories)}</div>
                        </div>
                        <div style={{ padding: "8px", borderRadius: "8px", background: "#fff", color: "var(--purple)", boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}>
                          <Layers size={18} />
                        </div>
                      </div>
                    )}

                    {entityType === "ASSET" && (
                      <div style={{ padding: "12px 18px", background: "linear-gradient(135deg, rgba(255,51,40,0.06) 0%, rgba(255,51,40,0.01) 100%)", borderRadius: "10px", border: "1px solid rgba(255,51,40,0.12)", display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: "76px" }}>
                        <div>
                          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--red)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Faulty Count</div>
                          <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--navy)", marginTop: "2px" }}>
                            {dashboardStats.status?.find((s: any) => s.name === "FAULTY")?.count || 0}
                          </div>
                        </div>
                        <div style={{ padding: "8px", borderRadius: "8px", background: "#fff", color: "var(--red)", boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}>
                          <AlertTriangle size={18} />
                        </div>
                      </div>
                    )}

                    {entityType === "DAILY_POSITION" && (
                      <div style={{ padding: "12px 18px", background: "linear-gradient(135deg, rgba(255,51,40,0.06) 0%, rgba(255,51,40,0.01) 100%)", borderRadius: "10px", border: "1px solid rgba(255,51,40,0.12)", display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: "76px" }}>
                        <div>
                          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--red)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Unresolved Faults</div>
                          <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--navy)", marginTop: "2px" }}>
                            {dashboardStats.status?.filter((s: any) => s.name !== "RECTIFIED").reduce((acc: number, cur: any) => acc + cur.count, 0) || 0}
                          </div>
                        </div>
                        <div style={{ padding: "8px", borderRadius: "8px", background: "#fff", color: "var(--red)", boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}>
                          <ShieldAlert size={18} />
                        </div>
                      </div>
                    )}

                    {entityType === "LC_GATE" && (
                      <div style={{ padding: "12px 18px", background: "linear-gradient(135deg, rgba(112,71,232,0.06) 0%, rgba(112,71,232,0.01) 100%)", borderRadius: "10px", border: "1px solid rgba(112,71,232,0.12)", display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: "76px" }}>
                        <div>
                          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--purple)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Interlocked</div>
                          <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--navy)", marginTop: "2px" }}>
                            {dashboardStats.categories?.find((c: any) => c.name.toLowerCase().includes("interlock"))?.count || 0}
                          </div>
                        </div>
                        <div style={{ padding: "8px", borderRadius: "8px", background: "#fff", color: "var(--purple)", boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}>
                          <CheckCircle size={18} />
                        </div>
                      </div>
                    )}

                    {/* Card 3: Primary Division */}
                    <div style={{ padding: "12px 18px", background: "linear-gradient(135deg, rgba(13,183,107,0.06) 0%, rgba(13,183,107,0.01) 100%)", borderRadius: "10px", border: "1px solid rgba(13,183,107,0.12)", display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: "76px" }}>
                      <div>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--green)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Primary Division</div>
                        <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--navy)", marginTop: "2px" }}>{getMostFrequent(dashboardStats.divisions)}</div>
                      </div>
                      <div style={{ padding: "8px", borderRadius: "8px", background: "#fff", color: "var(--green)", boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}>
                        <Building size={18} />
                      </div>
                    </div>

                  </div>

                  {/* Mixed Charts workspace */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "24px" }}>
                    
                    {/* Donut chart - Categorical distribution */}
                    <div style={{ padding: "24px", background: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.03)", display: "flex", flexDirection: "column" }}>
                      <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--navy)", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ width: "4px", height: "16px", background: "var(--blue)", borderRadius: "2px" }} />
                        Categorical distribution
                      </h4>
                      <div style={{ width: "100%", height: "260px", position: "relative" }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={
                                entityType === "STATION" 
                                  ? dashboardStats.categories 
                                  : (entityType === "LC_GATE" ? dashboardStats.categories : dashboardStats.status) || []
                              }
                              cx="50%"
                              cy="50%"
                              innerRadius={68}
                              outerRadius={88}
                              paddingAngle={4}
                              dataKey="count"
                            >
                              {((entityType === "STATION" 
                                  ? dashboardStats.categories 
                                  : (entityType === "LC_GATE" ? dashboardStats.categories : dashboardStats.status)) || []).map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 4px 10px rgba(0,0,0,0.05)" }} />
                            <Legend verticalAlign="bottom" iconType="circle" />
                          </PieChart>
                        </ResponsiveContainer>
                        
                        {/* Center text overlay in Donut chart (simple, clean layout) */}
                        <div style={{ position: "absolute", top: "45%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", pointerEvents: "none" }}>
                          <span style={{ fontSize: "24px", fontWeight: 800, color: "var(--navy)" }}>{dashboardStats.total}</span>
                          <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total</div>
                        </div>
                      </div>
                    </div>

                    {/* Gradient Bar Chart - Breakdown by Division */}
                    <div style={{ padding: "24px", background: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.03)", display: "flex", flexDirection: "column" }}>
                      <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--navy)", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ width: "4px", height: "16px", background: "var(--purple)", borderRadius: "2px" }} />
                        Breakdown by Division
                      </h4>
                      <div style={{ width: "100%", height: "260px" }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={dashboardStats.divisions || []}>
                            <defs>
                              <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="var(--blue)" stopOpacity={0.9} />
                                <stop offset="100%" stopColor="var(--purple)" stopOpacity={0.8} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                            <YAxis allowDecimals={false} stroke="#64748b" fontSize={11} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 4px 10px rgba(0,0,0,0.05)" }} />
                            <Bar dataKey="count" fill="url(#barGrad)" radius={[6, 6, 0, 0]} maxBarSize={50} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Chronological failure Area chart for Daily Positions */}
                    {entityType === "DAILY_POSITION" && dashboardStats.timeline && (
                      <div style={{ gridColumn: "span 2", padding: "24px", background: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.03)" }}>
                        <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--navy)", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ width: "4px", height: "16px", background: "var(--green)", borderRadius: "2px" }} />
                          Chronological failure trends
                        </h4>
                        <div style={{ width: "100%", height: "220px" }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dashboardStats.timeline}>
                              <defs>
                                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#0db76b" stopOpacity={0.25}/>
                                  <stop offset="95%" stopColor="#0db76b" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                              <YAxis allowDecimals={false} stroke="#64748b" fontSize={11} />
                              <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px" }} />
                              <Area type="monotone" dataKey="count" stroke="var(--green)" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                  </div>

                  {/* Data Table */}
                  <div style={{ padding: "24px", background: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.03)", display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <h3 style={{ fontSize: "15px", fontWeight: 750, color: "var(--navy)" }}>MATCHED RECORDS</h3>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button onClick={() => setShowColumnsModal(true)} style={{ padding: "6px 12px", borderRadius: "8px", background: "#f1f5f9", border: "none", color: "#475569", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>Edit Columns</button>
                        <button onClick={handleExcelExport} style={{ padding: "6px 12px", borderRadius: "8px", background: "var(--green)", border: "none", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>Export Excel</button>
                      </div>
                    </div>

                    <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "10px" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                        <thead>
                          <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                            {selectedColumns.map(col => {
                              const fieldMeta = FIELDS_BY_ENTITY[entityType]?.find(f => f.key === col);
                              return <th key={col} style={{ padding: "14px 18px", fontSize: "12px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>{fieldMeta?.label || col}</th>;
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {queryResults.map((rec: any, idx: number) => (
                            <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              {selectedColumns.map(col => {
                                let val = rec[col];
                                if (typeof val === "boolean") {
                                  return (
                                    <td key={col} style={{ padding: "14px 18px" }}>
                                      <span style={{ padding: "3px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 700, background: val ? "var(--green-soft)" : "var(--red-soft)", color: val ? "var(--green)" : "var(--red)" }}>
                                        {val ? "YES" : "NO"}
                                      </span>
                                    </td>
                                  );
                                }
                                if (col === "status") {
                                  const isFaulty = val === "FAULTY" || val === "UNRESOLVED";
                                  return (
                                    <td key={col} style={{ padding: "14px 18px" }}>
                                      <span style={{ padding: "3px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 700, background: isFaulty ? "var(--red-soft)" : "var(--green-soft)", color: isFaulty ? "var(--red)" : "var(--green)" }}>
                                        {val}
                                      </span>
                                    </td>
                                  );
                                }
                                if (col === "date" && val) {
                                  val = new Date(val).toLocaleDateString();
                                }
                                return <td key={col} style={{ padding: "14px 18px", fontSize: "13px", color: "#334155" }}>{val ?? "-"}</td>;
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.3)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ width: "420px", padding: "24px", background: "#ffffff", borderRadius: "12px", border: "1px solid #cbd5e1", display: "flex", flexDirection: "column", gap: "16px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--navy)" }}>Save Screen</h3>
              <button onClick={() => setShowSaveModal(false)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}><X size={20} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Screen Name *</label>
              <input type="text" value={saveName} onChange={(e) => setSaveName(e.target.value)} style={{ padding: "10px", borderRadius: "8px", background: "#ffffff", color: "#0f172a", border: "1px solid #cbd5e1" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Description</label>
              <textarea value={saveDesc} onChange={(e) => setSaveDesc(e.target.value)} style={{ padding: "10px", borderRadius: "8px", background: "#ffffff", color: "#0f172a", border: "1px solid #cbd5e1", minHeight: "60px" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button onClick={() => setShowSaveModal(false)} style={{ padding: "8px 16px", borderRadius: "8px", background: "none", border: "none", color: "#cbd5e1", cursor: "pointer" }}>Cancel</button>
              <button onClick={handleConfirmSave} style={{ padding: "8px 16px", borderRadius: "8px", background: "var(--blue)", border: "none", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Columns Modal */}
      {showColumnsModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.3)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ width: "360px", padding: "24px", background: "#ffffff", borderRadius: "12px", border: "1px solid #cbd5e1", display: "flex", flexDirection: "column", gap: "16px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--navy)" }}>Grid Columns</h3>
              <button onClick={() => setShowColumnsModal(false)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}><X size={20} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "300px", overflowY: "auto" }}>
              {FIELDS_BY_ENTITY[entityType]?.map(f => {
                const isChecked = selectedColumns.includes(f.key);
                return (
                  <label key={f.key} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer", color: "#334155" }}>
                    <input 
                      type="checkbox" 
                      checked={isChecked}
                      onChange={() => {
                        if (isChecked) {
                          setSelectedColumns(selectedColumns.filter(c => c !== f.key));
                        } else {
                          setSelectedColumns([...selectedColumns, f.key]);
                        }
                      }}
                      style={{ width: "16px", height: "16px" }}
                    />
                    {f.label}
                  </label>
                );
              })}
            </div>
            <button onClick={() => setShowColumnsModal(false)} style={{ padding: "10px", borderRadius: "8px", background: "var(--blue)", border: "none", color: "#fff", fontWeight: 700, cursor: "pointer", marginTop: "10px" }}>Apply</button>
          </div>
        </div>
      )}

    </div>
  );
}

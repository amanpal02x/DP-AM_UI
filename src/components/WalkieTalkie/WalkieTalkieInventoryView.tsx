import { useState, useEffect, useRef } from "react";
import { Plus, X, Search, Download, PlusCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/apiClient";
import { useAppStore } from "../../App";

interface WalkieTalkieInventoryViewProps {
  showToast: (message: string) => void;
}

export default function WalkieTalkieInventoryViewComponent({ showToast }: WalkieTalkieInventoryViewProps) {
  const queryClient = useQueryClient();
  const [lobbies, setLobbies] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { role } = useAppStore();
  const isNonDivisional = role === "SUPER_ADMIN" || role === "ALL_DIVISION_VIEWER";
  const isViewer = role === "VIEWER" || role === "DIVISIONAL_VIEWER" || role === "ALL_DIVISION_VIEWER";

  // Form states
  const [isLobbyModalOpen, setIsLobbyModalOpen] = useState(false);
  const [lobbyName, setLobbyName] = useState("");
  const [totalWalkieTalkies, setTotalWalkieTalkies] = useState<number | "">("");
  const [lobbyDivision, setLobbyDivision] = useState("Raipur");
  const [editingLobbyId, setEditingLobbyId] = useState<string | null>(null);
  const [walkieTalkies, setWalkieTalkies] = useState<{ serialNumber: string; makeModel: string }[]>([]);
  const [hasJustImported, setHasJustImported] = useState(false);

  // Dialog state for viewing serial numbers
  const [isViewSerialsModalOpen, setIsViewSerialsModalOpen] = useState(false);
  const [viewingLobby, setViewingLobby] = useState<any>(null);

  // States for managing individual walkie-talkies inside a lobby
  const [editingWTIndex, setEditingWTIndex] = useState<number | null>(null);
  const [editingWTSerial, setEditingWTSerial] = useState("");
  const [editingWTMakeModel, setEditingWTMakeModel] = useState("");
  const [newWTSerial, setNewWTSerial] = useState("");
  const [newWTMakeModel, setNewWTMakeModel] = useState("Motorola");
  const [isMutating, setIsMutating] = useState(false);
  const [wtSearchTerm, setWtSearchTerm] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const filteredWalkieTalkies = viewingLobby?.walkieTalkies
    ? viewingLobby.walkieTalkies.filter((wt: any) => 
        (wt.serialNumber || "").toLowerCase().includes(wtSearchTerm.toLowerCase()) ||
        (wt.makeModel || "Motorola").toLowerCase().includes(wtSearchTerm.toLowerCase())
      )
    : [];

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchLobbies = async () => {
    try {
      setIsLoading(true);
      const res = await api.walkieTalkie.listLobbies();
      if (res.success) setLobbies(res.data);
    } catch (err: any) {
      showToast(err.message || "Failed to fetch lobbies");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchLobbies(); }, []);

  const handleOpenAddModal = () => {
    setLobbyName("");
    setTotalWalkieTalkies("");
    setLobbyDivision("Raipur");
    setEditingLobbyId(null);
    setWalkieTalkies([]);
    setHasJustImported(false);
    setIsLobbyModalOpen(true);
  };

  const handleOpenEditModal = (lobby: any) => {
    setLobbyName(lobby.lobbyName);
    const lobbyWTs = lobby.walkieTalkies || [];
    setTotalWalkieTalkies(lobbyWTs.length > 0 ? lobbyWTs.length : lobby.totalWalkieTalkies);
    setLobbyDivision(lobby.division || "Raipur");
    setEditingLobbyId(lobby.id);
    setWalkieTalkies(lobbyWTs);
    setHasJustImported(false);
    setIsLobbyModalOpen(true);
  };

  const handleSaveLobby = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lobbyName.trim() || totalWalkieTalkies === "") {
      showToast("Lobby name and total count are required");
      return;
    }
    try {
      setIsMutating(true);
      const res = await api.walkieTalkie.upsertLobby({
        lobbyName: lobbyName.trim(),
        totalWalkieTalkies: Number(totalWalkieTalkies),
        division: lobbyDivision,
        walkieTalkies,
      });
      if (res.success) {
        showToast(editingLobbyId ? "Lobby updated successfully" : "Lobby created successfully");
        setIsLobbyModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
        queryClient.invalidateQueries({ queryKey: ["walkie-talkie-lobbies-select"] });
        fetchLobbies();
      }
    } catch (err: any) {
      showToast(err.message || "Failed to save lobby");
    } finally {
      setIsMutating(false);
    }
  };

  const handleDeleteLobby = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this lobby?")) return;
    try {
      setIsMutating(true);
      const res = await api.walkieTalkie.deleteLobby(id);
      if (res.success) {
        showToast("Lobby deleted successfully");
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
        queryClient.invalidateQueries({ queryKey: ["walkie-talkie-lobbies-select"] });
        fetchLobbies();
      }
    } catch (err: any) {
      showToast(err.message || "Failed to delete lobby");
    } finally {
      setIsMutating(false);
    }
  };

  const handleAddSingleWalkieTalkie = async (lobby: any) => {
    if (!newWTSerial.trim() || !newWTMakeModel.trim()) {
      showToast("Please enter both Serial Number and Make/Model.");
      return;
    }
    const currentList = Array.isArray(lobby.walkieTalkies) ? lobby.walkieTalkies : [];
    const duplicate = currentList.some((wt: any) => wt.serialNumber.toLowerCase() === newWTSerial.trim().toLowerCase());
    if (duplicate) {
      showToast("This serial number already exists in this lobby.");
      return;
    }
    const updatedList = [...currentList, { serialNumber: newWTSerial.trim(), makeModel: newWTMakeModel.trim() }];
    try {
      setIsMutating(true);
      const res = await api.walkieTalkie.upsertLobby({
        lobbyName: lobby.lobbyName,
        totalWalkieTalkies: updatedList.length,
        division: lobby.division,
        walkieTalkies: updatedList,
      });
      if (res.success) {
        showToast("Walkie-talkie added successfully.");
        setNewWTSerial("");
        const refreshedLobby = { ...lobby, walkieTalkies: updatedList };
        setViewingLobby(refreshedLobby);
        const updatedLobbies = lobbies.map(l => l.id === lobby.id ? refreshedLobby : l);
        setLobbies(updatedLobbies);
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
        queryClient.invalidateQueries({ queryKey: ["walkie-talkie-lobbies-select"] });
      }
    } catch (err: any) {
      showToast(err.message || "Failed to add walkie-talkie.");
    } finally {
      setIsMutating(false);
    }
  };

  const handleDeleteSingleWalkieTalkie = async (lobby: any, indexToDelete: number) => {
    if (!window.confirm("Are you sure you want to remove this walkie-talkie?")) return;
    const currentList = Array.isArray(lobby.walkieTalkies) ? lobby.walkieTalkies : [];
    const updatedList = currentList.filter((_: any, idx: number) => idx !== indexToDelete);
    try {
      setIsMutating(true);
      const res = await api.walkieTalkie.upsertLobby({
        lobbyName: lobby.lobbyName,
        totalWalkieTalkies: updatedList.length,
        division: lobby.division,
        walkieTalkies: updatedList,
      });
      if (res.success) {
        showToast("Walkie-talkie removed successfully.");
        const refreshedLobby = { ...lobby, walkieTalkies: updatedList };
        setViewingLobby(refreshedLobby);
        const updatedLobbies = lobbies.map(l => l.id === lobby.id ? refreshedLobby : l);
        setLobbies(updatedLobbies);
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
        queryClient.invalidateQueries({ queryKey: ["walkie-talkie-lobbies-select"] });
      }
    } catch (err: any) {
      showToast(err.message || "Failed to remove walkie-talkie.");
    } finally {
      setIsMutating(false);
    }
  };

  const handleSaveSingleWalkieTalkieEdit = async (lobby: any, indexToEdit: number) => {
    if (!editingWTSerial.trim() || !editingWTMakeModel.trim()) {
      showToast("Fields cannot be empty.");
      return;
    }
    const currentList = Array.isArray(lobby.walkieTalkies) ? lobby.walkieTalkies : [];
    const duplicate = currentList.some((wt: any, idx: number) => 
      idx !== indexToEdit && wt.serialNumber.toLowerCase() === editingWTSerial.trim().toLowerCase()
    );
    if (duplicate) {
      showToast("This serial number already exists in this lobby.");
      return;
    }

    const updatedList = currentList.map((wt: any, idx: number) => 
      idx === indexToEdit ? { serialNumber: editingWTSerial.trim(), makeModel: editingWTMakeModel.trim() } : wt
    );

    try {
      setIsMutating(true);
      const res = await api.walkieTalkie.upsertLobby({
        lobbyName: lobby.lobbyName,
        totalWalkieTalkies: updatedList.length,
        division: lobby.division,
        walkieTalkies: updatedList,
      });
      if (res.success) {
        showToast("Walkie-talkie updated successfully.");
        setEditingWTIndex(null);
        const refreshedLobby = { ...lobby, walkieTalkies: updatedList };
        setViewingLobby(refreshedLobby);
        const updatedLobbies = lobbies.map(l => l.id === lobby.id ? refreshedLobby : l);
        setLobbies(updatedLobbies);
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
        queryClient.invalidateQueries({ queryKey: ["walkie-talkie-lobbies-select"] });
      }
    } catch (err: any) {
      showToast(err.message || "Failed to update walkie-talkie.");
    } finally {
      setIsMutating(false);
    }
  };

  const handleInputClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["csv", "xlsx", "xls"].includes(ext || "")) {
      showToast("Please upload a valid .xlsx, .xls, or .csv file.");
      return;
    }

    try {
      const XLSX = await import("xlsx");
      const reader = new FileReader();

      reader.onload = (loadEvent) => {
        try {
          let rows: any[] = [];
          if (ext === "xlsx" || ext === "xls") {
            const workbook = XLSX.read(loadEvent.target?.result, { type: "array" });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
          } else {
            const csvText = loadEvent.target?.result as string;
            const lines = csvText.split(/\r?\n/);
            if (lines.length === 0) return;
            const headers = lines[0].split(",").map(h => h.trim().replace(/^["']|["']$/g, ""));
            for (let i = 1; i < lines.length; i++) {
              if (!lines[i].trim()) continue;
              const values = lines[i].split(",").map(v => v.trim().replace(/^["']|["']$/g, ""));
              const row: Record<string, string> = {};
              headers.forEach((h, idx) => {
                row[h] = values[idx] || "";
              });
              rows.push(row);
            }
          }

          if (rows.length === 0) {
            showToast("No data found in the uploaded file.");
            return;
          }

          const keys = Object.keys(rows[0]);
          const serialKey = keys.find(k => {
            const lk = k.toLowerCase().replace(/[\s_-]/g, "");
            return lk.includes("serial") || lk === "sn" || lk === "wtsn" || lk.includes("wtno") || lk === "serialnumber";
          }) || keys[0];

          const makeModelKey = keys.find(k => {
            const lk = k.toLowerCase().replace(/[\s_-]/g, "");
            return lk.includes("make") || lk.includes("model") || lk.includes("brand");
          });

          const imported = rows
            .map(row => {
              const sn = String(row[serialKey] || "").trim();
              const mm = makeModelKey ? String(row[makeModelKey] || "").trim() : "";
              return { serialNumber: sn, makeModel: mm || "Motorola" };
            })
            .filter(item => item.serialNumber);

          if (imported.length === 0) {
            showToast("No serial numbers could be extracted from the file.");
            return;
          }

          const seen = new Set();
          const uniqueWTs: { serialNumber: string; makeModel: string }[] = [];
          for (const item of imported) {
            const lowSn = item.serialNumber.toLowerCase();
            if (!seen.has(lowSn)) {
              seen.add(lowSn);
              uniqueWTs.push(item);
            }
          }

          setWalkieTalkies(uniqueWTs);
          setTotalWalkieTalkies(uniqueWTs.length);
          setHasJustImported(true);
          showToast(`Successfully imported and counted ${uniqueWTs.length} unique walkie-talkies.`);
        } catch (err) {
          showToast("Error parsing file structure.");
        }
      };

      if (ext === "xlsx" || ext === "xls") {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file);
      }
    } catch (err) {
      showToast("Failed to load Excel parser library.");
    }
  };

  const filteredLobbies = lobbies.filter(l => 
    String(l.lobbyName || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="dashboard-scroll-wrap" style={{ flex: 1, overflowY: "auto" }}>
      <div style={{ padding: "20px 24px 20px 30px", display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "15px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "22px", color: "var(--navy)", fontWeight: 700 }}>Walkie-Talkie Inventory</h2>
        </div>
         <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <input 
            type="text" 
            placeholder="Search lobby..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            style={{
              padding: "0 14px",
              borderRadius: "8px",
              border: "1px solid var(--line)",
              fontSize: "14px",
              outline: "none",
              width: "220px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
              height: "38px",
              boxSizing: "border-box"
            }} 
          />
          {!isViewer && (
            <button 
              onClick={handleOpenAddModal} 
              style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: "6px", 
                padding: "0 14px", 
                borderRadius: "8px", 
                background: "#2563eb", 
                color: "#ffffff", 
                border: "none", 
                fontSize: "14px", 
                fontWeight: 600, 
                cursor: "pointer", 
                height: "38px", 
                boxSizing: "border-box",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                transition: "all 0.15s ease"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#1d4ed8"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#2563eb"; }}
            >
              <Plus size={16} /> Add New Lobby
            </button>
          )}
        </div>
      </div>

      <div className="panel" style={{ padding: "20px", background: "transparent", border: "none", boxShadow: "none" }}>
        <h3 style={{ margin: "0 0 15px", fontSize: "16px", color: "var(--navy)", fontWeight: 600 }}>Lobby Inventory Status</h3>
        {isLoading && lobbies.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>Loading lobbies data...</div>
        ) : lobbies.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
            No lobbies registered yet. Click <strong>Add New Lobby</strong> to get started.
          </div>
        ) : (
          <div className="table-scroll-container custom-scrollbar" style={{ overflowY: "auto", maxHeight: "420px", paddingRight: "6px" }}>
            <style>{`
              .wt-lobby-table {
                border-collapse: separate;
                border-spacing: 0 12px;
                width: 100%;
                margin-top: -12px;
              }
              .wt-lobby-row {
                background: #ffffff;
                transition: all 0.2s ease-in-out;
              }
              .wt-lobby-row:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 10px rgba(13, 59, 111, 0.08) !important;
              }
              .wt-lobby-cell {
                padding: 10px 16px;
                background: #ffffff;
                border-top: 1px solid #e2e8f0;
                border-bottom: 1px solid #e2e8f0;
                font-size: 13.5px;
                color: #334155;
                font-family: 'Outfit', 'Inter', sans-serif;
              }
              .wt-lobby-cell:first-child {
                border-left: 1px solid #e2e8f0;
                border-top-left-radius: 10px;
                border-bottom-left-radius: 10px;
              }
              .wt-lobby-cell:last-child {
                border-right: 1px solid #e2e8f0;
                border-top-right-radius: 10px;
                border-bottom-right-radius: 10px;
              }
              .wt-lobby-row.completed .wt-lobby-cell {
                border-top-color: #82C43C;
                border-bottom-color: #82C43C;
              }
              .wt-lobby-row.completed .wt-lobby-cell:first-child {
                border-left-color: #82C43C;
                border-left-width: 1.5px;
              }
              .wt-lobby-row.completed .wt-lobby-cell:last-child {
                border-right-color: #82C43C;
                border-right-width: 1.5px;
              }
              .wt-lobby-th {
                position: sticky;
                top: 0;
                background: #f8f9fb !important;
                z-index: 10;
                border: none;
                color: var(--muted);
                font-weight: 700;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                padding: 10px 16px;
              }
            `}</style>
            <table className="wt-lobby-table">
              <thead>
                <tr style={{ background: "transparent", boxShadow: "none" }}>
                  <th className="wt-lobby-th" style={{ textAlign: "left" }}>Lobby Name</th>
                  {isNonDivisional && <th className="wt-lobby-th" style={{ textAlign: "left" }}>Division</th>}
                  <th className="wt-lobby-th" style={{ textAlign: "center" }}>Total Walkie-Talkies</th>
                  <th className="wt-lobby-th" style={{ textAlign: "center" }}>Tested Count</th>
                  <th className="wt-lobby-th" style={{ textAlign: "center" }}>To Be Tested</th>
                  <th className="wt-lobby-th" style={{ textAlign: "center" }}>Serial Numbers</th>
                  {!isViewer && <th className="wt-lobby-th" style={{ textAlign: "right" }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredLobbies.map((l: any) => {
                  const totalWTs = Array.isArray(l.walkieTalkies) && l.walkieTalkies.length > 0 
                    ? l.walkieTalkies.length 
                    : l.totalWalkieTalkies;
                  const toBeTested = totalWTs - l.testedCount;
                  const isCompleted = toBeTested === 0 && totalWTs > 0;
                  return (
                    <tr key={l.id} className={`wt-lobby-row ${isCompleted ? "completed" : ""}`} style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                      <td className="wt-lobby-cell">
                        <strong style={{ fontSize: "14px", color: "var(--navy)", fontWeight: 600 }}>{l.lobbyName}</strong>
                      </td>
                      {isNonDivisional && (
                        <td className="wt-lobby-cell">
                           <span className="pill info" style={{ fontWeight: 600, fontSize: "11.5px", padding: "3px 8px", background: "#f8fafc", color: "#475569", border: "1px solid #cbd5e1", borderRadius: "6px" }}>
                             {l.division}
                           </span>
                        </td>
                      )}
                      <td className="wt-lobby-cell" style={{ textAlign: "center" }}>
                        <span className="pill info" style={{ fontWeight: 600, fontSize: "11.5px", padding: "3px 8px", background: "#f1f5f9", color: "#334155", border: "1px solid #cbd5e1", borderRadius: "6px" }}>{totalWTs}</span>
                      </td>
                      <td className="wt-lobby-cell" style={{ textAlign: "center" }}>
                        <span className="pill success" style={{ fontWeight: 600, fontSize: "11.5px", padding: "3px 8px", background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", borderRadius: "6px" }}>{l.testedCount}</span>
                      </td>
                      <td className="wt-lobby-cell" style={{ textAlign: "center" }}>
                        <span className={`pill ${toBeTested > 0 ? "warning" : "success"}`} style={{ fontWeight: 600, fontSize: "11.5px", padding: "3px 8px", background: toBeTested > 0 ? "#fffbeb" : "#f0fdf4", color: toBeTested > 0 ? "#d97706" : "#16a34a", border: `1px solid ${toBeTested > 0 ? "#fef3c7" : "#bbf7d0"}`, borderRadius: "6px" }}>
                          {toBeTested}
                        </span>
                      </td>
                      <td className="wt-lobby-cell" style={{ textAlign: "center" }}>
                        <button
                          className="action-btn"
                          onClick={() => {
                            setViewingLobby(l);
                            setIsViewSerialsModalOpen(true);
                          }}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "5px 10px",
                            borderRadius: "6px",
                            background: "#eff6ff",
                            color: "#2563eb",
                            border: "1px solid #bfdbfe",
                            fontWeight: 600,
                            cursor: "pointer",
                            fontSize: "12px",
                            transition: "all 0.15s ease"
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#dbeafe"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#eff6ff"; }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 13h8"/><path d="M8 17h8"/><path d="M10 9h2"/></svg>
                          Excel Sheet
                        </button>
                      </td>
                      {!isViewer && (
                        <td className="wt-lobby-cell" style={{ textAlign: "right", paddingRight: "20px" }}>
                          <button 
                            className="action-btn text-red" 
                            onClick={() => handleDeleteLobby(l.id)} 
                            style={{ 
                              padding: "5px 10px",
                              borderRadius: "6px",
                              background: "#fef2f2",
                              color: "#ef4444",
                              border: "1px solid #fee2e2",
                              fontWeight: 600,
                              cursor: "pointer",
                              fontSize: "12px",
                              transition: "all 0.15s ease"
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#fee2e2"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#fef2f2"; }}
                          >
                            Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>

      {/* Add / Edit Lobby Modal */}
      {isLobbyModalOpen && (
        <div className="modal-backdrop" style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", justifyContent: "center", alignItems: "center", background: "rgba(10, 20, 42, 0.45)", backdropFilter: "blur(6px)" }}>
          <div className="modal-card" style={{ width: "450px", padding: "25px", background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", color: "var(--navy)", fontWeight: 700 }}>
                {editingLobbyId ? "Edit Lobby" : "Add Walkie-Talkie Lobby"}
              </h3>
              <button onClick={() => setIsLobbyModalOpen(false)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer" }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveLobby} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--muted)" }}>
                  Lobby / Station Name <span style={{ color: "var(--red)" }}>*</span>
                </label>
                <input
                  type="text"
                  value={lobbyName}
                  onChange={(e) => setLobbyName(e.target.value)}
                  placeholder="e.g. Bilaspur Crew Lobby"
                  required
                  disabled={!!editingLobbyId}
                  style={{ padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", background: editingLobbyId ? "#f8fafc" : "#fff" }}
                />
                {editingLobbyId && (
                  <small style={{ color: "var(--muted)" }}>Lobby name cannot be changed after creation.</small>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--muted)" }}>
                  Division <span style={{ color: "var(--red)" }}>*</span>
                </label>
                <select
                  value={lobbyDivision}
                  onChange={(e) => setLobbyDivision(e.target.value)}
                  required
                  disabled={!isNonDivisional}
                  style={{ padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", background: !isNonDivisional ? "#f8fafc" : "#fff", cursor: !isNonDivisional ? "not-allowed" : "pointer" }}
                >
                  <option value="Raipur">Raipur</option>
                  <option value="Bilaspur">Bilaspur</option>
                  <option value="Nagpur">Nagpur</option>
                </select>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--muted)" }}>
                  Total Walkie-Talkies <span style={{ color: "var(--red)" }}>*</span>
                </label>
                <button
                  type="button"
                  onClick={handleInputClick}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    padding: "10px 12px",
                    borderRadius: "6px",
                    border: "1px dashed #cbd5e1",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#0b6dff",
                    background: "#f0f7ff",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    minHeight: "44px"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#e0eefe";
                    e.currentTarget.style.borderColor = "#0b6dff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#f0f7ff";
                    e.currentTarget.style.borderColor = "#cbd5e1";
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  {totalWalkieTalkies ? `Imported: ${totalWalkieTalkies} Walkie-Talkies` : "Import from Excel/CSV"}
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".csv,.xlsx,.xls"
                  style={{ display: "none" }}
                />
                <small style={{ color: "var(--muted)" }}>
                  Click this button to upload and count serial numbers from Excel/CSV file.
                </small>
              </div>

              {walkieTalkies.length > 0 && hasJustImported && (
                <div style={{ fontSize: "13px", color: "#1e293b", background: "#f0fdf4", padding: "10px 12px", borderRadius: "8px", border: "1px solid #bbf7d0", display: "flex", alignItems: "center", gap: "8px" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                  <span><strong>{walkieTalkies.length}</strong> walkie-talkies imported successfully.</span>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "5px" }}>
                <button type="button" className="export-button" disabled={isMutating} onClick={() => setIsLobbyModalOpen(false)} style={{ background: "none", borderColor: "#cbd5e1", color: "var(--navy)", cursor: isMutating ? "not-allowed" : "pointer" }}>Cancel</button>
                <button type="submit" className="export-button" disabled={isMutating} style={{ background: "var(--blue)", color: "#fff", borderColor: "var(--blue)", cursor: isMutating ? "not-allowed" : "pointer" }}>
                  {isMutating ? "Saving..." : "Save Lobby"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Serial Numbers Modal */}
      {isViewSerialsModalOpen && viewingLobby && (
        <div className="modal-backdrop" style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", justifyContent: "center", alignItems: "center", background: "rgba(10, 20, 42, 0.45)", backdropFilter: "blur(6px)" }}>
          <style>{`
            .wt-table-row-hover:hover {
              background-color: #f8f9fb !important;
            }
            .wt-action-btn:hover {
              text-decoration: underline !important;
            }
            .wt-add-grid {
              display: grid;
              grid-template-columns: 1fr;
              gap: 16px;
            }
            @media (min-width: 768px) {
              .wt-add-grid {
                grid-template-columns: 5fr 4fr 3fr;
                align-items: flex-end;
              }
            }
          `}</style>
          <div className="modal-card" style={{ width: "95vw", maxWidth: "850px", maxHeight: "90vh", background: "#ffffff", borderRadius: "16px", border: "1px solid #edeef0", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            
            {/* Header */}
            <header style={{ padding: "18px 32px", borderBottom: "1px solid #edeef0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#111827", margin: 0, letterSpacing: "-0.025em" }}>
                  Manage Walkie-Talkies Inventory
                </h1>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                  <p style={{ color: "#45464c", fontSize: "14px", margin: 0 }}>Lobby: <span style={{ fontWeight: 600, color: "#111827" }}>{viewingLobby.lobbyName}</span></p>
                  {viewingLobby.walkieTalkies?.length > 0 && (
                    <span style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #dbeafe", borderRadius: "9999px", padding: "2px 8px", fontSize: "12px", fontWeight: 500 }}>
                      {viewingLobby.walkieTalkies.length} sets
                    </span>
                  )}
                </div>
              </div>
              <button 
                onClick={() => { setIsViewSerialsModalOpen(false); setViewingLobby(null); setEditingWTIndex(null); setWtSearchTerm(""); }} 
                style={{ background: "none", border: "none", color: "#76777d", cursor: "pointer", borderRadius: "9999px", padding: "8px", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f3f4f6"; e.currentTarget.style.color = "#111827"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#76777d"; }}
              >
                <X size={20} />
              </button>
            </header>

            {/* Main Content (Scrollable Table) */}
            <main style={{ flex: 1, overflowY: "auto", padding: "16px 32px 8px 32px", display: "flex", flexDirection: "column" }} className="custom-scrollbar">
              
              {/* Search & Actions Bar */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div style={{ position: "relative", width: "288px" }}>
                  <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#76777d", pointerEvents: "none" }} />
                  <input 
                    type="text" 
                    placeholder="Search inventory..." 
                    value={wtSearchTerm}
                    onChange={(e) => setWtSearchTerm(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    style={{ 
                      width: "100%", 
                      padding: "8px 16px 8px 40px", 
                      backgroundColor: isSearchFocused ? "#ffffff" : "#f3f4f6", 
                      border: isSearchFocused ? "1px solid #111827" : "1px solid transparent", 
                      borderRadius: "8px", 
                      fontSize: "14px", 
                      outline: "none", 
                      transition: "all 0.2s" 
                    }} 
                  />
                </div>
                {viewingLobby.walkieTalkies && viewingLobby.walkieTalkies.length > 0 && (
                  <button
                    onClick={async () => {
                      try {
                        const XLSX = await import("xlsx");
                        const data = viewingLobby.walkieTalkies.map((wt: any, idx: number) => ({
                          "S.No.": idx + 1,
                          "Serial Number": wt.serialNumber,
                          "Make / Model": wt.makeModel || "Motorola",
                          "Lobby Name": viewingLobby.lobbyName,
                          "Division": viewingLobby.division
                        }));
                        const worksheet = XLSX.utils.json_to_sheet(data);
                        const workbook = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(workbook, worksheet, "Walkie Talkies");
                        XLSX.writeFile(workbook, `${viewingLobby.lobbyName}_WalkieTalkie_Serials.xlsx`);
                        showToast("Exported walkie-talkies list successfully.");
                      } catch (err) {
                        showToast("Failed to export Excel file.");
                      }
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 16px",
                      border: "1px solid #c6c6cd",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: 500,
                      background: "#ffffff",
                      color: "#111827",
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f3f4f6"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#ffffff"}
                  >
                    <Download size={18} style={{ color: "#16a34a" }} />
                    Export Excel
                  </button>
                )}
              </div>

              {/* Table Container */}
              <div style={{ background: "#ffffff", borderRadius: "8px", border: "1px solid #edeef0", overflowY: "auto", maxHeight: "35vh" }} className="custom-scrollbar">
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "#f8f9fb", position: "sticky", top: 0, zIndex: 10, boxShadow: "inset 0 -1px 0 #edeef0" }}>
                      <th style={{ padding: "12px 24px", fontSize: "11px", fontWeight: 700, color: "#76777d", textTransform: "uppercase", letterSpacing: "0.05em", width: isViewer ? "50%" : "40%", background: "#f8f9fb" }}>Serial Number</th>
                      <th style={{ padding: "12px 24px", fontSize: "11px", fontWeight: 700, color: "#76777d", textTransform: "uppercase", letterSpacing: "0.05em", width: isViewer ? "50%" : "40%", background: "#f8f9fb" }}>Make / Model</th>
                      {!isViewer && <th style={{ padding: "12px 24px", fontSize: "11px", fontWeight: 700, color: "#76777d", textTransform: "uppercase", letterSpacing: "0.05em", width: "20%", textAlign: "right", background: "#f8f9fb" }}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody style={{ background: "#ffffff" }}>
                    {filteredWalkieTalkies.length === 0 ? (
                      <tr>
                        <td colSpan={isViewer ? 2 : 3} style={{ textAlign: "center", padding: "30px", color: "#76777d", fontSize: "14px" }}>
                          {wtSearchTerm ? "No matching walkie-talkies found." : "No walkie-talkies recorded for this lobby."}
                        </td>
                      </tr>
                    ) : (
                      filteredWalkieTalkies.map((wt: any, index: number) => {
                        const actualIndex = viewingLobby.walkieTalkies.findIndex((item: any) => item.serialNumber === wt.serialNumber && item.makeModel === wt.makeModel);
                        const isEditing = editingWTIndex === actualIndex;

                        return (
                          <tr key={index} style={{ borderBottom: "1px solid #edeef0", transition: "background-color 0.2s" }} className="wt-table-row-hover">
                            {isEditing ? (
                              <>
                                <td style={{ padding: "10px 24px", width: "40%" }}>
                                  <input 
                                    type="text" 
                                    value={editingWTSerial} 
                                    disabled={isMutating}
                                    onChange={(e) => setEditingWTSerial(e.target.value)} 
                                    style={{ width: "100%", padding: "6px 12px", fontSize: "13px", border: "1px solid #c6c6cd", borderRadius: "6px", outline: "none", fontFamily: "monospace", opacity: isMutating ? 0.7 : 1 }} 
                                  />
                                </td>
                                <td style={{ padding: "10px 24px", width: "40%" }}>
                                  <input 
                                    type="text" 
                                    value={editingWTMakeModel} 
                                    disabled={isMutating}
                                    onChange={(e) => setEditingWTMakeModel(e.target.value)} 
                                    style={{ width: "100%", padding: "6px 12px", fontSize: "13px", border: "1px solid #c6c6cd", borderRadius: "6px", outline: "none", opacity: isMutating ? 0.7 : 1 }} 
                                  />
                                </td>
                                <td style={{ padding: "10px 24px", width: "20%", textAlign: "right" }}>
                                  <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                                    <button 
                                      onClick={() => handleSaveSingleWalkieTalkieEdit(viewingLobby, actualIndex)} 
                                      disabled={isMutating}
                                      style={{ background: "#22c55e", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: isMutating ? "not-allowed" : "pointer" }}
                                    >
                                      {isMutating ? "Saving..." : "Save"}
                                    </button>
                                    <button 
                                      onClick={() => setEditingWTIndex(null)} 
                                      disabled={isMutating}
                                      style={{ background: "#cbd5e1", color: "#334155", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: isMutating ? "not-allowed" : "pointer" }}
                                    >Cancel</button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td style={{ padding: "12px 24px", fontSize: "14px", fontWeight: 500, color: "#111827", fontFamily: "monospace" }}>{wt.serialNumber}</td>
                                <td style={{ padding: "12px 24px", fontSize: "14px", color: "#45464c" }}>{wt.makeModel || "Motorola"}</td>
                                {!isViewer && (
                                  <td style={{ padding: "12px 24px", fontSize: "14px", textAlign: "right" }}>
                                    <button 
                                      onClick={() => {
                                        setEditingWTIndex(actualIndex);
                                        setEditingWTSerial(wt.serialNumber);
                                        setEditingWTMakeModel(wt.makeModel || "Motorola");
                                      }}
                                      disabled={isMutating}
                                      style={{ background: "none", border: "none", color: "#2563eb", cursor: isMutating ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: 600, marginRight: "16px", padding: 0 }}
                                      className="wt-action-btn"
                                    >Edit</button>
                                    <button 
                                      onClick={() => handleDeleteSingleWalkieTalkie(viewingLobby, actualIndex)} 
                                      disabled={isMutating}
                                      style={{ background: "none", border: "none", color: "#ef4444", cursor: isMutating ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: 600, padding: 0 }}
                                      className="wt-action-btn"
                                    >Delete</button>
                                  </td>
                                )}
                              </>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </main>

            {/* Footer / Add Section */}
            <footer style={{ background: "#f3f4f6", padding: "16px 32px", borderTop: "1px solid #edeef0" }}>
              {!isViewer && (
                <div>
                  <h3 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: 600, color: "#111827", display: "flex", alignItems: "center", gap: "8px" }}>
                    <PlusCircle size={18} style={{ color: "#2563eb" }} />
                    Add Walkie-Talkie Manually
                  </h3>
                  <div className="wt-add-grid">
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <label style={{ fontSize: "11px", fontWeight: 700, color: "#76777d", textTransform: "uppercase", letterSpacing: "0.05em", paddingLeft: "4px" }}>Serial Number</label>
                      <input
                        type="text"
                        placeholder="Serial Number..."
                        value={newWTSerial}
                        disabled={isMutating}
                        onChange={(e) => setNewWTSerial(e.target.value)}
                        style={{ width: "100%", padding: "8px 12px", border: "1px solid #c6c6cd", borderRadius: "8px", fontSize: "14px", outline: "none", background: "#ffffff", fontFamily: "monospace" }}
                      />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <label style={{ fontSize: "11px", fontWeight: 700, color: "#76777d", textTransform: "uppercase", letterSpacing: "0.05em", paddingLeft: "4px" }}>Make / Model</label>
                      <input
                        type="text"
                        placeholder="Make / Model..."
                        value={newWTMakeModel}
                        disabled={isMutating}
                        onChange={(e) => setNewWTMakeModel(e.target.value)}
                        style={{ width: "100%", padding: "8px 12px", border: "1px solid #c6c6cd", borderRadius: "8px", fontSize: "14px", outline: "none", background: "#ffffff" }}
                      />
                    </div>
                    <div>
                      <button
                        onClick={() => handleAddSingleWalkieTalkie(viewingLobby)}
                        disabled={isMutating}
                        style={{ 
                          width: "100%", 
                          padding: "8px 16px", 
                          background: "#2563eb", 
                          color: "#ffffff", 
                          fontWeight: 600, 
                          border: "none", 
                          borderRadius: "8px", 
                          fontSize: "14px", 
                          cursor: isMutating ? "not-allowed" : "pointer", 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "center",
                          height: "38px",
                          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                          transition: "all 0.2s"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#1d4ed8"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#2563eb"}
                      >
                        {isMutating ? "Adding..." : "Add Set"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </footer>

          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { api } from "../../api/apiClient";
import { Plus, Edit2, Trash2, Calendar, MessageSquare, AlertTriangle, Info, ShieldAlert } from "lucide-react";
import { formatDateTime24 } from "../../utils/dateTime";

interface Announcement {
  id: string;
  title: string;
  content: string;
  category: string;
  imageUrl?: string;
  createdAt: string;
}

export default function AnnouncementsManager({ showToast }: { showToast: (message: string) => void }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Notice");
  const [imageUrl, setImageUrl] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchAnnouncements = async () => {
    try {
      setIsLoading(true);
      const res = await api.announcements.list();
      if (res.success) setAnnouncements(res.data);
    } catch (err: any) {
      showToast(err.message || "Failed to fetch updates");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleOpenAddModal = () => {
    setTitle("");
    setContent("");
    setCategory("Notice");
    setImageUrl("");
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (a: Announcement) => {
    setTitle(a.title);
    setContent(a.content);
    setCategory(a.category);
    setImageUrl(a.imageUrl || "");
    setEditingId(a.id);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !category.trim()) {
      showToast("Title, category and content are required");
      return;
    }

    try {
      const payload = {
        title: title.trim(),
        content: content.trim(),
        category: category.trim(),
        imageUrl: imageUrl.trim() || null,
      };

      let res;
      if (editingId) {
        res = await api.announcements.update(editingId, payload);
      } else {
        res = await api.announcements.create(payload);
      }

      if (res.success) {
        showToast(editingId ? "Update updated successfully" : "Update posted successfully");
        setIsModalOpen(false);
        fetchAnnouncements();
      }
    } catch (err: any) {
      showToast(err.message || "Failed to save update");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this update?")) return;
    try {
      const res = await api.announcements.delete(id);
      if (res.success) {
        showToast("Update deleted successfully");
        fetchAnnouncements();
      }
    } catch (err: any) {
      showToast(err.message || "Failed to delete update");
    }
  };

  const getCategoryBadgeColor = (cat: string) => {
    switch (cat) {
      case "Alert":
        return { bg: "#fee2e2", text: "#b91c1c", border: "#fecaca" };
      case "Maintenance":
        return { bg: "#fef3c7", text: "#d97706", border: "#fde68a" };
      case "System Update":
        return { bg: "#dbeafe", text: "#1d4ed8", border: "#bfdbfe" };
      default:
        return { bg: "#f1f5f9", text: "#475569", border: "#e2e8f0" };
    }
  };

  return (
    <div className="dashboard-scroll-wrap" style={{ flex: 1, overflowY: "auto" }}>
      <div style={{ padding: "20px 24px 20px 30px", display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Page Header */}
      <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "15px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "22px", color: "var(--navy)", fontWeight: 700 }}>Latest Updates Management</h2>
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "14px" }}>Create and maintain latest updates, notices, and system alerts shown on the dashboard.</p>
        </div>
        <button className="export-button" onClick={handleOpenAddModal} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Plus size={16} /> Add New Update
        </button>
      </div>

      {/* Announcements List Grid */}
      <div className="panel" style={{ padding: "20px" }}>
        <h3 style={{ margin: "0 0 15px", fontSize: "16px", color: "var(--navy)", fontWeight: 600 }}>Active Announcements</h3>
        {isLoading && announcements.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>Loading updates...</div>
        ) : announcements.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
            No updates posted yet. Click <strong>Add New Update</strong> to broadcast announcements.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {announcements.map((a) => {
              const colors = getCategoryBadgeColor(a.category);
              return (
                <div 
                  key={a.id} 
                  style={{ 
                    display: "flex", 
                    gap: "16px", 
                    padding: "16px", 
                    borderRadius: "10px", 
                    border: "1px solid var(--border)", 
                    background: "#fff",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                  }}
                >
                  {a.imageUrl && (
                    <div style={{ width: "100px", height: "80px", borderRadius: "8px", overflow: "hidden", flexShrink: 0 }}>
                      <img src={a.imageUrl} alt={a.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  )}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <span 
                        style={{ 
                          fontSize: "11px", 
                          fontWeight: 700, 
                          padding: "2px 8px", 
                          borderRadius: "12px", 
                          background: colors.bg, 
                          color: colors.text,
                          border: `1px solid ${colors.border}`
                        }}
                      >
                        {a.category}
                      </span>
                      <span style={{ fontSize: "12px", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Calendar size={12} /> {formatDateTime24(a.createdAt)}
                      </span>
                    </div>
                    <h4 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>{a.title}</h4>
                    <p style={{ margin: 0, fontSize: "13.5px", color: "#475569", lineHeight: 1.5, whiteSpace: "pre-line" }}>{a.content}</p>
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignSelf: "flex-start" }}>
                    <button 
                      onClick={() => handleOpenEditModal(a)} 
                      style={{ 
                        background: "none", 
                        border: "none", 
                        cursor: "pointer", 
                        color: "#2563eb", 
                        padding: "6px", 
                        borderRadius: "6px" 
                      }}
                      title="Edit Update"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(a.id)} 
                      style={{ 
                        background: "none", 
                        border: "none", 
                        cursor: "pointer", 
                        color: "#ef4444", 
                        padding: "6px", 
                        borderRadius: "6px" 
                      }}
                      title="Delete Update"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          backgroundColor: "rgba(15, 23, 42, 0.4)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px"
        }}>
          <div style={{
            background: "#fff",
            borderRadius: "12px",
            width: "100%",
            maxWidth: "600px",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column"
          }}>
            {/* Modal Header */}
            <div style={{ borderBottom: "1px solid var(--border)", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "18px", color: "var(--navy)", fontWeight: 700 }}>
                {editingId ? "Edit Announcement" : "Create Announcement"}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#64748b" }}
              >
                &times;
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", gap: "16px" }}>
                <div style={{ flex: 2, display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>Title *</label>
                  <input 
                    type="text" 
                    required 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    placeholder="Enter short update title..."
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>Category *</label>
                  <select 
                    required 
                    value={category} 
                    onChange={e => setCategory(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box", background: "#fff", cursor: "pointer" }}
                  >
                    <option value="Notice">Notice</option>
                    <option value="Alert">Alert</option>
                    <option value="System Update">System Update</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>Image URL (Optional)</label>
                <input 
                  type="text" 
                  value={imageUrl} 
                  onChange={e => setImageUrl(e.target.value)} 
                  placeholder="https://example.com/image.png (or leave blank)"
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>Content *</label>
                <textarea 
                  required 
                  rows={6}
                  value={content} 
                  onChange={e => setContent(e.target.value)} 
                  placeholder="Write the details of the update or alert..."
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box", resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px", borderTop: "1px solid var(--border)", paddingTop: "15px" }}>
                <button type="button" className="export-button" onClick={() => setIsModalOpen(false)} style={{ background: "#f1f5f9", color: "#475569" }}>
                  Cancel
                </button>
                <button type="submit" className="export-button">
                  {editingId ? "Save Changes" : "Post Announcement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Edit, Eye, Send } from "lucide-react";
import { api } from "./api/apiClient";
import type { UserRole } from "./types";
import {
  DAILY_POSITION_CATEGORIES,
  DAILY_POSITION_FORMS,
  DailyPositionField,
  DailyPositionFormDefinition,
} from "./dailyPositionForms";

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
  if (form.statusMode === "log") return "OPERATIONAL";
  if (form.statusMode === "maintenance") {
    const pending = Number(values.temporaryJointsCount || values.totalInsulationFaults || values.defectiveSets || 0);
    const done = Number(values.rectifiedJoints || values.rectifiedFaults || values.repairedSets || 0);
    return pending > done ? "UNDER_MAINTENANCE" : "OPERATIONAL";
  }
  if (values.failureTime && !values.rectificationTime) return "FAULTY";
  if (values.failureTime && values.rectificationTime) return "RECTIFIED";
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

  if (field.name === "majorSection") {
    return (
      <div className="dp-field">
        <label>{field.label}{field.required && <span>*</span>}</label>
        <select disabled={readOnly} required={field.required} value={value || ""} onChange={e => setValue(field.name, e.target.value)}>
          <option value="">Select Major Section</option>
          {majorSections.map((item: any) => <option key={item.id} value={item.name}>{item.name}</option>)}
        </select>
      </div>
    );
  }

  if (field.name === "section") {
    return (
      <div className="dp-field">
        <label>{field.label}{field.required && <span>*</span>}</label>
        <select disabled={readOnly || !values.majorSection} required={field.required} value={value || ""} onChange={e => setValue(field.name, e.target.value)}>
          <option value="">Select Section</option>
          {sections.map((item: any) => <option key={item.id} value={item.name}>{item.name}</option>)}
        </select>
      </div>
    );
  }

  if (field.name === "stationCode") {
    return (
      <div className="dp-field">
        <label>{field.label}{field.required && <span>*</span>}</label>
        <select disabled={readOnly} required={field.required} value={value || ""} onChange={e => setValue(field.name, e.target.value)}>
          <option value="">Select Station / Location</option>
          {stations.map((station: any) => <option key={station.code} value={station.code}>{station.name} ({station.code})</option>)}
        </select>
      </div>
    );
  }

  if (field.name === "assetId") {
    return (
      <div className="dp-field">
        <label>{field.label}{field.required && <span>*</span>}</label>
        <select disabled={readOnly} required={field.required} value={value || ""} onChange={e => setValue(field.name, e.target.value)}>
          <option value="">No linked asset</option>
          {assets.map((asset: any) => <option key={asset.id} value={asset.id}>{assetLabel(asset)}</option>)}
        </select>
      </div>
    );
  }

  if (field.name === "durationText") {
    return (
      <div className="dp-field">
        <label>{field.label}</label>
        <input readOnly value={calcDurationText(values.failureTime, values.rectificationTime)} />
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

  return (
    <div className={`dp-field ${field.fullWidth ? "full" : ""}`}>
      <label>{field.label}{field.required && <span>*</span>}</label>
      {field.type === "select" ? (
        <select {...commonProps}>
          <option value="">Select {field.label}</option>
          {(field.options || []).map((option: string) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      ) : field.type === "textarea" ? (
        <textarea {...commonProps} />
      ) : (
        <input type={field.type} {...commonProps} />
      )}
    </div>
  );
}

export default function DailyPositionView({ role, division, user, mode, showToast }: DailyPositionViewProps) {
  const queryClient = useQueryClient();
  const canFill = role === "TESTROOM";
  const viewMode = mode || (canFill ? "form" : "history");
  const canChooseDivision = role === "SUPER_ADMIN";
  const [selectedCategory, setSelectedCategory] = useState(DAILY_POSITION_CATEGORIES[0]);
  const [selectedFormName, setSelectedFormName] = useState("");
  const [openCategory, setOpenCategory] = useState(DAILY_POSITION_CATEGORIES[0]);
  const [selectedDivision, setSelectedDivision] = useState(role === "SUPER_ADMIN" ? "" : (division || ""));
  const [selectedDate, setSelectedDate] = useState(toDateValue());
  const [values, setValues] = useState<Record<string, any>>({ failureTime: toLocalDateTimeValue() });
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [detailsRecord, setDetailsRecord] = useState<any | null>(null);
  const [circuitSearch, setCircuitSearch] = useState("");

  const forms = DAILY_POSITION_FORMS.filter(form => form.category === selectedCategory);
  const visibleForms = forms.filter(form =>
    `${form.name} ${form.badge} ${form.systemCode}`.toLowerCase().includes(circuitSearch.toLowerCase())
  );
  const selectedForm = useMemo(() => {
    return forms.find(form => form.name === selectedFormName) || forms[0];
  }, [forms, selectedFormName]);

  const metadataQuery = useQuery({
    queryKey: ["daily-position-metadata", selectedDivision],
    queryFn: () => api.dailyPosition.metadata(selectedDivision ? { division: selectedDivision } : {}),
  });

  const recordsQuery = useQuery({
    queryKey: ["daily-position-records", selectedDivision, selectedDate],
    queryFn: () => api.dailyPosition.list({
      division: selectedDivision || "",
      date: selectedDate,
      limit: "500",
    }),
  });

  const createRecord = useMutation({
    mutationFn: (body: any) => api.dailyPosition.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-position-records"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      setValues({ failureTime: toLocalDateTimeValue() });
      setEditingRecordId(null);
      showToast("Daily Position record saved.");
    },
    onError: (err: any) => showToast(err.message || "Failed to save Daily Position record."),
  });

  const updateRecord = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => api.dailyPosition.update(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-position-records"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      setValues({ failureTime: toLocalDateTimeValue() });
      setEditingRecordId(null);
      showToast("Daily Position record updated.");
    },
    onError: (err: any) => showToast(err.message || "Failed to update Daily Position record."),
  });

  const metadata = metadataQuery.data?.data;
  const records = recordsQuery.data?.data || [];
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
        next.assetId = "";
      }
      if (name === "section") {
        next.stationCode = "";
        next.assetId = "";
      }
      if (name === "stationCode") next.assetId = "";
      
      if (name === "failureTime" || name === "rectificationTime") {
        next.durationText = calcDurationText(next.failureTime, next.rectificationTime);
      }
      return next;
    });
  };

  const buildPayload = (actionType: "OK" | "FAULT" = "FAULT") => {
    const station = metadata?.stations?.find((item: any) => item.code === values.stationCode);
    const isOk = actionType === "OK";
    return {
      division: selectedDivision,
      category: selectedForm.category,
      formType: selectedForm.name,
      systemCode: selectedForm.systemCode,
      majorSection: values.majorSection || null,
      section: values.section || null,
      stationCode: values.stationCode || null,
      stationName: station?.name || null,
      assetId: values.assetId || null,
      telecomAsset: selectedForm.name,
      status: isOk ? "OPERATIONAL" : statusFromForm(selectedForm, values),
      failureTime: isOk ? null : (values.failureTime || null),
      rectificationTime: isOk ? null : (values.rectificationTime || null),
      durationText: isOk ? null : calcDurationText(values.failureTime, values.rectificationTime),
      reason: isOk ? "All OK" : (values.reason || null),
      remarks: isOk ? (values.remarks || "No fault reported.") : (values.remarks || null),
      formData: {
        ...values,
        actionType,
        checkedAt: new Date().toISOString(),
      },
    };
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canFill || !selectedForm) return;
    if (editingRecordId) {
      updateRecord.mutate({ id: editingRecordId, body: buildPayload("FAULT") });
      return;
    }
    createRecord.mutate(buildPayload("FAULT"));
  };

  const handleOk = () => {
    if (!canFill || !selectedForm) return;
    createRecord.mutate(buildPayload("OK"));
  };

  const startEdit = (record: any) => {
    const form = DAILY_POSITION_FORMS.find(item => item.name === record.formType);
    if (form) {
      setSelectedCategory(form.category);
      setSelectedFormName(form.name);
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
      assetId: record.assetId || record.formData?.assetId || "",
      reason: record.reason || record.formData?.reason || "",
      remarks: record.remarks || record.formData?.remarks || "",
    });
    setEditingRecordId(record.id);
  };

  const resetForm = () => {
    setValues({ failureTime: toLocalDateTimeValue() });
    setEditingRecordId(null);
  };

  const currentFormRecords = records
    .filter((record: any) => record.formType === selectedForm?.name)
    .slice(0, 8);

  const renderHistory = () => (
    <section className="dp-history-panel">
      <div className="dp-history-toolbar">
        <div>
          <h3>{canFill ? "My Daily Position History" : "Daily Position History"}</h3>
          <p>Records for selected date. Details contains every submitted form field.</p>
        </div>
        <label>
          Position Date
          <input type="date" value={selectedDate} onChange={event => setSelectedDate(event.target.value)} />
        </label>
      </div>
      <div className="table-scroll-container">
        <table className="data-table dp-history-table">
          <thead>
            <tr>
              <th>Division</th>
              <th>Category</th>
              <th>Form Type</th>
              <th>Station</th>
              <th>Linked Asset</th>
              <th>Status</th>
              <th>Failure Time</th>
              <th>Rectification Time</th>
              <th>Remarks</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record: any) => {
              const canEdit = canFill && isTodayRecord(record) && (!user?.id || record.createdById === user.id);
              return (
                <tr key={record.id}>
                  <td>{record.division}</td>
                  <td>{record.category}</td>
                  <td><strong>{record.formType}</strong></td>
                  <td>{record.stationCode || record.stationName || record.section || "-"}</td>
                  <td>{recordAssetLabel(record, metadata)}</td>
                  <td><span className={`pill status-${String(record.status || "").toLowerCase()}`}>{record.status}</span></td>
                  <td>{record.failureTime ? new Date(record.failureTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"}</td>
                  <td>{record.rectificationTime ? new Date(record.rectificationTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"}</td>
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
            {records.length === 0 && (
              <tr>
                <td colSpan={10} style={{ textAlign: "center", color: "var(--muted)", padding: 24 }}>No Daily Position records for this date.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );

  return (
    <article className="daily-position-page secr-position-page">
      <section className="tabular-header dp-page-header">
        <div className="header-title-section">
          <h2>Daily Position</h2>
          <p>SECR telecom daily position and asset fault workspace</p>
        </div>
        {canChooseDivision && (
          <div className="header-controls-section">
            <label className="division-select">
              <span>Division</span>
              <select value={selectedDivision} onChange={event => setSelectedDivision(event.target.value)}>
                <option value="">All Divisions</option>
                {normalizedDivisions.map((item: string) => <option key={item} value={item}>{divisionOptionLabel(item)}</option>)}
              </select>
            </label>
          </div>
        )}
      </section>

      {canFill && viewMode === "form" && (
        <section className="dp-workspace">
          <aside className="dp-category-rail dp-circuit-accordion">
            {DAILY_POSITION_CATEGORIES.map(category => {
              const isOpen = category === openCategory;
              return (
              <div key={category} className={`dp-circuit-group ${isOpen ? "open" : ""}`}>
                <button
                  className="dp-circuit-heading"
                  type="button"
                  onClick={() => {
                    if (isOpen) {
                      setOpenCategory("");
                      return;
                    }
                    setOpenCategory(category);
                    setSelectedCategory(category);
                    setSelectedFormName("");
                    setCircuitSearch("");
                    resetForm();
                  }}
                >
                  <span>{category}</span>
                  <strong>{isOpen ? "v" : ">"}</strong>
                </button>
                {isOpen && (
                  <div className="dp-circuit-list">
                    <input value={circuitSearch} onChange={event => setCircuitSearch(event.target.value)} placeholder="Search circuit..." />
                    {visibleForms.map(form => (
                      <button
                        key={form.name}
                        type="button"
                        className={form.name === selectedForm.name ? "active" : ""}
                        onClick={() => {
                          setSelectedFormName(form.name);
                          resetForm();
                        }}
                      >
                        <span>{form.name}</span>
                        <em>{form.badge}</em>
                      </button>
                    ))}
                    {visibleForms.length === 0 && <p>No circuit found.</p>}
                  </div>
                )}
              </div>
            )})}
          </aside>

          <main className="dp-form-shell secr-form-shell">
            <div className="dp-form-intro">
              <h3>{editingRecordId ? `Edit ${selectedForm.name}` : selectedForm.name}</h3>
              <p>{selectedForm.description}</p>
            </div>

            <form className="dp-form-grid" onSubmit={handleSubmit}>
              {selectedForm.fields.map(field => (
                <DailyPositionFieldInput
                  key={field.name}
                  field={field}
                  value={field.name === "durationText" ? calcDurationText(values.failureTime, values.rectificationTime) : values[field.name]}
                  values={values}
                  setValue={setValue}
                  metadata={metadata}
                  selectedDivision={selectedDivision}
                  readOnly={false}
                />
              ))}
              <div className="dp-form-actions">
                <button className="export-button" type="button" onClick={resetForm}>Reset</button>
                {!editingRecordId && (
                  <button className="export-button ok-button" type="button" onClick={handleOk} disabled={createRecord.isPending}>
                    <CheckCircle2 size={16} />
                    OK
                  </button>
                )}
                <button className="export-button" type="submit" disabled={createRecord.isPending || updateRecord.isPending}>
                  <Send size={16} />
                  {editingRecordId ? "Update Daily Position" : "Save"}
                </button>
              </div>
            </form>
            <section className="dp-recent-form-records">
              <div className="dp-recent-header">
                <h3>Recent Submitted Records</h3>
                <span>{selectedForm.name}</span>
              </div>
              <div className="table-scroll-container">
                <table className="data-table dp-recent-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Action</th>
                      <th>Status</th>
                      <th>Station / Section</th>
                      <th>Linked Asset</th>
                      <th>Remarks</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentFormRecords.map((record: any) => (
                      <tr key={record.id}>
                        <td>{new Date(record.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                        <td>{record.formData?.actionType || (record.status === "OPERATIONAL" ? "OK" : "FAULT")}</td>
                        <td><span className={`pill status-${String(record.status || "").toLowerCase()}`}>{record.status}</span></td>
                        <td>{record.stationCode || record.stationName || record.section || "-"}</td>
                        <td>{recordAssetLabel(record, metadata)}</td>
                        <td>{record.remarks || record.reason || "-"}</td>
                        <td style={{ textAlign: "right" }}>
                          <button type="button" className="action-btn text-blue" onClick={() => setDetailsRecord(record)}>
                            <Eye size={14} /> View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                    {currentFormRecords.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", color: "var(--muted)", padding: 18 }}>No records submitted for this form today.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </main>
        </section>
      )}

      {viewMode === "history" && renderHistory()}

      {detailsRecord && (
        <div className="modal-backdrop dp-modal-backdrop" onClick={() => setDetailsRecord(null)}>
          <div className="modal-card dp-details-modal" onClick={event => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setDetailsRecord(null)}>X</button>
            <div className="dp-details-header">
              <div>
                <span>Daily Position Record</span>
                <h2>{detailsRecord.formType}</h2>
                <p>{detailsRecord.division} / {detailsRecord.stationCode || detailsRecord.stationName || detailsRecord.section || "-"}</p>
              </div>
              <em className={`status-chip status-${String(detailsRecord.status || "").toLowerCase()}`}>{detailsRecord.status}</em>
            </div>

            <div className="dp-details-summary">
              {[
                ["Category", detailsRecord.category],
                ["Action", detailsRecord.formData?.actionType || (detailsRecord.status === "OPERATIONAL" ? "OK" : "FAULT")],
                ["Linked Asset", recordAssetLabel(detailsRecord, metadata)],
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
      )}
    </article>
  );
}

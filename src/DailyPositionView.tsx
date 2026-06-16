import { useEffect, useMemo, useState } from "react";
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
  RAILNET_DIVISIONAL_FIELDS,
  RAILNET_HQ_FIELDS,
} from "./dailyPositionForms";
import { useAppStore } from "./App";

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
          <option value="">{field.placeholder || "Select Major Section"}</option>
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
          <option value="">{field.placeholder || "Select Section"}</option>
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
          <option value="">{field.placeholder || `Select ${field.label.includes("Station") || field.label.includes("TIB") || field.label.includes("Location") ? "Station" : "Station / Location"}`}</option>
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
          <option value="">{field.placeholder || "No linked asset"}</option>
          {assets.map((asset: any) => <option key={asset.id} value={asset.id}>{assetLabel(asset)}</option>)}
        </select>
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

  const maxProps: Record<string, string> = {};
  if (field.type === "date") {
    maxProps.max = toDateValue(new Date());
  } else if (field.type === "datetime-local") {
    maxProps.max = toLocalDateTimeValue(new Date());
  }

  return (
    <div className={`dp-field ${field.fullWidth ? "full" : ""}`}>
      <label>
        {field.label}
        {field.type === "datetime-local" && (
          <span style={{ fontSize: "11.5px", color: "#64748b", fontWeight: "normal", marginLeft: "6px" }}>
            (Date, Hours & Min)
          </span>
        )}
        {field.required && <span>*</span>}
      </label>
      {field.type === "select" ? (
        <select {...commonProps}>
          <option value="">{field.placeholder || `Select ${field.label}`}</option>
          {(field.options || []).map((option: string) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      ) : field.type === "textarea" ? (
        <textarea {...commonProps} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <input type={field.type} {...maxProps} {...commonProps} />
          {field.type === "datetime-local" && (
            <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "500", paddingLeft: "4px" }}>
              Time Picker: Left column = Hours (00-23), Right column = Minutes (00-59)
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function DailyPositionView({ role, division, user, mode, showToast }: DailyPositionViewProps) {
  const queryClient = useQueryClient();
  const canFill = role === "TESTROOM";
  const viewMode = mode || (canFill ? "form" : "history");
  const canChooseDivision = role === "SUPER_ADMIN";
  const {
    dpSelectedCategory: selectedCategory,
    dpSelectedFormName: selectedFormName,
    dpOpenCategory: openCategory,
    dpCircuitSearch: circuitSearch,
    setDpSelectedCategory: setSelectedCategory,
    setDpSelectedFormName: setSelectedFormName,
    setDpOpenCategory: setOpenCategory,
    setDpCircuitSearch: setCircuitSearch
  } = useAppStore();

  const [selectedDivision, setSelectedDivision] = useState(role === "SUPER_ADMIN" ? "" : (division || ""));
  const [selectedDate, setSelectedDate] = useState(toDateValue());
  const [values, setValues] = useState<Record<string, any>>({ failureTime: toLocalDateTimeValue() });
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [detailsRecord, setDetailsRecord] = useState<any | null>(null);
  const [maintenanceType, setMaintenanceType] = useState<"Divisional" | "HQ">("Divisional");

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
      return true;
    });
  }, [activeFields, values.cpmsEntry]);

  useEffect(() => {
    if (selectedForm?.name === "Railnet / Internet") {
      setValues(prev => ({
        ...prev,
        maintenanceType: "Divisional Maintenance"
      }));
      setMaintenanceType("Divisional");
    } else if (selectedForm?.category === "Exchange") {
      setValues(prev => ({
        ...prev,
        exchangeName: selectedForm.name.endsWith("Exchange") ? selectedForm.name : `${selectedForm.name} Exchange`
      }));
    }
  }, [selectedForm?.name, selectedForm?.category]);

  useEffect(() => {
    resetForm();
  }, [selectedFormName]);

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

    // Client-side validation to block future dates & times
    const now = new Date();
    const nowLocalStr = toLocalDateTimeValue(now);
    const todayLocalStr = toDateValue(now);

    for (const field of activeFields) {
      const val = values[field.name];
      if (!val) continue;

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
      assetId: record.assetId || record.formData?.assetId || "",
      reason: record.reason || record.formData?.reason || "",
      remarks: record.remarks || record.formData?.remarks || "",
    });
    setEditingRecordId(record.id);
  };

  const resetForm = () => {
    if (selectedForm?.name === "Railnet / Internet") {
      setValues({ failureTime: toLocalDateTimeValue(), maintenanceType: "Divisional Maintenance" });
      setMaintenanceType("Divisional");
    } else if (selectedForm?.category === "Exchange") {
      setValues({
        failureTime: toLocalDateTimeValue(),
        exchangeName: selectedForm.name.endsWith("Exchange") ? selectedForm.name : `${selectedForm.name} Exchange`
      });
    } else {
      setValues({ failureTime: toLocalDateTimeValue() });
    }
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
        <section className="dp-workspace" style={{ display: "block" }}>
          <main className="dp-form-shell secr-form-shell">
            <div className="dp-form-intro" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", borderBottom: "1px solid var(--line)", paddingBottom: "10px", marginBottom: "12px" }}>
              <div>
                <h3 style={{ margin: 0 }}>{editingRecordId ? `Edit ${selectedForm.name}` : selectedForm.name}</h3>
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
                      fontSize: "13px"
                    }}
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
                      fontSize: "13px"
                    }}
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

            <form onSubmit={handleSubmit}>
              <div className="dp-form-scrollable-container">
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
                      readOnly={false}
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
                          </tr>
                        ))}
                        {currentFormRecords.length === 0 && (
                          <tr>
                            <td colSpan={activeFields.length} style={{ textAlign: "center", color: "var(--muted)", padding: 18 }}>No records submitted for this form today.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>

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

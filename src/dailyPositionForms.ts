export type DailyPositionFieldType = "text" | "number" | "select" | "datetime-local" | "date" | "textarea";

export type DailyPositionField = {
  name: string;
  label: string;
  type: DailyPositionFieldType;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  fullWidth?: boolean;
  readonly?: boolean;
};

export type DailyPositionFormDefinition = {
  category: string;
  name: string;
  badge: string;
  systemCode: string;
  description: string;
  statusMode?: "standard" | "maintenance" | "counts" | "log";
  fields: DailyPositionField[];
};

const hierarchyFields: DailyPositionField[] = [
  { name: "majorSection", label: "Major Section", type: "select", required: true },
  { name: "section", label: "Section", type: "select", required: true },
  { name: "stationCode", label: "Station / Location", type: "select", required: true },
  { name: "assetId", label: "Linked Asset", type: "select" },
];

const docketField: DailyPositionField = {
  name: "icmsEntryNo",
  label: "ICMS Entry No./Docket No.",
  type: "text",
  placeholder: "Enter ICMS entry number/docket number",
};

const requiredDocketField: DailyPositionField = {
  ...docketField,
  required: true,
};

const timingFields: DailyPositionField[] = [
  { name: "failureTime", label: "Failure Date & Time", type: "datetime-local", required: true },
  { name: "rectificationTime", label: "Rectification Date & Time", type: "datetime-local" },
  { name: "durationText", label: "Duration of Failure", type: "text", readonly: true },
];

const reasonRemarkFields: DailyPositionField[] = [
  { name: "reason", label: "Reason of Failure", type: "text", required: true, placeholder: "Enter reason" },
  { name: "remarks", label: "Remarks", type: "textarea", fullWidth: true },
];

const standardFaultFields: DailyPositionField[] = [
  docketField,
  ...hierarchyFields,
  { name: "natureOfFault", label: "Nature of Fault", type: "select", required: true, options: ["Equipment", "Link", "Power", "Other"] },
  ...timingFields,
  ...reasonRemarkFields,
];

const exchangeFields: DailyPositionField[] = [
  requiredDocketField,
  { name: "exchangeLocation", label: "Exchange Location", type: "text", required: true },
  { name: "sipRegistration", label: "SIP Registration", type: "select", required: true, options: ["REGISTERED", "OFFLINE", "DEGRADED"] },
  { name: "activeAnalogLines", label: "Active Analog Lines", type: "text", placeholder: "e.g. 94 / 96 Lines" },
  { name: "voipTrunkStatus", label: "VoIP Trunk Status", type: "select", options: ["HEALTHY", "FAILED", "DEGRADED"] },
  { name: "mdfCardUptime", label: "MDF Card Uptime", type: "text" },
  ...timingFields,
  ...reasonRemarkFields,
];

export const RAILNET_DIVISIONAL_FIELDS: DailyPositionField[] = [
  docketField,
  ...hierarchyFields,
  { name: "bandwidth", label: "Bandwidth", type: "text", required: true, placeholder: "Example: 100 Mbps, 1 Gbps" },
  { name: "lastTestingTime", label: "Last Testing Time", type: "datetime-local", required: true },
  { name: "natureOfFault", label: "Nature of Fault", type: "select", required: true, options: ["Equipment", "Link", "Power", "Other"] },
  { name: "auditReport", label: "Audit Report", type: "text", required: true, placeholder: "Enter Audit Report details" },
  { name: "attachFile", label: "Attach File / Report", type: "text", placeholder: "Attach file or enter link" },
  { name: "downloadSpeed", label: "Download Link Speed (Mbps)", type: "text", placeholder: "Enter Download Link Speed" },
  { name: "uploadSpeed", label: "Upload Link Speed (Mbps)", type: "text", placeholder: "Enter Upload Link Speed" },
  { name: "failureTime", label: "Failure Date & Time", type: "datetime-local", required: true },
  { name: "rectificationTime", label: "Rectification Time (RT)", type: "datetime-local", required: true },
  { name: "durationText", label: "Duration of Failure", type: "text", readonly: true },
  { name: "reason", label: "Reason of Failure", type: "select", required: true, options: ["Gateway Down", "Fiber Cut", "Equipment Failure", "Power Issue", "Other"] },
  { name: "remarks", label: "Remarks", type: "textarea", fullWidth: true, placeholder: "Enter observations, troubleshooting details, or additional remarks" },
];

export const RAILNET_HQ_FIELDS: DailyPositionField[] = [
  docketField,
  { name: "bandwidth", label: "Bandwidth", type: "text", required: true, placeholder: "Example: 100 Mbps, 1 Gbps" },
  { name: "lastTestingTime", label: "Last Testing Time", type: "datetime-local", required: true },
  { name: "natureOfFault", label: "Nature of Fault", type: "select", required: true, options: ["Equipment", "Link", "Power", "Other"] },
  { name: "auditReport", label: "Audit Report", type: "text", required: true, placeholder: "Enter Audit Report details" },
  { name: "attachFile", label: "Attach File / Report", type: "text", placeholder: "Attach file or enter link" },
  { name: "downloadSpeed", label: "Download Link Speed (Mbps)", type: "text", placeholder: "Enter Download Link Speed" },
  { name: "uploadSpeed", label: "Upload Link Speed (Mbps)", type: "text", placeholder: "Enter Upload Link Speed" },
  { name: "failureTime", label: "Failure Date & Time", type: "datetime-local", required: true },
  { name: "rectificationTime", label: "Rectification Time (RT)", type: "datetime-local", required: true },
  { name: "durationText", label: "Duration of Failure", type: "text", readonly: true },
  { name: "reason", label: "Reason of Failure", type: "select", required: true, options: ["Gateway Down", "Fiber Cut", "Equipment Failure", "Power Issue", "Other"] },
  { name: "remarks", label: "Remarks", type: "textarea", fullWidth: true, placeholder: "Enter observations, troubleshooting details, or additional remarks" },
];

export const DAILY_POSITION_FORMS: DailyPositionFormDefinition[] = [
  {
    category: "Communication & Voice Circuits",
    name: "Control & ICMS Position",
    badge: "CFTF",
    systemCode: "SECR/TEL/ICMS-01",
    description: "Integrated Coaching Management System & Control Office Application status tracking.",
    fields: standardFaultFields,
  },
  {
    category: "Communication & Voice Circuits",
    name: "FOIS (VSAT)",
    badge: "FOIS",
    systemCode: "SECR/TEL/FOIS-02",
    description: "Freight Operations Information System terminal connectivity and central host communications.",
    fields: standardFaultFields,
  },
  {
    category: "Communication & Voice Circuits",
    name: "Hotline",
    badge: "HOTLINE",
    systemCode: "SECR/TEL/HOT-03",
    description: "Direct voice hotline linking General Manager to CRB.",
    fields: standardFaultFields,
  },
  {
    category: "Communication & Voice Circuits",
    name: "Video Conferencing with Divisions",
    badge: "VC-D",
    systemCode: "SECR/TEL/VC-04",
    description: "Daily video conference link connecting HQ to divisional heads.",
    fields: standardFaultFields,
  },
  {
    category: "Communication & Voice Circuits",
    name: "Railway Board Video Phones",
    badge: "VP-RB",
    systemCode: "SECR/TEL/VPHONE-05",
    description: "SIP-based video telephone terminals for Board communications.",
    fields: [
      requiredDocketField,
      ...hierarchyFields,
      {
        name: "videoPhoneLocation",
        label: "Video Phone in Chamber of PHOD",
        type: "select",
        required: true,
        options: [
          "PCSTE",
          "PCE",
          "PCEE",
          "PCCM",
          "PCME",
          "PCOM",
          "PCPO",
          "PCMM",
          "PCMD",
          "PFA",
          "DCCM",
          "PCSO",
          "PCSC",
          "Other"
        ]
      },
      { name: "videoClarity", label: "Video Clarity", type: "select", required: true, options: ["Excellent", "Good", "Satisfactory", "Poor", "No Video"] },
      { name: "audioClarity", label: "Audio Clarity", type: "select", required: true, options: ["Excellent", "Good", "Satisfactory", "Poor", "No Audio"] },
      ...timingFields,
      ...reasonRemarkFields,
    ],
  },
  {
    category: "Communication & Voice Circuits",
    name: "CFTM Conference",
    badge: "CONF",
    systemCode: "SECR/TEL/CONF-06",
    description: "Conference circuit for Chief Freight Transportation Manager operations.",
    fields: standardFaultFields,
  },

  {
    category: "Network & Internet",
    name: "Railnet / Internet",
    badge: "NET",
    systemCode: "SECR/TEL/NET-08",
    description: "SECR Railway Intranet and official broadband gateways.",
    fields: RAILNET_DIVISIONAL_FIELDS,
  },
  {
    category: "Network & Internet",
    name: "Wi-Fi",
    badge: "WIFI",
    systemCode: "SECR/TEL/WIFI-09",
    description: "Public Wi-Fi access points at stations (RailWire).",
    fields: [
      { name: "majorSection", label: "Major Section", type: "select", required: true },
      { name: "section", label: "Section", type: "select", required: true },
      { name: "assetId", label: "Linked Asset", type: "select" },
      { name: "faultyAccessPointLocation", label: "Location of Faulty Access Point", type: "text", required: true },
      ...timingFields,
      ...reasonRemarkFields,
    ],
  },
  {
    category: "Network & Internet",
    name: "PRS/UTS",
    badge: "PRS/UTS",
    systemCode: "SECR/TEL/PRSUTS-11",
    description: "Passenger Reservation System & Unreserved Ticketing System network terminals.",
    fields: [
      { name: "systemType", label: "System Type", type: "select", required: true, options: ["PRS", "UTS", "PRS/UTS"] },
      ...hierarchyFields,
      { name: "natureOfFault", label: "Nature of Fault", type: "select", required: true, options: ["Equipment", "Link", "Power", "Other"] },
      ...timingFields,
      ...reasonRemarkFields,
    ],
  },
  {
    category: "Cable Infrastructure",
    name: "Cable Cut (OFC & Quad)",
    badge: "CUT",
    systemCode: "SECR/TEL/CUT-13",
    description: "Real-time track monitoring of optical fiber and copper quad media cuts.",
    fields: [
      ...hierarchyFields,
      { name: "kmNo", label: "Km.No.", type: "text", required: true },
      { name: "cableType", label: "Cable Type", type: "select", required: true, options: ["OFC", "Quad", "OFC & Quad"] },
      { name: "cableCutByWhom", label: "Cable Cut By Whom", type: "text", required: true },
      ...timingFields,
      ...reasonRemarkFields,
    ],
  },
  {
    category: "Cable Infrastructure",
    name: "Temporary Joints",
    badge: "JOINT",
    systemCode: "SECR/TEL/JNT-14",
    description: "Temporary splice closures awaiting permanent block jointing.",
    statusMode: "maintenance",
    fields: [
      { name: "sectionYard", label: "Section / Yard", type: "text", required: true },
      { name: "kmNo", label: "Km.No.", type: "text", required: true },
      { name: "cableType", label: "Cable Type", type: "select", required: true, options: ["OFC", "Quad"] },
      { name: "temporaryJointsCount", label: "Temporary Joints Count", type: "number", required: true },
      { name: "rectifiedJoints", label: "Rectified Joints", type: "number", required: true },
      { name: "tdc", label: "TDC", type: "date" },
      { name: "actionPlan", label: "Action Plan", type: "textarea", fullWidth: true },
      ...reasonRemarkFields,
    ],
  },
  {
    category: "Cable Infrastructure",
    name: "Low Insulation",
    badge: "INS",
    systemCode: "SECR/TEL/INS-15",
    description: "Insulation resistance values monitoring for signaling/block quad pairs.",
    statusMode: "maintenance",
    fields: [
      ...hierarchyFields,
      { name: "kmNo", label: "Km.No.", type: "text" },
      { name: "cableType", label: "Cable Type", type: "select", required: true, options: ["Quad", "OFC", "Other"] },
      { name: "totalInsulationFaults", label: "Total Insulation Faults", type: "number", required: true },
      { name: "rectifiedFaults", label: "Rectified Faults", type: "number", required: true },
      { name: "rectifiedDateTime", label: "Rectified Date & Time", type: "datetime-local" },
      { name: "balanceInsulationFaults", label: "Balance Insulation Faults", type: "number", readonly: true },
      { name: "actionPlanTdc", label: "Action Plan / TDC", type: "textarea", fullWidth: true },
      ...reasonRemarkFields,
    ],
  },
  {
    category: "Display System",
    name: "CGDM",
    badge: "CGDM",
    systemCode: "SECR/TEL/CGDM-16",
    description: "Coach Guidance Display System showing coach layouts on platforms.",
    fields: [
      ...hierarchyFields,
      { name: "pfNo", label: "PF No.", type: "text", required: true },
      { name: "faultyGuidanceBoards", label: "No. of Faulty Guidance Boards", type: "number", required: true },
      ...timingFields,
      ...reasonRemarkFields,
    ],
  },
  {
    category: "Display System",
    name: "TIB",
    badge: "TIB",
    systemCode: "SECR/TEL/TIB-17",
    description: "Train Indication Boards displaying arrival and departure timings.",
    fields: [
      ...hierarchyFields,
      { name: "faultyTibLocation", label: "Location of Faulty TIB", type: "text", required: true },
      { name: "faultyBoards", label: "No. of Faulty Boards", type: "number", required: true },
      ...timingFields,
      ...reasonRemarkFields,
    ],
  },
  {
    category: "Testing & Maintenance",
    name: "Walkie-Talkie Testing",
    badge: "VHF-T",
    systemCode: "SECR/TEL/VHFT-18",
    description: "VHF hand-held transceiver frequency and power test logs.",
    statusMode: "maintenance",
    fields: [
      { name: "testedSets", label: "Tested Sets", type: "number", required: true },
      { name: "defectiveSets", label: "Defective Sets", type: "number", required: true },
      { name: "frequency", label: "Frequency", type: "text" },
      { name: "powerOutput", label: "Power Output", type: "text" },
      { name: "testDate", label: "Test Date", type: "date", required: true },
      ...reasonRemarkFields,
    ],
  },
  {
    category: "Testing & Maintenance",
    name: "Walkie-Talkie Repairing",
    badge: "VHF-R",
    systemCode: "SECR/TEL/VHFR-19",
    description: "Workshop maintenance records and battery cell replacements.",
    statusMode: "maintenance",
    fields: [
      { name: "defectiveSets", label: "Defective Sets", type: "number", required: true },
      { name: "repairedSets", label: "Repaired Sets", type: "number", required: true },
      { name: "setsCondemned", label: "Sets Condemned", type: "number" },
      { name: "targetCondemnationDate", label: "Target Condemnation Date", type: "date" },
      { name: "repairStatus", label: "Repair Status", type: "select", required: true, options: ["Pending", "In Progress", "Completed"] },
      { name: "actionTaken", label: "Action Taken", type: "textarea", fullWidth: true },
      { name: "repairFaults", label: "Repair Faults", type: "textarea", fullWidth: true },
    ],
  },
  {
    category: "CCTV",
    name: "CCTV Monitoring",
    badge: "CCTV-M",
    systemCode: "SECR/TEL/CCTVM-20",
    description: "Video surveillance cameras live status feeds at platforms.",
    fields: [
      ...hierarchyFields,
      { name: "totalCctv", label: "Total CCTV", type: "number", required: true },
      { name: "notWorkingCctv", label: "Not Working CCTV", type: "number", required: true },
      { name: "liveFeedToWarRoomFailed", label: "Live Feed To War Room Failed", type: "select", required: true, options: ["Yes", "No"] },
      ...timingFields,
      ...reasonRemarkFields,
    ],
  },
  {
    category: "CCTV",
    name: "CCTV Maintenance",
    badge: "CCTV-S",
    systemCode: "SECR/TEL/CCTVS-21",
    description: "NVR storage check, camera cleaning, and PoE switch repairs.",
    fields: [
      ...hierarchyFields,
      { name: "totalCctv", label: "Total CCTV", type: "number", required: true },
      { name: "notWorkingCctv", label: "Not Working CCTV", type: "number", required: true },
      { name: "maintenanceActivity", label: "Maintenance Activity", type: "text", required: true },
      ...timingFields,
      ...reasonRemarkFields,
    ],
  },
  ...[
    ["BSP", "EX-BSP", "SECR/TEL/EX-01", "Bilaspur main electronic telephone exchange switchboard."],
    ["Div HQ", "EX-HQ", "SECR/TEL/EX-02", "Divisional Headquarters telecom exchange system."],
    ["Div (for Zone)", "EX-DIV", "SECR/TEL/EX-03", "Divisional trunk lines connecting to zonal network."],
    ["Loco Shed (BSP)", "EX-LOC", "SECR/TEL/EX-04", "Loco shed dedicated internal exchange lines."],
    ["RIG", "EX-RIG", "SECR/TEL/EX-05", "Raigarh station local railway exchange."],
    ["APG", "EX-APG", "SECR/TEL/EX-06", "Anuppur local railway exchange."],
    ["SDL", "EX-SDL", "SECR/TEL/EX-07", "Shahdol railway telephone exchange."],
    ["MDGR", "EX-MDGR", "SECR/TEL/EX-08", "Manendragarh exchange terminal."],
    ["BSRI", "EX-BSRI", "SECR/TEL/EX-09", "Bishrampur exchange unit."],
    ["CPH", "EX-CPH", "SECR/TEL/EX-10", "Champa junction local exchange."],
    ["KRBA", "EX-KRBA", "SECR/TEL/EX-11", "Korba industrial branch exchange."],
    ["BRJN", "EX-BRJN", "SECR/TEL/EX-12", "Brajrajnagar station exchange."],
    ["PND", "EX-PND", "SECR/TEL/EX-13", "Pendra Road local railway exchange."],
    ["UMR", "EX-UMR", "SECR/TEL/EX-14", "Umaria railway telephone exchange."],
    ["BRS", "EX-BRS", "SECR/TEL/EX-15", "Birsinghpur exchange lines."],
  ].map(([name, badge, systemCode, description]) => ({
    category: "Exchange",
    name,
    badge,
    systemCode,
    description,
    fields: exchangeFields,
  })),
  {
    category: "Rail Madad",
    name: "Rail Madad",
    badge: "MADAD",
    systemCode: "SECR/TEL/MAD-07",
    description: "Passenger grievance portal integration and telecom complaints hotline.",
    fields: [
      requiredDocketField,
      { name: "caseReference", label: "Case Reference", type: "text", required: true },
      { name: "complaintStatus", label: "Complaint Status", type: "select", required: true, options: ["Open", "In Progress", "Closed"] },
      { name: "complaintDetails", label: "Complaint Details", type: "textarea", required: true, fullWidth: true },
      ...reasonRemarkFields,
    ],
  },
  {
    category: "Daily Log",
    name: "Daily Position Log",
    badge: "LOG",
    systemCode: "SECR/TEL/LOG",
    description: "General daily telecom position/status update.",
    statusMode: "log",
    fields: [
      { name: "logDetails", label: "Log New Telecom Position / Status Update", type: "textarea", required: true, fullWidth: true, placeholder: "Enter today's status remarks, cable faults, insulation measurements, test results, etc." },
      { name: "remarks", label: "Remarks", type: "textarea", fullWidth: true },
    ],
  },
];

export const DAILY_POSITION_CATEGORIES = Array.from(new Set(DAILY_POSITION_FORMS.map(form => form.category)));

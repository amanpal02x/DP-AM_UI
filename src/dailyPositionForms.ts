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
  { name: "majorSection", label: "Major Section", type: "select", required: true },
  { name: "section", label: "Section", type: "select", required: true },
  { name: "stationCode", label: "Station/Location", type: "select", required: true },
  requiredDocketField,
  {
    name: "exchangeName",
    label: "Name of Exchange",
    type: "select",
    required: true,
    options: [
      "BSP Exchange",
      "Div HQ Exchange",
      "Div (for Zone) Exchange",
      "Loco Shed (BSP) Exchange",
      "RIG Exchange",
      "APG Exchange",
      "SDL Exchange",
      "MDGR Exchange",
      "BSRI Exchange",
      "CPH Exchange",
      "KRBA Exchange",
      "BRJN Exchange",
      "PND Exchange",
      "UMR Exchange",
      "BRS Exchange"
    ]
  },
  {
    name: "nameOfFault",
    label: "Name of Fault",
    type: "select",
    required: true,
    options: ["SIP Down", "VoIP Trunk Down", "MDF Card Fault", "Power Issue", "Other"]
  },
  { name: "failureTime", label: "Failure Date & Time", type: "datetime-local", required: true },
  { name: "rectificationTime", label: "Rectification Time (RT)", type: "datetime-local", required: true },
  { name: "durationText", label: "Duration of Failure", type: "text", readonly: true },
  {
    name: "reason",
    label: "Reason of Failure",
    type: "select",
    required: true,
    options: ["Hardware Failure", "Link Failure", "Power Issue", "Configuration Error", "Other"]
  },
  {
    name: "remarks",
    label: "Remarks",
    type: "textarea",
    fullWidth: true,
    placeholder: "Enter observations, troubleshooting details, action taken, or additional remarks"
  },
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
      { name: "cfmsNo", label: "CFMS No", type: "text", placeholder: "Enter CFMS No (optional)" },
      { name: "majorSection", label: "Major Section", type: "select", required: true },
      { name: "section", label: "Section", type: "select", required: true },
      { name: "sectionYard", label: "Section/Yard", type: "select", required: true, options: ["Yard", "Block Section", "Station", "Other"] },
      { name: "kmNo", label: "Km.No.", type: "text", required: true, placeholder: "Enter Kilometer number (e.g. 712/14)" },
      { name: "cableType", label: "Cable Type", type: "select", required: true, options: ["OFC", "Quad", "OFC & Quad"] },
      { name: "cableCutByWhom", label: "Cable Cut by Whom", type: "select", required: true, options: ["DFCCIL", "NHAI", "RVNL", "Contractor", "Private Party", "Other"], placeholder: "Select Excavator(s)..." },
      { name: "failureTime", label: "Failure Date & Time", type: "datetime-local", required: true },
      { name: "rectificationTime", label: "Rectification Time (RT)", type: "datetime-local", required: true },
      { name: "durationText", label: "Duration of Failure", type: "text", readonly: true },
      { name: "reason", label: "Reason of Failure", type: "text", required: true, placeholder: "Enter reason of cable cut (e.g. JCB digging)" },
      { name: "remarks", label: "Remarks", type: "textarea", fullWidth: true, placeholder: "Enter observations, joint type, or restoration remarks" },
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
      { name: "majorSection", label: "Major Section", type: "select", required: true },
      { name: "section", label: "Section", type: "select", required: true },
      { name: "sectionYard", label: "Section/ Yard Name", type: "text", required: true, placeholder: "Enter Section/ Yard name (e.g. CPH-RIG Section)" },
      { name: "kmNo", label: "Km.No.", type: "text", required: true, placeholder: "Enter Kilometer number (e.g. 732/18)" },
      { name: "cableType", label: "Type of Cable", type: "text", required: true, placeholder: "Enter Type of Cable (e.g. OFC (24 Core))" },
      { name: "temporaryJointsCount", label: "Total No. of Temporary Joints", type: "number", required: true, placeholder: "Total count of temporary joints" },
      { name: "dateTime", label: "Date & Time", type: "datetime-local", required: true },
      { name: "rectifiedJoints", label: "Temporary Joints Rectified", type: "number", required: true, placeholder: "Rectified joints count" },
      { name: "rectifiedDateTime", label: "Temporary Joints Rectified (Date & Time)", type: "datetime-local" },
      { name: "balanceTemporaryJoints", label: "Balance Temporary Joints", type: "number", readonly: true },
      { name: "tdc", label: "Target Date of Completion (TDC)", type: "date", required: true },
      { name: "actionPlan", label: "Action Plans & TDC to Rectify the Temporary Joints", type: "textarea", required: true, placeholder: "Enter Action Plan" },
      { name: "remarks", label: "Remarks", type: "textarea", fullWidth: true, placeholder: "Enter observations, cable splice details, or testing measurements" },
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
      { name: "majorSection", label: "Major Section", type: "select", required: true },
      { name: "section", label: "Sub Section", type: "select", required: true },
      { name: "sectionYard", label: "Section/Yard", type: "select", required: true, options: ["Yard", "Block Section", "Station", "Other"] },
      { name: "kmNo", label: "Km.No.", type: "text", required: true, placeholder: "Enter Kilometer number (e.g. 732/18)" },
      { name: "cableType", label: "Type of Cable", type: "text", required: true, placeholder: "Enter Type of Cable (e.g. 6 Quad Cable)" },
      { name: "failureTime", label: "Total no. of Insulation Faults(Date & Time)", type: "datetime-local", required: true },
      { name: "rectificationTime", label: "Low Insulation rectified (Date & Time)", type: "datetime-local" },
      { name: "balanceInsulationFaults", label: "Balance Low Insulation Fault To be rectified", type: "number", required: true, placeholder: "Enter balance faults count" },
      { name: "actionPlanTdc", label: "Action Plan & TDC to rectify Low Insulation", type: "textarea", required: true, placeholder: "Enter Action Plan & TDC" },
      { name: "remarks", label: "Remarks", type: "textarea", fullWidth: true, placeholder: "Enter observations, cable quad details, or testing measurements" },
    ],
  },
  {
    category: "Display System",
    name: "CGDM",
    badge: "CGDM",
    systemCode: "SECR/TEL/CGDM-16",
    description: "Coach Guidance Display System showing coach layouts on platforms.",
    fields: [
      { name: "majorSection", label: "Major Section", type: "select", required: true },
      { name: "section", label: "Section", type: "select", required: true },
      { name: "stationCode", label: "Faulty Station Name", type: "select", required: true },
      { name: "pfNo", label: "PF NO.", type: "text", required: true, placeholder: "Enter Platform Number (e.g. 2)" },
      { name: "faultyGuidanceBoards", label: "No. of faulty board", type: "number", required: true, placeholder: "Enter number of faulty boards" },
      { name: "failureTime", label: "Failure (Date & Time)", type: "datetime-local", required: true },
      { name: "rectificationTime", label: "Rectification Time(RT) (Date & Time)", type: "datetime-local", required: true },
      { name: "durationText", label: "Total Duration (Hrs.Min.)", type: "text", readonly: true },
      { name: "reason", label: "Reason Of Failure", type: "text", required: true, placeholder: "Enter reason of failure" },
      { name: "remarks", label: "Remarks", type: "textarea", fullWidth: true, placeholder: "Enter observations or restoration details" },
    ],
  },
  {
    category: "Display System",
    name: "TIB",
    badge: "TIB",
    systemCode: "SECR/TEL/TIB-17",
    description: "Train Indication Boards displaying arrival and departure timings.",
    fields: [
      { name: "majorSection", label: "Major Section", type: "select", required: true },
      { name: "section", label: "Section", type: "select", required: true },
      { name: "stationCode", label: "Location of faulty TIB", type: "select", required: true },
      { name: "faultyBoards", label: "No. Of Faulty TIB", type: "number", required: true, placeholder: "Enter number of faulty TIBs" },
      { name: "failureTime", label: "Failure (Date & Time)", type: "datetime-local", required: true },
      { name: "rectificationTime", label: "Rectification Time( RT)", type: "datetime-local", required: true },
      { name: "durationText", label: "Total Duration (Hrs.Min.)", type: "text", readonly: true },
      { name: "reason", label: "Reason Of Failure", type: "text", required: true, placeholder: "Enter reason of failure" },
      { name: "remarks", label: "Remarks", type: "textarea", fullWidth: true, placeholder: "Enter observations or restoration details" },
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
      { name: "stationLobby", label: "Station / Lobby", type: "text", required: true, placeholder: "Enter Station or Lobby name (e.g. BSP Lobby)" },
      { name: "makeModel", label: "Make / Model", type: "select", required: true, options: ["Motorola", "Kenwood", "Icom", "Hytera", "Vertex Standard", "Other"] },
      { name: "serialNo", label: "Walkie Talkie Serial No.", type: "text", required: true, placeholder: "Enter Walkie Talkie serial number" },
      { name: "frequency", label: "Frequency Configuration -MHZ", type: "text", required: true, placeholder: "Enter frequency (e.g. 150.5 MHz)" },
      { name: "powerOutput", label: "Output TX Power", type: "text", required: true, placeholder: "Enter output power (e.g. 5W)" },
      { name: "batteryVoltage", label: "Battery Voltage", type: "text", required: true, placeholder: "Enter battery voltage (e.g. 7.4V)" },
      { name: "batteryCurrent", label: "Battery Current", type: "text", required: true, placeholder: "Enter battery current (e.g. 1.5A)" },
      { name: "antennaStatus", label: "Antenna", type: "select", required: true, options: ["OK", "Defective", "Missing", "Other"] },
      { name: "testDate", label: "Date of Testing", type: "date", required: true },
      { name: "toBeTestedCount", label: "Total walkie-talkies to be tested", type: "number", required: true, placeholder: "Total count to be tested" },
      { name: "testedCount", label: "Total walkie-talkies tested", type: "number", required: true, placeholder: "Total count tested" },
      { name: "balanceWalkieTalkies", label: "Balance walkie-talkies to be tested (Calculated)", type: "number", readonly: true },
      { name: "remarks", label: "Remarks", type: "textarea", fullWidth: true, placeholder: "Enter any additional details, issues faced, or test observations" },
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
      { name: "majorSection", label: "Major Section", type: "select", required: true },
      { name: "section", label: "Section", type: "select", required: true },
      { name: "stationCode", label: "Station/Location", type: "select", required: true },
      { name: "testDate", label: "Date", type: "date", required: true },
      { name: "openingDefective", label: "Opening Balance of Defective Sets", type: "number", required: true, placeholder: "Enter opening balance" },
      { name: "receivedFromUser", label: "Defective Sets Received from User Dept", type: "number", required: true, placeholder: "Received from user department" },
      { name: "sentToFirm", label: "Sets Sent to Firm for Repair", type: "number", required: true, placeholder: "Sent to firm for repair" },
      { name: "repairedFromFirm", label: "Repaired Sets Received from Firm", type: "number", required: true, placeholder: "Repaired sets received from firm" },
      { name: "returnedToUser", label: "Sets Returned to User Department", type: "number", required: true, placeholder: "Returned to user department" },
      { name: "pendingRepair", label: "Pending Repair Sets (Calculated)", type: "number", readonly: true },
      { name: "proposedCondemnation", label: "Sets Proposed for Condemnation", type: "number", required: true, placeholder: "Proposed for condemnation" },
      { name: "setsCondemned", label: "Sets Condemned", type: "number", required: true, placeholder: "Sets condemned" },
      { name: "totalCondemnedYear", label: "Total Sets Condemned This Year", type: "number", required: true, placeholder: "Total condemned this year" },
      { name: "repairStatus", label: "Repair Status", type: "select", required: true, options: ["Pending", "In Progress", "Completed"] },
      { name: "faultType", label: "Fault Type", type: "select", required: true, options: ["Speaker/Mic", "Battery", "Antenna", "Display", "Power/Tx/Rx", "Other"] },
      { name: "actionTaken", label: "Action Taken", type: "text", placeholder: "Describe action taken to repair defective sets" },
      { name: "remarks", label: "Remarks", type: "textarea", fullWidth: true, placeholder: "Enter any additional observations or comments" },
    ],
  },
  {
    category: "CCTV",
    name: "CCTV Monitoring",
    badge: "CCTV-M",
    systemCode: "SECR/TEL/CCTVM-20",
    description: "Video surveillance cameras live status feeds at platforms.",
    fields: [
      { name: "majorSection", label: "Major Section", type: "select", required: true },
      { name: "section", label: "Section", type: "select", required: true },
      { name: "totalNotWorkingCctvLoc", label: "Total CCTV/ Not working CCTV (NOS) (Location)", type: "text", required: true, placeholder: "e.g. Total: 16 / Not Working: 2 (PF-1)" },
      { name: "liveFeedToWarRoomFailed", label: "Live Feed To War Room Failed", type: "select", required: true, options: ["Yes", "No"] },
      { name: "failureTime", label: "Failure (Date & Time)", type: "datetime-local", required: true },
      { name: "rectificationTime", label: "Rectification Time(RT) (Date & Time)", type: "datetime-local", required: true },
      { name: "durationText", label: "Total Duration (Hrs.Min.)", type: "text", readonly: true },
      { name: "reason", label: "Reason Of Failure", type: "text", required: true, placeholder: "Enter reason of failure" },
      { name: "remarks", label: "Remarks", type: "textarea", fullWidth: true, placeholder: "Enter observations or restoration details" },
    ],
  },
  {
    category: "CCTV",
    name: "CCTV Maintenance",
    badge: "CCTV-S",
    systemCode: "SECR/TEL/CCTVS-21",
    description: "NVR storage check, camera cleaning, and PoE switch repairs.",
    fields: [
      { name: "majorSection", label: "Major Section", type: "select", required: true },
      { name: "section", label: "Section", type: "select", required: true },
      { name: "totalNotWorkingCctvLoc", label: "Total CCTV/ Not working CCTV (NOS) (Location)", type: "text", required: true, placeholder: "e.g. Total: 24 / Not Working: 2 (Bhilai Bazar)" },
      { name: "liveFeedToWarRoomFailed", label: "Live Feed To War Room Failed", type: "select", required: true, options: ["Yes", "No"] },
      { name: "failureTime", label: "Failure (Date & Time)", type: "datetime-local", required: true },
      { name: "rectificationTime", label: "Rectification Time(RT) (Date & Time)", type: "datetime-local", required: true },
      { name: "durationText", label: "Total Duration (Hrs.Min.)", type: "text", readonly: true },
      { name: "reason", label: "Reason Of Failure", type: "text", required: true, placeholder: "Enter reason of failure" },
      { name: "remarks", label: "Remarks", type: "textarea", fullWidth: true, placeholder: "Enter observations or restoration details" },
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
      { name: "majorSection", label: "Major Section", type: "select", required: true },
      { name: "section", label: "Section", type: "select", required: true },
      { name: "stationCode", label: "Station/Location", type: "select", required: true },
      requiredDocketField,
      { name: "caseDateTime", label: "Case Date & Time", type: "datetime-local", required: true },
      { name: "caseBalanceLastDate", label: "Case Balance Till Last Date", type: "number", required: true, placeholder: "Enter balance cases till last date" },
      { name: "caseReceivedOnDate", label: "Case Received on Date", type: "number", required: true, placeholder: "Enter cases received today" },
      { name: "caseCompliedOnDate", label: "Case complied On Date", type: "number", required: true, placeholder: "Enter cases complied today" },
      { name: "netBalanceCaseOnDate", label: "Net Balance Case On Date", type: "number", readonly: true },
      { name: "descriptionOfCase", label: "Description Of Case", type: "textarea", required: true, placeholder: "Enter grievance description details with date & time" },
      { name: "stComplianceDetails", label: "S&T Compliance details", type: "textarea", required: true, placeholder: "Enter S&T action taken and compliance details" },
      { name: "stComplianceDateTime", label: "S&T Compliance Date & Time", type: "datetime-local", required: true },
      { name: "remarks", label: "Remarks", type: "textarea", fullWidth: true, placeholder: "Enter additional remarks or observations" },
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

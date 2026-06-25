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
  { name: "majorSection", label: "Major Section", type: "select", placeholder: "Select Major Section" },
  { name: "section", label: "Section", type: "select", placeholder: "Select Section" },
  { name: "stationCode", label: "Station / Location", type: "select", placeholder: "Select Station / Location" },
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
  { name: "failureTime", label: "Failure Date & Time", type: "datetime-local", placeholder: "Select Failure Date & Time" },
  { name: "rectificationTime", label: "Rectification Date & Time", type: "datetime-local", placeholder: "Select Rectification Date & Time" },
  { name: "durationText", label: "Duration of Failure", type: "text", readonly: true, placeholder: "XX hrs XX min" },
];

const reasonRemarkFields: DailyPositionField[] = [
  { name: "reason", label: "Reason of Failure", type: "text", required: true, placeholder: "Enter reason" },
  { name: "remarks", label: "Remarks", type: "textarea", fullWidth: true, placeholder: "Enter remarks" },
];

const standardFaultFields: DailyPositionField[] = [
  docketField,
  ...hierarchyFields,
  { name: "natureOfFault", label: "Nature of Fault", type: "select", required: true, options: ["Equipment", "Link", "Power", "Other"], placeholder: "Select Nature of Fault" },
  { name: "natureOfFaultOther", label: "Nature of Fault (Other)", type: "text", required: true, placeholder: "Enter nature of fault" },
  ...timingFields,
  ...reasonRemarkFields,
];

const exchangeFields: DailyPositionField[] = [
  { name: "stationCode", label: "Station/Location", type: "select", placeholder: "Select Station/Location" },
  docketField,
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
    ],
    placeholder: "Select Name of Exchange"
  },
  {
    name: "nameOfFault",
    label: "Name of Fault",
    type: "select",
    required: true,
    options: ["SIP Down", "VoIP Trunk Down", "MDF Card Fault", "Power Issue", "Other"],
    placeholder: "Select Name of Fault"
  },
  { name: "failureTime", label: "Failure Date & Time", type: "datetime-local", placeholder: "Select Failure Date & Time" },
  { name: "rectificationTime", label: "Rectification Time (RT)", type: "datetime-local", placeholder: "Select Rectification Time" },
  {
    name: "reason",
    label: "Reason of Failure",
    type: "select",
    required: true,
    options: ["Hardware Failure", "Link Failure", "Power Issue", "Configuration Error", "Other"],
    placeholder: "Select Reason of Failure"
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
  { name: "stationCode", label: "Station / Location", type: "select", placeholder: "Select Station / Location" },
  { name: "natureOfFault", label: "Nature of Fault", type: "select", required: true, options: ["Equipment", "Link", "Power", "Other"], placeholder: "Select Nature of Fault" },
  { name: "natureOfFaultOther", label: "Nature of Fault (Other)", type: "text", required: true, placeholder: "Enter nature of fault" },
  { name: "attachFile", label: "Attach File / Report", type: "text", placeholder: "Attach file or enter link" },
  { name: "downloadSpeed", label: "Download Link Speed (Mbps)", type: "text", placeholder: "Enter Download Link Speed" },
  { name: "uploadSpeed", label: "Upload Link Speed (Mbps)", type: "text", placeholder: "Enter Upload Link Speed" },
  { name: "failureTime", label: "Failure Date & Time", type: "datetime-local", placeholder: "Select Failure Date & Time" },
  { name: "rectificationTime", label: "Rectification Time (RT)", type: "datetime-local", placeholder: "Select Rectification Time" },
  { name: "reason", label: "Reason of Failure", type: "select", required: true, options: ["Gateway Down", "Fiber Cut", "Equipment Failure", "Power Issue", "IPDSLAM", "Other"], placeholder: "Select Reason of Failure" },
  { name: "remarks", label: "Remarks", type: "textarea", fullWidth: true, placeholder: "Enter observations, troubleshooting details, or additional remarks" },
];

export const RAILNET_HQ_FIELDS: DailyPositionField[] = [
  docketField,
  { name: "natureOfFault", label: "Nature of Fault", type: "select", required: true, options: ["Equipment", "Link", "Power", "Other"], placeholder: "Select Nature of Fault" },
  { name: "natureOfFaultOther", label: "Nature of Fault (Other)", type: "text", required: true, placeholder: "Enter nature of fault" },
  { name: "attachFile", label: "Attach File / Report", type: "text", placeholder: "Attach file or enter link" },
  { name: "downloadSpeed", label: "Download Link Speed (Mbps)", type: "text", placeholder: "Enter Download Link Speed" },
  { name: "uploadSpeed", label: "Upload Link Speed (Mbps)", type: "text", placeholder: "Enter Upload Link Speed" },
  { name: "failureTime", label: "Failure Date & Time", type: "datetime-local", placeholder: "Select Failure Date & Time" },
  { name: "rectificationTime", label: "Rectification Time (RT)", type: "datetime-local", placeholder: "Select Rectification Time" },
  { name: "reason", label: "Reason of Failure", type: "select", required: true, options: ["Gateway Down", "Fiber Cut", "Equipment Failure", "Power Issue", "IPDSLAM", "Other"], placeholder: "Select Reason of Failure" },
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
        ],
        placeholder: "Select Video Phone in Chamber of PHOD"
      },
      { name: "videoClarity", label: "Video Clarity", type: "select", required: true, options: ["Excellent", "Good", "Satisfactory", "Poor", "No Video"], placeholder: "Select Video Clarity" },
      { name: "audioClarity", label: "Audio Clarity", type: "select", required: true, options: ["Excellent", "Good", "Satisfactory", "Poor", "No Audio"], placeholder: "Select Audio Clarity" },
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
      { name: "majorSection", label: "Major Section", type: "select", placeholder: "Select Major Section" },
      { name: "stationCode", label: "Station / Location", type: "select", placeholder: "Select Station / Location" },
      { name: "faultyAccessPointLocation", label: "Location of Faulty Access Point", type: "text", required: true, placeholder: "Enter location of faulty access point" },
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
      { name: "systemType", label: "System Type", type: "select", required: true, options: ["PRS", "UTS", "PRS/UTS"], placeholder: "Select System Type" },
      ...hierarchyFields,
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
      { name: "cpmsEntry", label: "CPMS No.", type: "select", required: false, options: ["YES", "NO"], placeholder: "Select CPMS Entry" },
      { name: "majorSection", label: "Major Section", type: "select", placeholder: "Select Major Section" },
      { name: "section", label: "Section", type: "select", placeholder: "Select Section" },
      { name: "sectionYard", label: "Yard", type: "select", options: ["Yard", "Block Section", "Station", "Other"], placeholder: "Select Yard" },
      { name: "kmNo", label: "OHE Mast No.", type: "text", required: true, placeholder: "Enter OHE Mast number (e.g. 732/18)" },
      { name: "cableType", label: "Cable Type", type: "select", required: true, options: ["OFC", "Quad", "OFC & Quad"], placeholder: "Select Cable Type" },
      { name: "cableCutByWhom", label: "Cable Cut by Whom", type: "select", required: true, options: ["DFCCIL", "NHAI", "RVNL", "Railway", "Contractor", "Private Party", "Other"], placeholder: "Select Excavator(s)..." },
      { name: "cableCutByWhomOther", label: "Cable Cut by Whom (Other)", type: "text", required: true, placeholder: "Enter who cut the cable" },
      { name: "failureTime", label: "Failure Date & Time", type: "datetime-local", placeholder: "Select Failure Date & Time" },
      { name: "rectificationTime", label: "Rectification Time (RT)", type: "datetime-local", placeholder: "Select Rectification Time" },
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
      { name: "majorSection", label: "Major Section", type: "select", placeholder: "Select Major Section" },
      { name: "section", label: "Section", type: "select", placeholder: "Select Section" },
      { name: "sectionYard", label: "Yard", type: "text", placeholder: "Enter Yard (e.g. CPH-RIG)" },
      { name: "kmNo", label: "OHE Mast No.", type: "text", required: true, placeholder: "Enter OHE Mast number (e.g. 732/18)" },
      { name: "cableType", label: "Type of Cable", type: "select", required: true, options: ["OFC", "6 QUAD", "OFC & 6 QUAD"], placeholder: "Select Type of Cable" },
      { name: "temporaryJointsCount", label: "Total No. of Temporary Joints", type: "number", placeholder: "Total count of temporary joints" },
      { name: "dateTime", label: "Date & Time", type: "datetime-local", required: true, placeholder: "Select Date & Time" },
      { name: "rectifiedJoints", label: "Temporary Joints Rectified", type: "number", placeholder: "Rectified joints count" },
      { name: "rectifiedDateTime", label: "Temporary Joints Rectified (Date & Time)", type: "datetime-local", placeholder: "Select Rectified Date & Time" },
      { name: "actionPlan", label: "Action Plans & TDC to Rectify the Temporary Joints", type: "textarea", placeholder: "Enter Action Plan" },
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
      { name: "majorSection", label: "Major Section", type: "select", placeholder: "Select Major Section" },
      { name: "section", label: "Section", type: "select", placeholder: "Select Section" },
      { name: "sectionYard", label: "Yard", type: "select", options: ["Yard", "Block Section", "Station", "Other"], placeholder: "Select Yard" },
      { name: "kmNo", label: "OHE Mast No.", type: "text", required: true, placeholder: "Enter OHE Mast number (e.g. 732/18)" },
      { name: "cableType", label: "Type of Cable", type: "select", required: true, options: ["OFC", "6 QUAD"], placeholder: "Select Type of Cable" },
      { name: "totalInsulationFaults", label: "Total no. of Insulation Faults", type: "number", placeholder: "Enter total number of faults" },
      { name: "failureTime", label: "Fault Date & Time", type: "datetime-local", placeholder: "Select Date & Time" },
      { name: "rectificationTime", label: "Low Insulation rectified (Date & Time)", type: "datetime-local", placeholder: "Select Rectified Date & Time" },
      { name: "balanceInsulationFaults", label: "Balance Low Insulation Fault To be rectified", type: "number", placeholder: "Enter balance faults count" },
      { name: "actionPlanTdc", label: "Action Plan & TDC to rectify Low Insulation", type: "textarea", placeholder: "Enter Action Plan & TDC" },
      { name: "remarks", label: "Remarks", type: "textarea", fullWidth: true, placeholder: "Enter observations, cable quad details, or testing measurements" },
    ],
  },
  {
    category: "Passenger Amenities",
    name: "CGDB",
    badge: "CGDB",
    systemCode: "SECR/TEL/CGDB-16",
    description: "Coach Guidance Display System showing coach layouts on platforms.",
    fields: [
      { name: "majorSection", label: "Major Section", type: "select", placeholder: "Select Major Section" },
      { name: "section", label: "Section", type: "select", placeholder: "Select Section" },
      { name: "stationCode", label: "Faulty Station Name", type: "select", placeholder: "Select Faulty Station Name" },
      { name: "pfNo", label: "PF NO.", type: "text", required: true, placeholder: "Enter Platform Number (e.g. 2)" },
      { name: "faultyGuidanceBoards", label: "No. of faulty board", type: "number", required: true, placeholder: "Enter number of faulty boards" },
      { name: "failureTime", label: "Failure (Date & Time)", type: "datetime-local", placeholder: "Select Failure Date & Time" },
      { name: "rectificationTime", label: "Rectification Time(RT) (Date & Time)", type: "datetime-local", placeholder: "Select Rectification Date & Time" },
      { name: "durationText", label: "Total Duration (Hrs.Min.)", type: "text", readonly: true, placeholder: "XX hrs XX min" },
      { name: "reason", label: "Reason Of Failure", type: "text", required: true, placeholder: "Enter reason of failure" },
      { name: "remarks", label: "Remarks", type: "textarea", fullWidth: true, placeholder: "Enter observations or restoration details" },
    ],
  },
  {
    category: "Passenger Amenities",
    name: "TIB",
    badge: "TIB",
    systemCode: "SECR/TEL/TIB-17",
    description: "Train Indication Boards displaying arrival and departure timings.",
    fields: [
      { name: "majorSection", label: "Major Section", type: "select", placeholder: "Select Major Section" },
      { name: "section", label: "Section", type: "select", placeholder: "Select Section" },
      { name: "stationCode", label: "Location of faulty TIB", type: "select", placeholder: "Select Location of faulty TIB" },
      { name: "faultyBoards", label: "No. Of Faulty TIB", type: "number", required: true, placeholder: "Enter number of faulty TIBs" },
      { name: "failureTime", label: "Failure (Date & Time)", type: "datetime-local", placeholder: "Select Failure Date & Time" },
      { name: "rectificationTime", label: "Rectification Time( RT)", type: "datetime-local", placeholder: "Select Rectification Date & Time" },
      { name: "durationText", label: "Total Duration (Hrs.Min.)", type: "text", readonly: true, placeholder: "XX hrs XX min" },
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
      { name: "makeModel", label: "Make / Model", type: "select", required: true, options: ["Motorola", "Kenwood", "Icom", "Hytera", "Vertex Standard", "Other"], placeholder: "Select Make / Model" },
      { name: "serialNo", label: "Walkie Talkie Serial No.", type: "text", required: true, placeholder: "Enter Walkie Talkie serial number" },
      { name: "powerOutput", label: "Output TX Power", type: "text", required: true, placeholder: "Enter output power (e.g. 5W)" },
      { name: "batteryVoltage", label: "Battery Voltage", type: "text", required: true, placeholder: "Enter battery voltage (e.g. 7.4V)" },
      { name: "batteryCurrent", label: "Battery Current", type: "text", required: true, placeholder: "Enter battery current (e.g. 1.5A)" },
      { name: "antennaStatus", label: "Antenna", type: "select", required: true, options: ["OK", "Damage", "Missing", "Other"], placeholder: "Select Antenna" },
      { name: "testDate", label: "Date of Testing", type: "date", required: true, placeholder: "Select Date of Testing" },
      { name: "toBeTestedCount", label: "Total walkie-talkies to be tested", type: "number", required: true, placeholder: "Total count to be tested" },
      { name: "testedCount", label: "Total walkie-talkies tested", type: "number", required: true, placeholder: "Total count tested" },
      { name: "balanceWalkieTalkies", label: "Balance walkie-talkies to be tested (Calculated)", type: "number", readonly: true, placeholder: "Calculated balance walkie-talkies" },
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
      { name: "stationCode", label: "Station/Lobby", type: "select", placeholder: "Select Station/Lobby" },
      { name: "testDate", label: "Date", type: "date", required: true, placeholder: "Select Date" },
      { name: "openingDefective", label: "Opening Balance of Defective Sets", type: "number", required: true, placeholder: "Enter opening balance" },
      { name: "receivedFromUser", label: "Defective Sets Received from User Dept", type: "number", required: true, placeholder: "Received from user department" },
      { name: "sentToFirm", label: "Sets Sent to Firm for Repair", type: "number", required: true, placeholder: "Sent to firm for repair" },
      { name: "repairedFromFirm", label: "Repaired Sets Received from Firm", type: "number", required: true, placeholder: "Repaired sets received from firm" },
      { name: "returnedToUser", label: "Sets Returned to User Department", type: "number", required: true, placeholder: "Returned to user department" },
      { name: "pendingRepair", label: "Pending Repair Sets (Calculated)", type: "number", readonly: true, placeholder: "Calculated pending repair sets" },
      { name: "proposedCondemnation", label: "Sets Proposed for Condemnation", type: "number", required: true, placeholder: "Proposed for condemnation" },
      { name: "setsCondemned", label: "Sets Condemned", type: "number", required: true, placeholder: "Sets condemned" },
      { name: "totalCondemnedYear", label: "Total Sets Condemned This Year", type: "number", required: true, placeholder: "Total condemned this year" },
      { name: "repairStatus", label: "Repair Status", type: "select", required: true, options: ["Pending", "In Progress", "Completed"], placeholder: "Select Repair Status" },
      { name: "faultType", label: "Fault Type", type: "select", required: true, options: ["Speaker/Mic", "Battery", "Antenna", "Display", "Power/Tx/Rx", "Other"], placeholder: "Select Fault Type" },
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
      { name: "majorSection", label: "Major Section", type: "select", placeholder: "Select Major Section" },
      { name: "section", label: "Section", type: "select", placeholder: "Select Section" },
      { name: "totalNotWorkingCctvLoc", label: "Total CCTV/ Not working CCTV (NOS) (Location)", type: "text", required: true, placeholder: "e.g. Total: 16 / Not Working: 2 (PF-1)" },
      { name: "liveFeedToWarRoomFailed", label: "Live Feed To War Room Failed", type: "select", required: true, options: ["Yes", "No"], placeholder: "Select Live Feed To War Room Failed" },
      { name: "failureTime", label: "Failure (Date & Time)", type: "datetime-local", placeholder: "Select Failure Date & Time" },
      { name: "rectificationTime", label: "Rectification Time(RT) (Date & Time)", type: "datetime-local", placeholder: "Select Rectification Date & Time" },
      { name: "durationText", label: "Total Duration (Hrs.Min.)", type: "text", readonly: true, placeholder: "XX hrs XX min" },
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
      { name: "majorSection", label: "Major Section", type: "select", placeholder: "Select Major Section" },
      { name: "section", label: "Section", type: "select", placeholder: "Select Section" },
      { name: "totalNotWorkingCctvLoc", label: "Total CCTV/ Not working CCTV (NOS) (Location)", type: "text", required: true, placeholder: "e.g. Total: 24 / Not Working: 2 (Bhilai Bazar)" },
      { name: "liveFeedToWarRoomFailed", label: "Live Feed To War Room Failed", type: "select", required: true, options: ["Yes", "No"], placeholder: "Select Live Feed To War Room Failed" },
      { name: "failureTime", label: "Failure (Date & Time)", type: "datetime-local", placeholder: "Select Failure Date & Time" },
      { name: "rectificationTime", label: "Rectification Time(RT) (Date & Time)", type: "datetime-local", placeholder: "Select Rectification Date & Time" },
      { name: "durationText", label: "Total Duration (Hrs.Min.)", type: "text", readonly: true, placeholder: "XX hrs XX min" },
      { name: "reason", label: "Reason Of Failure", type: "text", required: true, placeholder: "Enter reason of failure" },
      { name: "remarks", label: "Remarks", type: "textarea", fullWidth: true, placeholder: "Enter observations or restoration details" },
    ],
  },
  {
    category: "Exchange",
    name: "Exchange",
    badge: "EXCH",
    systemCode: "SECR/TEL/EX-ALL",
    description: "Electronic telephone exchange switchboard status tracking.",
    fields: exchangeFields,
  },
  {
    category: "Rail Madad",
    name: "Rail Madad",
    badge: "MADAD",
    systemCode: "SECR/TEL/MAD-07",
    description: "Passenger grievance portal integration and telecom complaints hotline.",
    fields: [
      { name: "majorSection", label: "Major Section", type: "select", placeholder: "Select Major Section" },
      { name: "section", label: "Section", type: "select", placeholder: "Select Section" },
      { name: "stationCode", label: "Station/Location", type: "select", placeholder: "Select Station/Location" },
      requiredDocketField,
      { name: "caseDateTime", label: "Case Date & Time", type: "datetime-local", required: true, placeholder: "Select Case Date & Time" },
      { name: "caseBalanceLastDate", label: "Case Balance Till Last Date", type: "number", required: true, placeholder: "Enter balance cases till last date" },
      { name: "caseReceivedOnDate", label: "Case Received on Date", type: "number", required: true, placeholder: "Enter cases received today" },
      { name: "caseCompliedOnDate", label: "Case complied On Date", type: "number", required: true, placeholder: "Enter cases complied today" },
      { name: "netBalanceCaseOnDate", label: "Net Balance Case On Date", type: "number", readonly: true, placeholder: "Calculated net balance cases" },
      { name: "descriptionOfCase", label: "Description Of Case", type: "textarea", required: true, placeholder: "Enter grievance description details with date & time" },
      { name: "stComplianceDetails", label: "S&T Compliance details", type: "textarea", required: true, placeholder: "Enter S&T action taken and compliance details" },
      { name: "stComplianceDateTime", label: "S&T Compliance Date & Time", type: "datetime-local", required: true, placeholder: "Select Compliance Date & Time" },
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
      { name: "remarks", label: "Remarks", type: "textarea", fullWidth: true, placeholder: "Enter remarks" },
    ],
  },
];

export const DAILY_POSITION_CATEGORIES = Array.from(new Set(DAILY_POSITION_FORMS.map(form => form.category)));

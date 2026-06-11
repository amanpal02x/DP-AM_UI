import type { DashboardSummary } from "../types";

export const mockDashboard: DashboardSummary = {
  division: "Raipur (R)",
  dateRange: "01 May 2024 - 31 May 2024",
  user: {
    name: "R. K. Sharma",
    designation: "SSE / Telecom",
    avatarUrl: "https://i.pravatar.cc/96?img=12",
    role: "SSE"
  },
  kpis: [
    {
      id: "assets",
      label: "Total Assets",
      value: "2,456",
      detail: "All active telecom inventory",
      trend: "+8.5% vs last month",
      tone: "blue",
      series: [41, 39, 42, 45, 44, 47, 46, 49, 51, 48, 53, 56]
    },
    {
      id: "operational",
      label: "Operational Assets",
      value: "1,896",
      detail: "77.2% of total assets",
      tone: "green",
      series: [69, 70, 68, 73, 72, 75, 71, 74, 70, 72, 71, 73]
    },
    {
      id: "maintenance",
      label: "Under Maintenance",
      value: "312",
      detail: "12.7% of total assets",
      tone: "amber",
      series: [24, 25, 31, 28, 34, 32, 33, 27, 30, 26, 28, 25]
    },
    {
      id: "faulty",
      label: "Faulty Assets",
      value: "248",
      detail: "10.1% of total assets",
      tone: "red",
      series: [18, 20, 22, 21, 25, 27, 23, 24, 22, 19, 21, 20]
    },
    {
      id: "health",
      label: "Operational Health",
      value: "87.6%",
      detail: "Division reliability score",
      trend: "+6.2% vs last month",
      tone: "purple",
      series: [77, 78, 77, 79, 81, 80, 81, 82, 80, 83, 85, 86]
    }
  ],
  categories: [
    { name: "IPIS", value: 568, percent: "23.1%", color: "#0b6dff" },
    { name: "CCTV", value: 456, percent: "18.6%", color: "#10b981" },
    { name: "PA System", value: 320, percent: "13.0%", color: "#f5b51b" },
    { name: "OFC", value: 280, percent: "11.4%", color: "#7c3aed" },
    { name: "VHF", value: 210, percent: "8.5%", color: "#0f5fbf" },
    { name: "Others", value: 622, percent: "25.4%", color: "#8b95a8" }
  ],
  severities: [
    { name: "Critical", value: 56, percent: "22.6%", color: "#ff3328" },
    { name: "Major", value: 102, percent: "41.1%", color: "#ff8a00" },
    { name: "Minor", value: 74, percent: "29.8%", color: "#f7b814" },
    { name: "Info", value: 16, percent: "6.5%", color: "#0b6dff" }
  ],
  statuses: [
    { status: "Operational", count: 1896, percent: "77.2%", color: "#20a91f" },
    { status: "Under Maintenance", count: 312, percent: "12.7%", color: "#ffb51b" },
    { status: "Faulty", count: 248, percent: "10.1%", color: "#ff3328" },
    { status: "Offline", count: 0, percent: "0%", color: "#c9ced8" }
  ],
  tickets: [
    {
      id: "t1",
      severity: "Critical",
      title: "IPIS display blank on PF1",
      location: "Raipur Jn.",
      assetRef: "IPIS-X2 • ast-881",
      status: "In Progress",
      updatedAt: "10 min ago"
    },
    {
      id: "t2",
      severity: "Major",
      title: "CCTV Camera not working PF3",
      location: "Durg",
      assetRef: "DS-2CD • ast-662",
      status: "Assigned",
      updatedAt: "35 min ago"
    },
    {
      id: "t3",
      severity: "Minor",
      title: "PA speaker distortion",
      location: "Bhatapara",
      assetRef: "PA-500 • ast-443",
      status: "Open",
      updatedAt: "1 hr ago"
    },
    {
      id: "t4",
      severity: "Info",
      title: "VHF set battery low",
      location: "Durg (Outer)",
      assetRef: "VHF-16 • ast-990",
      status: "Open",
      updatedAt: "6 hr ago"
    }
  ],
  maintenance: [
    {
      id: "m1",
      date: "MAY 24",
      title: "Quarterly PM - IPIS",
      location: "Raipur Jn.",
      assetRef: "IPIS-X2 • ast-881",
      due: "Due tomorrow"
    },
    {
      id: "m2",
      date: "MAY 26",
      title: "CCTV System Inspection",
      location: "Bhatapara",
      assetRef: "DS-NVR • ast-557",
      due: "In 2 days"
    },
    {
      id: "m3",
      date: "MAY 27",
      title: "PA System Check",
      location: "Durg",
      assetRef: "PA-500 • ast-443",
      due: "In 3 days"
    },
    {
      id: "m4",
      date: "MAY 28",
      title: "OFC Link Testing",
      location: "Raipur - Durg Section",
      assetRef: "Route integrity",
      due: "In 4 days"
    }
  ],
  activity: [
    {
      id: "a1",
      type: "approved",
      title: "Preventive maintenance approved",
      detail: "IPIS-X2 • Raipur Jn. • By R. K. Sharma",
      time: "10:24 AM"
    },
    {
      id: "a2",
      type: "ticket",
      title: "New fault ticket created",
      detail: "CCTV Camera not working • Durg",
      time: "09:58 AM"
    },
    {
      id: "a3",
      type: "maintenance",
      title: "Maintenance completed",
      detail: "PA System • Bhatapara",
      time: "09:42 AM"
    },
    {
      id: "a4",
      type: "user",
      title: "New user added",
      detail: "Amit Patel (Technician) • Durg",
      time: "09:15 AM"
    },
    {
      id: "a5",
      type: "asset",
      title: "Asset updated",
      detail: "VHF Set • Durg (Outer)",
      time: "08:50 AM"
    }
  ],
  alerts: [
    { id: "n1", tone: "red", title: "Critical fault in IPIS - PF1", detail: "Raipur Jn. • 10 min ago" },
    { id: "n2", tone: "amber", title: "OFC link down - Raipur to Durg", detail: "Since 25 min" },
    { id: "n3", tone: "red", title: "CCTV storage full - Durg", detail: "Since 1 hr" },
    { id: "n4", tone: "blue", title: "2 maintenance tasks pending approval", detail: "Since 2 hr" }
  ],
  bottomStats: [
    { id: "s1", label: "Stations", value: "128", detail: "Active Stations", tone: "blue" },
    { id: "s2", label: "Gates", value: "215", detail: "Total Gates", tone: "green" },
    { id: "s3", label: "OFC Route (KM)", value: "1,248", detail: "Total Route", tone: "amber" },
    { id: "s4", label: "Open Tickets", value: "42", detail: "Require Attention", tone: "red" },
    { id: "s5", label: "PM Compliance", value: "92.4%", detail: "This Month", tone: "purple" },
    { id: "s6", label: "AMC Coverage", value: "86.7%", detail: "Assets Under AMC", tone: "teal" }
  ]
};

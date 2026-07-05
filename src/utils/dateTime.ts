export const APP_TIME_ZONE = "Asia/Kolkata";

export const toUTCFromISTString = (value: string | null | undefined) => {
  if (!value) return null;
  if (value.includes("Z") || /\+\d{2}:?\d{2}$/.test(value) || /-\d{2}:?\d{2}$/.test(value)) {
    return new Date(value).toISOString();
  }
  return new Date(`${value}+05:30`).toISOString();
};

const validDate = (value: string | Date | null | undefined) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  let parsedValue = value;
  if (typeof value === "string" && value.includes("T") && !value.includes("Z") && !/\+\d{2}:?\d{2}$/.test(value) && !/-\d{2}:?\d{2}$/.test(value)) {
    parsedValue = `${value}+05:30`;
  }
  const date = new Date(parsedValue);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const toDateValue = (date = new Date()) => {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${year}-${month}-${day}`;
};

export const toLocalDateTimeValue = (date = new Date()) => {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  const hour = parts.find((p) => p.type === "hour")?.value;
  const minute = parts.find((p) => p.type === "minute")?.value;
  return `${year}-${month}-${day}T${hour}:${minute}`;
};

export const formatDate24 = (value: string | Date | null | undefined) => {
  const date = validDate(value);
  if (!date) return "-";
  
  const formatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: APP_TIME_ZONE,
    day: "numeric",
    month: "long",
    year: "2-digit",
  });
  
  const parts = formatter.formatToParts(date);
  const day = parts.find((p) => p.type === "day")?.value || "";
  const month = parts.find((p) => p.type === "month")?.value || "";
  const year = parts.find((p) => p.type === "year")?.value || "";
  
  return `${day} ${month} ${year}`;
};

export const formatTime24 = (
  value: string | Date | null | undefined,
  includeSeconds = false
) => {
  const date = validDate(value);
  if (!date) return "-";
  return date.toLocaleTimeString("en-GB", {
    timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    ...(includeSeconds ? { second: "2-digit" } : {}),
    hour12: false,
  });
};

export const formatDateTime24 = (
  value: string | Date | null | undefined,
  includeSeconds = false
) => {
  const date = validDate(value);
  if (!date) return "-";
  return `${formatDate24(date)}, ${formatTime24(date, includeSeconds)}`;
};

const ordinalSuffix = (day: number) => {
  if (day >= 11 && day <= 13) return "th";
  if (day % 10 === 1) return "st";
  if (day % 10 === 2) return "nd";
  if (day % 10 === 3) return "rd";
  return "th";
};

export const formatPositionDate = (dateText: string, previousDay = false) => {
  const date = new Date(`${dateText}T00:00:00+05:30`);
  if (Number.isNaN(date.getTime())) return dateText;
  if (previousDay) date.setUTCDate(date.getUTCDate() - 1);

  const day = Number(new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIME_ZONE,
    day: "numeric",
  }).format(date));
  const month = new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIME_ZONE,
    month: "long",
  }).format(date);

  return `${day}${ordinalSuffix(day)} ${month}`;
};

export const shiftDateText = (dateText: string, days: number) => {
  const date = new Date(`${dateText}T00:00:00+05:30`);
  if (Number.isNaN(date.getTime())) return dateText;
  date.setUTCDate(date.getUTCDate() + days);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

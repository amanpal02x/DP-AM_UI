export const APP_TIME_ZONE = "Asia/Kolkata";

const validDate = (value: string | Date | null | undefined) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatDate24 = (value: string | Date | null | undefined) => {
  const date = validDate(value);
  if (!date) return "-";
  return date.toLocaleDateString("en-IN", {
    timeZone: APP_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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

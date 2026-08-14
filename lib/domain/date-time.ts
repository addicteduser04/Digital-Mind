export function localDateTimeToIso(value: string, timeZone = "Africa/Casablanca") {
  if (!value) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error("Invalid local date and time.");
  const [, year, month, day, hour, minute] = match;
  const wallUtc = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset", hour: "2-digit" });
  const offsetLabel = formatter.formatToParts(new Date(wallUtc)).find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  const offsetMatch = /^GMT(?:([+-])(\d{2}):(\d{2}))?$/.exec(offsetLabel);
  const sign = offsetMatch?.[1] === "-" ? -1 : 1;
  const offsetMinutes = offsetMatch?.[2]
    ? sign * (Number(offsetMatch[2]) * 60 + Number(offsetMatch[3]))
    : 0;
  return new Date(wallUtc - offsetMinutes * 60_000).toISOString();
}

export function dateTimeLocalValue(value: Date | null, timeZone = "Africa/Casablanca") {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

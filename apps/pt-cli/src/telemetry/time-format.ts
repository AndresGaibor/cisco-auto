const ECUADOR_TIME_ZONE = "America/Guayaquil";

const ECUADOR_TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  timeZone: ECUADOR_TIME_ZONE,
  hour12: false,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export function formatEcuadorTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return ECUADOR_TIME_FORMATTER.format(date);
}

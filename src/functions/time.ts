export const time = {
  /** Extracts the day as a number from a datetime */
  day: (a: unknown) => {
    if (typeof a !== "string") return null;
    return new Date(a).getDay();
  },
  /** Rounds a datetime down by a specific duration */
  floor: (a: unknown, round: "1w" | "1d" | "1y") => {
    if (typeof a !== "string") return null;

    if (round === "1w") {
      return setToMonday(new Date(a)).toISOString();
    }

    // TODO 1d 1y 1m etc..

    return new Date(a).toISOString();
  },
  /** Groups a datetime by a particular time interval */
  group: (
    datetime: unknown,
    interval: "year" | "month" | "day" | "hour" | "minute" | "second",
  ): string | null => {
    if (typeof datetime !== "string") return null;
    let a = new Date(datetime);

    a.setUTCMilliseconds(0);
    if (interval === "second") return a.toISOString();

    a.setUTCSeconds(0);
    if (interval === "minute") return a.toISOString();

    a.setUTCMinutes(0);
    if (interval === "hour") return a.toISOString();

    a.setUTCHours(0);
    if (interval === "day") return a.toISOString();

    a.setUTCDate(1);
    if (interval === "month") return a.toISOString();

    a.setUTCMonth(0);
    if (interval === "year") return a.toISOString();

    return a.toISOString();
  },
  /** Extracts the hour as a number from a datetime */
  hour: (datetime: unknown): number | null => {
    if (typeof datetime !== "string") return null;
    return new Date(datetime).getUTCHours();
  },
  /** Extracts the minutes as a number from a datetime */
  mins: (datetime: unknown): number | null => {
    if (typeof datetime !== "string") return null;
    return new Date(datetime).getUTCMinutes();
  },
  /** Extracts the month as a number from a datetime */
  month: (datetime: unknown): number | null => {
    if (typeof datetime !== "string") return null;
    return new Date(datetime).getUTCMonth() + 1;
  },
  /** Returns the number of nanoseconds since the UNIX epoch */
  nano: (datetime: unknown): number | null => {
    if (typeof datetime !== "string") return null;
    return new Date(datetime).getTime() * 1000000;
  },
  /** Returns the current datetime */
  now: () => {
    return new Date().toISOString();
  },
  /** Rounds a datetime up by a specific duration */
  round: () => {},
  /** Extracts the secs as a number from a datetime */
  secs: (datetime: unknown): number | null => {
    if (typeof datetime !== "string") return null;
    return new Date(datetime).getUTCSeconds();
  },
  /** Returns the number of seconds since the UNIX epoch */
  unix: (datetime: unknown): number | null => {
    if (typeof datetime !== "string") return null;
    return Math.round(new Date(datetime).getTime() / 1000);
  },
  /** Extracts the week day as a number from a datetime */
  wday: (datetime: unknown): number | null => {
    if (typeof datetime !== "string") return null;
    return new Date(datetime).getUTCDay();
  },
  /** Extracts the week as a number from a datetime */
  week: (datetime: unknown): number | null => {
    if (typeof datetime !== "string") return null;
    const currentDate = new Date(datetime);
    const startDate = new Date(currentDate.getFullYear(), 0, 1);
    
    const days = Math.floor(
      (currentDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000),
    );

    const weekNumber = Math.ceil(days / 7);
    return weekNumber;
  },
  /** Extracts the yday as a number from a datetime */
  yday: (datetime: unknown): number | null => {
    if (typeof datetime !== "string") return null;
    const currentDate = new Date(datetime);
    const startDate = new Date(currentDate.getFullYear(), 0, 1);
    
    const days = Math.floor(
      (currentDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000),
    ) + 1;

    return days;
  },
  /** Extracts the year as a number from a datetime */
  year: (datetime: unknown): number | null => {
    if (typeof datetime !== "string") return null;
    return new Date(datetime).getUTCFullYear();
  },
};

// TODO rounds to thursday??
function setToMonday(date: Date) {
  var day = date.getDay();
  if (day !== 4) {
    date.setHours(-24 * (day) - 48);
  }
  date.setMinutes(0);
  date.setSeconds(0);
  date.setMilliseconds(0);
  date.setUTCHours(0);
  return date;
}

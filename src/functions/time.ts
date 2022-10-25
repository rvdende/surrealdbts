export const time = {
    /** Extracts the day as a number from a datetime */
    day: () => { },
    /** Rounds a datetime down by a specific duration */
    floor: () => { },
    /** Groups a datetime by a particular time interval */
    group: () => { },
    /** Extracts the hour as a number from a datetime */
    hour: () => { },
    /** Extracts the minutes as a number from a datetime */
    mins: () => { },
    /** Extracts the month as a number from a datetime */
    month: () => { },
    /** Returns the number of nanoseconds since the UNIX epoch */
    nano: () => { },
    /** Returns the current datetime */
    now: () => { 
        return new Date().toISOString()
    },
    /** Rounds a datetime up by a specific duration */
    round: () => { },
    /** Extracts the secs as a number from a datetime */
    secs: () => { },
    /** Returns the number of seconds since the UNIX epoch */
    unix: () => { },
    /** Extracts the week day as a number from a datetime */
    wday: () => { },
    /** Extracts the week as a number from a datetime */
    week: () => { },
    /** Extracts the yday as a number from a datetime */
    yday: () => { },
    /** Extracts the year as a number from a datetime */
    year: () => { },
}
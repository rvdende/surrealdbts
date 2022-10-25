const time = {
    /** Extracts the day as a number from a datetime */
    day: function() {},
    /** Rounds a datetime down by a specific duration */
    floor: function() {},
    /** Groups a datetime by a particular time interval */
    group: function() {},
    /** Extracts the hour as a number from a datetime */
    hour: function() {},
    /** Extracts the minutes as a number from a datetime */
    mins: function() {},
    /** Extracts the month as a number from a datetime */
    month: function() {},
    /** Returns the number of nanoseconds since the UNIX epoch */
    nano: function() {},
    /** Returns the current datetime */
    now: function() {
        return new Date().toISOString();
    },
    /** Rounds a datetime up by a specific duration */
    round: function() {},
    /** Extracts the secs as a number from a datetime */
    secs: function() {},
    /** Returns the number of seconds since the UNIX epoch */
    unix: function() {},
    /** Extracts the week day as a number from a datetime */
    wday: function() {},
    /** Extracts the week as a number from a datetime */
    week: function() {},
    /** Extracts the yday as a number from a datetime */
    yday: function() {},
    /** Extracts the year as a number from a datetime */
    year: function() {}
};
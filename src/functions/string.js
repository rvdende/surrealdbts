const string = {
    /** Concatenates strings together */
    concat: function() {
        var data = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            data[_i] = arguments[_i];
        }
        return data.map(function(d) {
            if (typeof d !== "string") {
                return "".concat(d);
            } else {
                return d;
            }
        }).join("");
    },
    /** Checks whether a string ends with another string */
    endsWith: function(a, b) {
        return a.endsWith(b);
    },
    /** Joins strings together with a delimiter */
    join: function(seperator) {
        var data = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            data[_i - 1] = arguments[_i];
        }
        return data.join(seperator);
    },
    /** Returns the length of a string */
    length: function(a) {
        return ((typeof a !== "string") ? "".concat(a) : a).length;
    },
    /** Converts a string to lowercase */
    lowercase: function(a) {
        return ((typeof a !== "string") ? "".concat(a) : a).toLowerCase();
    },
    /** Repeats a string a number of times */
    repeat: function(a, times) {
        return ((typeof a !== "string") ? "".concat(a) : a).repeat(times);
    },
    /** Replaces an occurence of a string with another string */
    replace: function(a, b, c) {
        return a.replaceAll(b, c);
    },
    /** Reverses a string */
    reverse: function(a) {
        return ((typeof a !== "string") ? "".concat(a) : a).split("").reverse().join();
    },
    /** Extracts and returns a section of a string */
    slice: function(a, from, to) {
        return ((typeof a !== "string") ? "".concat(a) : a).slice(from, to);
    },
    /** Converts a string into human and URL-friendly string */
    slug: function(a) {
        return ((typeof a !== "string") ? "".concat(a) : a).toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
    },
    /** Divides a string into an ordered list of substrings */
    split: function(a, b) {
        return ((typeof a !== "string") ? "".concat(a) : a).split(b);
    },
    /** Checks whether a string starts with another string */
    startsWith: function(a, b) {
        return ((typeof a !== "string") ? "".concat(a) : a).startsWith(b);
    },
    /** Removes whitespace from the start and end of a string */
    trim: function(a) {
        return ((typeof a !== "string") ? "".concat(a) : a).trim();
    },
    /** Converts a string to uppercase */
    uppercase: function(a) {
        return ((typeof a !== "string") ? "".concat(a) : a).toUpperCase();
    },
    /** Splits a string into an array of separate words */
    words: function(a) {
        return ((typeof a !== "string") ? "".concat(a) : a).split(" ");
    }
};
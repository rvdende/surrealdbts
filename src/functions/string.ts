// https://surrealdb.com/docs/surrealql/functions/string

// npx tsc --lib "es2021" --target "es3" *.ts
// npx tsc --lib "es2021" --target "es3" string.ts

export const string = {
    /** Concatenates strings together */
    concat: (...data: any[]): string => {
        return data.map(d => { if (typeof d !== "string") { return `${d}` } else { return d } }).join("");
    },
    /** Checks whether a string ends with another string */
    endsWith: (a: unknown, b: string): boolean => {
        return ((typeof a !== "string") ? `${a}` : a).endsWith(b);
    },
    /** Joins strings together with a delimiter */
    join: (seperator: string, ...data: unknown[]): string => {
        return data.join(seperator);
    },
    /** Returns the length of a string */
    length: (a: unknown): number => {
        return ((typeof a !== "string") ? `${a}` : a).length;
    },
    /** Converts a string to lowercase */
    lowercase: (a: unknown): string => {
        return ((typeof a !== "string") ? `${a}` : a).toLowerCase();
    },
    /** Repeats a string a number of times */
    repeat: (a: unknown, times: number): string => {
        return ((typeof a !== "string") ? `${a}` : a).repeat(times);
    },
    /** Replaces an occurence of a string with another string */
    replace: (a: unknown, b: string, c: string): string => {
        return ((typeof a !== "string") ? `${a}` : a).replaceAll(b, c);
    },
    /** Reverses a string */
    reverse: (a: unknown): string => {
        if (typeof a !== "string") return `${a}`.split("").reverse().join("");
        return a.split(" ").reverse().join(" ");
    },
    /** Extracts and returns a section of a string */
    slice: (a: unknown, from: number, to: number): string => {
        return ((typeof a !== "string") ? `${a}` : a).slice(from, from+to);
    },
    /** Converts a string into human and URL-friendly string */
    slug: (a: unknown): string => {

        

        return ((typeof a !== "string") ? `${a}` : a).toLowerCase().replaceAll(".","-").replace(/ /g, '-').replace(/[^\w-]+/g, '');
    },
    /** Divides a string into an ordered list of substrings */
    split: (a: unknown, b: string): string[] => {
        return ((typeof a !== "string") ? `${a}` : a).split(b);
    },
    /** Checks whether a string starts with another string */
    startsWith: (a: unknown, b: string): boolean => {
        return ((typeof a !== "string") ? `${a}` : a).startsWith(b);
    },
    /** Removes whitespace from the start and end of a string */
    trim: (a: unknown): string => {
        return ((typeof a !== "string") ? `${a}` : a).trim();
    },
    /** Converts a string to uppercase */
    uppercase: (a: unknown): string => {
        return ((typeof a !== "string") ? `${a}` : a).toUpperCase();
    },
    /** Splits a string into an array of separate words */
    words: (a: unknown): string[] => {
        return ((typeof a !== "string") ? `${a}` : a).split(" ");
    },
}

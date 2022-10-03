import { DBLink } from "../bsontest.ts";
import { error2object, walkToJSON } from "./utils.ts";

/**
 * @param {(type: string, value: any) => any} make 
 */
export function createComposer(make) {
    return function compose(data, forHTML = false, parents = []) {
        let type = typeof data;

        if (type === "function" && !forHTML) {
            data = walkToJSON(data);
            type = typeof data;
        }

        if (data === null || data === undefined ||
            type === "function" || type === "symbol") {
            return data === null ? null : void 0;
        }

        if (type === "bigint") {
            return forHTML ? data : make("BigInt", String(data));
        } else if (type === "number") {
            if (isNaN(data) || !isFinite(data)) {
                return forHTML ? data : make("Number", String(data));
            } else {
                return data;
            }
        } else if (type === "object") {
            if (parents.includes(data)) {
                return void 0; // skip circular reference
            }

            if (data instanceof Boolean) {
                return forHTML ? data : make("Boolean", data.valueOf());
            } else if (data instanceof Number) {
                return forHTML ? data : make("Number", data.valueOf());
            } else if (data instanceof DBLink) {
                return forHTML ? data : make("DBLink", data.valueOf());
            } else if (data instanceof String) {
                return forHTML ? data : make("String", data.valueOf());
            } else if (data instanceof Date) {
                return forHTML ? data : make("Date", data.toISOString());
            } else if (data instanceof RegExp) {
                return forHTML ? data : make("RegExp", String(data));
            } else if (data instanceof ArrayBuffer) {
                return forHTML ? data : make("ArrayBuffer", [...new Uint8Array(data)]);
            } else if (data instanceof DataView) {
                return forHTML ? data : make("DataView", [...new Uint8Array(data.buffer)]);
            } else if (ArrayBuffer.isView(data)) {
                return forHTML ? data : make(data.constructor.name, [...data]);
            } else if (data instanceof Map) {
                let map = forHTML ? new Map() : [];

                data.forEach((value, key) => {
                    key = compose(key, forHTML, [...parents, data]);

                    if (key !== undefined) {
                        value = compose(value, forHTML, [...parents, data]);
                        forHTML ? map.set(key, value) : map.push([key, value]);
                    }
                });

                return forHTML ? map : make("Map", map);
            } else if (data instanceof Set) {
                let set = forHTML ? new Set() : [];

                data.forEach((value) => {
                    value = compose(value, forHTML, [...parents, data]);

                    if (value !== undefined) {
                        forHTML ? set.add(value) : set.push(value);
                    }
                });

                return forHTML ? set : make("Set", set);
            } else if (data instanceof Error) {
                // The native HTML Structured Clone Algorithm doesn't have the
                // full support for Error types (that it omit all accompanying
                // data), so we compose the error no matter what and decompose
                // the data on the received end instead.
                return make("Error", compose(
                    error2object(data),
                    forHTML,
                    [...parents, data]
                ));
            } else if (!forHTML && typeof (data = walkToJSON(data)) !== "object") {
                return compose(data, forHTML, [...parents, data]);
            } else if (Array.isArray(data)) {
                return data.map(item => compose(item, forHTML, [...parents, data]));
            } else {
                let proto = Object.getPrototypeOf(data);

                if (!forHTML || proto === null || proto === Object.prototype) {
                    return Object.keys(data).reduce((obj, key) => {
                        let value = compose(data[key], forHTML, [...parents, data]);
                        value !== undefined && (obj[key] = value);
                        return obj;
                    }, {});
                } else {
                    return data;
                }
            }
        }

        return data;
    };
}

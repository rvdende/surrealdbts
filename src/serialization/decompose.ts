import { object2error, getGlobal } from "./utils.ts";
import { DBLink } from '../bsontest.ts'
const NumberKeywords = ["NaN", "Infinity", "-Infinity"];

/**
 * @param {(data: any) => { type: string, value: any }} parse 
 * @param {(data: any) => boolean} checkSignature
 */
export function createDecomposer(parse, checkSignature) {
    return function decompose(data) {
        if (typeof data !== "object" || data === null) {
            return data;
        } else if (checkSignature(data)) {
            let { type, value } = parse(data);

            try {
                switch (type) {
                    case "DBLink":
                        return new DBLink(value);
                    case "Boolean":
                        return new Boolean(value);

                    case "Number":
                        return NumberKeywords.includes(value)
                            ? Number(value)
                            : new Number(value);

                    case "BigInt":
                        return BigInt(value);

                    case "String":
                        return new String(value);

                    case "Date":
                        return new Date(value);

                    case "RegExp": {
                        let index = value.lastIndexOf("/");
                        let pattern = value.slice(1, index);
                        let flags = value.slice(index + 1);
                        return new RegExp(pattern, flags);
                    }

                    case "Map":
                        return new Map(decompose(value));

                    case "Set":
                        return new Set(decompose(value));

                    case "Error":
                        return object2error(value);

                    case "ArrayBuffer":
                        return Uint8Array.from(value).buffer;

                    case "DataView":
                        return new DataView(Uint8Array.from(value).buffer);

                    case "Buffer": {
                        if (typeof Buffer === "function") {
                            return Buffer.from(value);
                        } else {
                            // For browsers, transfer Node.js Buffer into
                            // Uint8Array.
                            return Uint8Array.from(value);
                        }
                    }

                    case "Int8Array":
                    case "Uint8Array":
                    case "Uint8ClampedArray":
                    case "Int16Array":
                    case "Uint16Array":
                    case "Int32Array":
                    case "Uint32Array":
                    case "BigInt64Array":
                    case "BigUint64Array":
                    case "Float32Array":
                    case "Float64Array":
                        return getGlobal(type).from(value);

                    default:
                        return data;
                }
            } catch (e) {
                // If failed to decompose, return the data as-is.
                return data;
            }
        } else if (Array.isArray(data)) {
            return data.map(decompose);
        } else if (Object(data).constructor === Object) {
            return Object.keys(data).reduce((obj, key) => {
                obj[key] = decompose(data[key]);
                return obj;
            }, {});
        } else {
            return data;
        }
    };
}

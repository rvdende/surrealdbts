import * as utils from "./utils.ts";
import { createComposer } from "./compose.ts";
import { createDecomposer } from "./decompose.ts";

const TypePattern = /^\[\[[A-Z][a-zA-Z0-9_]+\]\]$/;

export {
    createComposer,
    createDecomposer,
    utils
};

/**
 * Composes the data into a well-formatted object that can be serialized via
 * JSON or HTML Structured Clone Algorithm.
 * @param forHTML For HTML Structured Clone Algorithm, by default it's for JSON.
 */
export const compose = createComposer((type, value) => {
    return [`[[${type}]]`, value];
});

/**
 * Decomposes the formatted data back to its original form.
 */
export const decompose = createDecomposer((data) => {
    return {
        type: String(data[0]).slice(2, -2),
        value: data[1]
    };
}, (data) => {
    return Array.isArray(data)
        && data.length === 2
        && typeof data[0] === "string"
        && TypePattern.test(data[0]);
});

export function serialize(data) {
    return JSON.stringify(exports.compose(data));
}

/**
 * @param {string} json 
 */
export function deserialize(json) {
    return exports.decompose(JSON.parse(json));
}

/* global globalThis */
/** @typedef {Error & { [x: string]: any }} ErrorObject */

/** @type {ErrorObject} */
var AssertionError;

// For Node.js-like environment.
if (typeof require === "function" && typeof module === "object") {
    try {
        AssertionError = require("assert").AssertionError;
    } catch (e) { }
}

/**
 * @param {ErrorObject} err
 * @returns {ErrorObject}
 */
export function error2object(err) {
    return Object.assign(["name", "message", "stack"].reduce((result, prop) => {
        prop in err && (result[prop] = err[prop]);
        return result;
    }, {}), err);
}

/**
 * @param {ErrorObject} obj
 * @returns {ErrorObject}
 */
export function object2error(obj) {
    let reservedKeys = ["name", "message", "stack"];
    let err;

    if (obj.name === "AssertionError" && AssertionError) {
        err = Object.create(AssertionError.prototype);
    } else {
        err = Object.create((getGlobal(obj.name) || Error).prototype);
    }

    Object.defineProperties(err, {
        message: {
            value: obj.message,
            configurable: true,
            writable: true
        },
        stack: {
            value: obj.stack,
            configurable: true,
            writable: true
        }
    });

    for (let x in obj) {
        if (!reservedKeys.includes(x)) {
            err[x] = obj[x];
        }
    }

    return err;
}

export function walkToJSON(data) {
    // Recursively calls `toJSON()` method(s) until drain.
    while (!isVoid(data) && typeof data["toJSON"] === "function") {
        data = data.toJSON();
    }

    return data;
}

function isVoid(value) {
    return value === null || value === undefined || Object.is(value, NaN);
}

/**
 * @param {string | symbol} prop 
 */
export function getGlobal(prop = void 0) {
    let _global;

    if (typeof globalThis === "object") {
        _global = globalThis;
    } else if (typeof self === "object") {
        _global = self;
    } else if (typeof global === "object") {
        _global = global;
    } else if (typeof window === "object") {
        _global = window;
    }

    return _global && (prop ? _global[prop] : _global);
}

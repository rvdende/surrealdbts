import { compose, decompose } from "./serialization/index.ts";

export class DBLink {
    tb = "1234"
}

const testlink = new DBLink();

let data = {
    b: testlink,
    ok: true,
    greeting: "Hello, World!",
    times: 100,
    largeTimes: 1000000000n, // BigInt is supported if the runtime supports it.
    maxTimes: Infinity,
    guests: new Map([
        [
            10000,
            { name: "Mr. Wong", tel: NaN, roles: new Set([1, 2, 3]) }
        ],
        [
            10001,
            { name: "Mrs. Wong", tel: NaN, roles: new Set([2, 3]) }
        ]
    ]),
    date: new Date(),
    pattern: /H(ello|i), \w+/i,
    err: new Error("Excuse me"), // Other errors are as well supported.
    packet: new TextEncoder().encode("Hello, World!"), // TypedArray
    // Other Types like ArrayBuffer and ArrayBufferView are also supported,
    // however, Buffer are only supported by Node.js with JSON serialization,
    // setting `forHTML` will transfer Buffer into Uint8Array automatically.
};

console.log(data);

// Create copy and serialize
let copy = compose(data);
let json = JSON.stringify(copy);

// Parse serialized data and decompose to the original form. 
let _copy = JSON.parse(json);
let _data = decompose(_copy);


console.log(JSON.stringify(_copy, null, 2));

console.log(_data);
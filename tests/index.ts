// To run:
// deno run --allow-net --watch index.ts 0


import { parse } from "https://deno.land/std@0.157.0/flags/mod.ts";

import { logEvent } from "../src/log.ts";

import { delay } from "./delay.ts";
import { configs } from "./test_config.ts";
import { httptest } from "./test_http.ts";
import { unittests } from "./test_unittests.ts";
import { websockettest } from "./test_websocket.ts";

export const args = parse(Deno.args) as Args;


await delay(250); // wait a little before running the tests

let configid = parseInt(args._[0]) || 0;

logEvent("warn", "args", `${JSON.stringify(args)}`);

console.log("")

logEvent("log", "main::test", `${configs[configid].id} websockettest`);
await websockettest(configs[configid]);

console.log("")

logEvent("log", "main::test2", `${configs[configid].id} httptest`);
await httptest(configs[configid]);


/////// TESTS

unittests();




interface Args {
    _: string[]
}
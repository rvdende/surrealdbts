// SurrealDB.ts
// Inspired by https://surrealdb.com/ this is a typescript (attempt to be compatible on day) clone.
// by Rouan van der Ende

// To run this clone:
// deno run --allow-all --watch --allow-hrtime --unstable index.ts start --user root --pass root --log debug --bind 0.0.0.0:8080 file://test

// Do run official surreal
// surreal start --user root --pass pass --log full --bind 0.0.0.0:8080 file://data.srdb.db



import { showLogo } from "./logo.ts";

import {
    logEvent,
} from "./log.ts";

import { web } from './web.ts'
import { KV } from "./kv.ts";
import { getArgs } from "./args.ts";
import { SurrealDBTS } from "./surrealdbts.ts";

/** release version */
export const version = "0.0.1";
export const versiondate = "2022-10-03T15:29:28.716Z"

export * from './interfaces/index.ts'
export * from './surrealdbts.ts'

// export let kv = new KV();

export function surrealdbts() {
    showLogo();
    const args = getArgs();

    if (args._[0] === 'start') {
        if (args.user) {
            logEvent("info", "index.ts", `Root authentication is enabled`);
            logEvent("info", "index.ts", `Root username is '${args.user}'`);
        }

        // TODO STRICT
        logEvent("info", "index.ts", `Database strict mode is disabled`);
        logEvent("info", "start.ts", `Starting webserver on ${args.bind}`);

        try {

            const instance = new SurrealDBTS({ kvOptions: { storageArgs: args.storageArgs }});

            web(instance);
            // serve(web, { port: args.bind ? parseInt(args.bind.split(':').at(-1) || "8000") : 8000 });
        } catch (err) {
            logEvent('error', 'index.ts', `${err.message}`);
            logEvent('trace', 'index.ts error', `${err.toString()}`);
        }
    }
}



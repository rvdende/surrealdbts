// by Rouan van der Ende
// Another implementation of https://surrealdb.com/docs/integration/libraries/javascript

// https://medium.com/deno-the-complete-reference/handling-base64-data-in-deno-af200e494265
import { encode, decode } from "https://deno.land/std/encoding/base64.ts"
import { LogSeverity } from "../src/log.ts";
import { logEvent } from "../src/log.ts";
import { TestConfig } from "./test_config.ts";

let singleton: Surreal;

export class Surreal {
    private ws!: WebSocket;
    private url = "";
    private id = 0;
    private queue: { packet: IPacketSend, resolve: (result: any) => void }[] = [];
    private pingtimer?: ReturnType<typeof setInterval>;

    loglevel: LogSeverity = "info";

    static get Instance(): Surreal {
        return singleton ? singleton : singleton = new Surreal();
    }

    constructor(url?: string) {
        if (url) {
            this.connect(this.url);
        }
    }

    private setUrl = (url: string) => {
        this.url = url.replace('http://', 'ws://');
    }

    private sendPacket(method: string, params: unknown[] = []) {
        return new Promise<unknown>(resolve => {
            while (!this.ws) { return; }
            while (this.ws.readyState !== WebSocket.OPEN) { return; }
            const packet: IPacketSend = {
                id: this.guid(),
                method,
                params
            }
            this.queue.push({ packet, resolve })
            this.ws.send(JSON.stringify(packet))
        })
    }

    private receivePacket = (ev: MessageEvent) => {

        const incomingPacket: IPacketRecieve<unknown> = JSON.parse(ev.data);
        logEvent("debug", "surrealclient::receivePacket", `${JSON.stringify([incomingPacket])}`);
        const index = this.queue.findIndex((i) => i.packet.id === incomingPacket.id);
        const queueObject = this.queue[index];
        queueObject.resolve(incomingPacket.result);
    }

    /** Connects to a local or remote database endpoint */
    connect = (url: string) => {
        return new Promise(resolve => {
            logEvent("info", "surrealclient::connect", `connect to ${url}`);
            this.setUrl(url);
            this.ws = new WebSocket(this.url);

            this.ws.onopen = (ev) => {

                if (this.pingtimer) clearInterval(this.pingtimer);

                this.pingtimer = setInterval(() => {
                    this.ping();
                }, 30000);

                resolve("");
            }
            this.ws.onmessage = this.receivePacket;
        })
    }

    /** Waits for the connection to the database to succeed */
    private wait() {
        console.log('wait not implemented.')
    }

    /** Switch to a specific namespace and database */
    async use(ns: string, db: string) {
        logEvent(this.loglevel, `surrealclient.use(ns: ${JSON.stringify(ns)}, db: ${JSON.stringify(db)})`);
        return await this.sendPacket("use", [ns, db]) as SR<null>;
    }

    /** Signs this connection up to a specific authentication scope */
    async signup(vars: { user: string, pass: string, SC: string }) {
        logEvent(this.loglevel, `surrealclient.signup(vars: ${JSON.stringify(vars)})`);
        const result = await this.sendPacket("signup", [vars]);
        return result as SR<null>;
    }

    /** Signs this connection in to a specific authentication scope */
    async signin(vars: { user: string, pass: string }) {
        logEvent(this.loglevel, `surrealclient.signup(vars: ${JSON.stringify(vars)})`);
        const result = await this.sendPacket("signin", [vars]);
        return result as SR<null>;
    }

    /** Invalidates the authentication for the current connection. TODO TEST */
    async invalidate<T>() {
        logEvent(this.loglevel, `surrealclient.invalidate()`);
        const result = await this.sendPacket("invalidate") as T;
        return result;
    }

    /** Authenticates the current connection with a JWT token */
    async authenticate<T>(token: string) {
        logEvent(this.loglevel, `surrealclient.authenticate(token: ${JSON.stringify(token)})`);
        const result = await this.sendPacket("authenticate", [token]) as T;
        return result;
    }

    /** Assigns a value as a parameter for this connection */
    async let<T>(key: string, val?: unknown) {
        logEvent(this.loglevel, 'let', `surrealclient.let(key: ${JSON.stringify(key)}, val?: ${JSON.stringify(val)} )`);
        const result = await this.sendPacket("let", [key, val]) as T;
        return result;
    }

    /** Runs a set of SurrealQL statements against the database */
    async query<T>(query: string, vars?: Record<string, unknown>) {
        logEvent(this.loglevel, 'query', `surrealclient.query(query: ${JSON.stringify(query)}, vars?: ${JSON.stringify(vars)} )`);
        const result = await this.sendPacket("query", [query, vars]) as T;
        return result;
    }

    /** Selects all records in a table, or a specific record */
    async select<T = unknown>(thing: string) {
        logEvent(this.loglevel, 'select', `surrealclient.select(thing: ${JSON.stringify(thing)})`);
        return await this.sendPacket("select", [thing]) as WithId<T>[];
    }

    /** Creates a record in the database */
    async create<T = unknown>(thing: string, data?: T) {
        logEvent(this.loglevel, 'create', `surrealclient.live(thing: ${JSON.stringify(thing)}, data?: ${JSON.stringify(data)})`);
        return await this.sendPacket("create", [thing, data]) as [WithId<T>];
    }

    /** Updates all records in a table, or a specific record */
    async update<T = unknown>(thing: string, data?: T) {
        logEvent(this.loglevel, 'update', `surrealclient.live(thing: ${JSON.stringify(thing)}, data?: ${JSON.stringify(data)})`);
        return await this.sendPacket("update", [thing, data]) as [WithId<T>];
    }

    /** Modifies all records in a table, or a specific record */
    async change<T = unknown>(thing: string, data?: T) {
        logEvent(this.loglevel, 'change', `surrealclient.live(thing: ${JSON.stringify(thing)}, data?: ${JSON.stringify(data)})`);
        return await this.sendPacket("change", [thing, data]) as [WithId<T>];
    }

    /** Applies JSON Patch changes to all records in a table, or a specific record */
    async modify<T = unknown>(thing: string, data?: T) {
        logEvent(this.loglevel, 'modify', `surrealclient.live(thing: ${JSON.stringify(thing)}, data?: ${JSON.stringify(data)})`);
        return await this.sendPacket("modify", [thing, data]) as [WithId<T>];
    }

    /** Deletes all records, or a specific record */
    async delete<T = unknown>(thing: string) {
        logEvent(this.loglevel, 'delete', `surrealclient.live(thing: ${JSON.stringify(thing)})`);
        return await this.sendPacket("delete", [thing]) as WithId<T>[];
    }

    /** EXPERIMENTAL: Subscribe to realtime */
    async live(thing: string, query: string) {
        logEvent(this.loglevel, 'live', `surrealclient.live(thing: ${JSON.stringify(query)}, query?: ${JSON.stringify(query)} )`);
        return await this.sendPacket("live", [thing, query]) as string;
    }

    /** EXPERIMENTAL: End/Close a realtime subscription. */
    async kill<T = unknown>(guid: string) {
        logEvent(this.loglevel, "kill", `surrealclient.kill(guid: ${JSON.stringify(guid)})`);
        return await this.sendPacket("kill", [guid]) as unknown;
    }

    /** Ping the server */
    async ping() {
        // logEvent(this.loglevel, "ping", "surrealclient.ping()");
        return await this.sendPacket("ping")
    }

    /** Closes the persistent connection to the database */
    close() {
        this.ws.close();
    }

    private guid() {
        this.id = (this.id + 1) % Number.MAX_SAFE_INTEGER;
        return this.id.toString();
    }
}


interface IPacketSend { id: string, method: string, params?: unknown[] }
interface IPacketRecieve<T> { id: string, result: T }

type WithId<T> = EnhancedOmit<T, "id"> & {
    id: string;
}

export declare type EnhancedOmit<TRecordOrUnion, KeyUnion> = string extends keyof TRecordOrUnion ? TRecordOrUnion : TRecordOrUnion extends any ? Pick<TRecordOrUnion, Exclude<keyof TRecordOrUnion, KeyUnion>> : never;

/** Surreal Result */
export interface SR<T = null> {
    result: T
    status: "OK" | string
    time: string
    detail?: string
}

/** Surreal KV info */
export interface KV {
    ns: {
        /** "DEFINE NAMESPACE namespace" */
        [index: string]: string
    }
}

export const generateAuthorizationHeader = (user: string, pass: string) => {
    const b64encoded = encode(`${user}:${pass}`);
    return `Basic ${b64encoded}`;
}

export const rest = {
    query: async function query<T>(config: TestConfig, query: string) {
        const { user, NS, DB } = config;

        const authorization = generateAuthorizationHeader(config.user, config.pass);

        const headers: any = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            authorization,
        };

        headers.NS = config.NS
        if (config.NS) headers.NS = config.NS;
        if (config.DB) headers.DB = config.DB;

        const url = `${config.url}/sql`;
        logEvent("debug", "surrealclient.rest.query", `user:"${user}" query: "${query}"`);

        return await fetch(`${config.url}/sql`, {
            method: 'post',
            headers,
            body: query
        }).then(async r => {
            const response = await r.text();
            logEvent("trace", "surrealclient.rest.queryresponse", response);
            return response;
        }).then(text => {

            try {
                const result = JSON.parse(text)
                return result;
            } catch (err: any) {
                logEvent("warn", "surrealclient.rest.queryresponse", `ERROR: ${err.message}`);
                console.log(err);
                return text;
            }
        }) as T;
    }
}


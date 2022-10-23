import { Session } from "./iam.ts";

import { KVStorageEngine, initializeStorage } from "./kv_storage.ts";
import { KVTable } from "./tb.ts";
import { logEvent } from "./log.ts";
import { NS } from './ns.ts';
import { processTable } from "./process_table.ts";
import { DB } from "./db.ts";
import { KVStorageMemory } from "./kv_storage_memory.ts";
import { SurrealDBTS } from "./surrealdbts.ts";

export interface KVConstructorOptions {
    storageArgs: string
}

export class KV {
    instance: SurrealDBTS
    storage: KVStorageEngine;

    constructor(instance: SurrealDBTS, options?: KVConstructorOptions) {
        this.instance = instance;

        if (options) {
            this.storage = initializeStorage(options);
        } else {
            this.storage = new KVStorageMemory();
        }
    }

    async infoForKV() {
        let kv: any = await this.storage.get('_kv');
        // console.log({ kv })
        if (!kv) kv = { ns: {} };
        // if (!kv.ns) kv.ns = {}
        // return this.storage.get('kv');
        return kv as { ns: { [index: string]: string } };
    }

    async defineNS({ ns, definition }: { ns: string, definition: string }) {
        let kv: { ns: { [index: string]: string } } = await this.storage.get('_kv');
        if (!kv) kv = { ns: {} };
        // if (!kv.ns) kv.ns = {}
        kv.ns[ns] = definition;
        await this.storage.set('_kv', kv);

        const existing = await this.storage.get(`_ns:${ns}`);
        if (existing) {
            logEvent('warn', 'kv.ts::defineNS', 'Namespace already exists.')
            return null;
        }

        const nsInfo: iNSinfo = {
            db: {},
            nl: {},
            nt: {}
        }

        await this.storage.set(`_ns:${ns}`, nsInfo)
        return null;
    }

    async infoForNS({ ns }: { ns: string }) {
        const info = await this.storage.get<iNSinfo>(`_ns:${ns}`)
        logEvent('trace', 'kv.ts::infoForNS', `${JSON.stringify(info)}`)
        return info;
    }

    async defineDB({ db, ns, definition }: { db: string, ns: string, definition: string, }) {

        // parent of db is a ns.
        const nsInfo = await this.storage.get<iNSinfo>(`_ns:${ns}`)

        if (!nsInfo) { throw Error('Can not define DB with no Namespace.') }

        nsInfo.db[db] = definition
        await this.storage.set(`_ns:${ns}`, nsInfo)

        const existing = await this.storage.get<iDBinfo>(`_db:${ns}:${db}`);
        if (existing) {
            logEvent('warn', 'kv.ts::defineDB', 'Database already exists.')
            return null;
        }

        // create db info entry.
        const dbInfo: iDBinfo = {
            dl: {},
            dt: {},
            sc: {},
            tb: {}
        }

        await this.storage.set(`_db:${ns}:${db}`, dbInfo);
        return null;
    }



    async infoForDB({ ns, db }: { ns: string, db: string }) {
        const dbInfo = await this.storage.get<iDBinfo>(`_db:${ns}:${db}`)
        return dbInfo;

        // return {
        //     "dl": {},
        //     "dt": {},
        //     "sc": {
        //         "account": "DEFINE SCOPE account SESSION 1d SIGNUP (CREATE user SET email = $email, pass = crypto::argon2::generate($pass)) SIGNIN (SELECT * FROM user WHERE email = $email AND crypto::argon2::compare(pass, $pass))"
        //     },
        //     "tb": {
        //         "post": "DEFINE TABLE post SCHEMALESS PERMISSIONS FOR select WHERE published = true OR user = $auth.id, FOR create WHERE user = $auth.id, FOR update WHERE user = $auth.id, FOR delete WHERE user = $auth.id OR $auth.admin = true",
        //         "user": "DEFINE TABLE user SCHEMALESS"
        //     }
        // }
    }

    /** gets a db, if it does not exist yet it will be created. */
    async getDB(ns: string, db: string): Promise<iDBinfo> {
        // check if db exists. create if needed.
        let dbInfo = await this.storage.get<iDBinfo>(`_db:${ns}:${db}`);
        if (!dbInfo) {
            logEvent('warn', 'kv::defineTB', 'db not defined, auto defining db.');
            await this.defineDB({ db, ns, definition: `DEFINE DATABASE ${db}` })
            dbInfo = await this.storage.get<iDBinfo>(`_db:${ns}:${db}`);
        }

        return dbInfo;
    }

    async getDBSession(session: Session) {
        let dbInfo = await this.getDB(session.ns, session.db);

        return new DB(this.instance, {
            dbInfo,
            ns: session.ns,
            dbName: session.db
        });
    }

    async defineTB({ tb, definition, ns, db }: {
        /** table name */
        tb: string,
        definition: string,
        ns: string,
        db: string
    }) {
        // error handling..
        const dbInfo = await this.getDB(ns, db);

        // create the table
        const tbInfo: iTBinfo = {
            ev: {},
            /** field definition */
            fd: {},
            ft: {},
            ix: {},
            _rowids: {}
        };

        await this.setTB({ ns, db, tb, tbInfo });

        // add table to the db.
        dbInfo.tb[tb] = definition;
        await this.storage.set(`_db:${ns}:${db}`, dbInfo);


        return tbInfo;
    }

    async getTable(session: Session, tableName: string) {
        const tbInfo = await this.infoForTable({ tb: tableName, ns: session.ns, db: session.db });
        
        const tbobj = new KVTable(this.instance,{
            tbInfo,
            tableName,
            nsName: session.ns,
            dbName: session.db
        });

        return tbobj;
    }

    async setTB({ ns, db, tb, tbInfo }: { ns: string, db: string, tb: string, tbInfo: iTBinfo }) {
        await this.storage.set(`_tb:${ns}:${db}:${tb}`, tbInfo);
        return null;
    }

    async infoForTable({ tb, ns, db }: { tb: string, ns: string, db: string }) {
        let tbInfo = await this.storage.get<iTBinfo>(`_tb:${ns}:${db}:${tb}`);

        // create tb if does not exist.
        if (!tbInfo) {
            await this.defineTB({ tb, db, ns, definition: `DEFINE DATABASE ${db}` });
            tbInfo = await this.storage.get<iTBinfo>(`_tb:${ns}:${db}:${tb}`);
        }

        return tbInfo;

        // return {
        //     "ev": {},
        //     "fd": {
        //         "counter": "DEFINE FIELD counter ON states TYPE number VALUE $before + 1",
        //         "created": "DEFINE FIELD created ON states TYPE datetime VALUE $before OR time::now()",
        //         "timestamp": "DEFINE FIELD timestamp ON states TYPE datetime VALUE time::now()"
        //     },
        //     "ft": {},
        //     "ix": {}
        // }
    }

    async removeNS({ ns }: { ns: string }) {
        logEvent('warn', 'kv.ts', `REMOVE NAMESPACE ${ns}`)

        const kv = await this.infoForKV();
        if (!kv) return null;

        const nsInfo = await this.storage.get<iNSinfo>(`_ns:${ns}`)
        if (!nsInfo) return null;

        Object.keys(nsInfo.db).forEach(async db => {
            const dbInfo = await this.storage.get<iDBinfo>(`_db:${ns}:${db}`);

            Object.keys(dbInfo.tb).forEach(async tb => {
                const tbInfo = await this.storage.get<iTBinfo>(`_tb:${ns}:${db}:${tb}`);
                await this.storage.delete(Object.keys(tbInfo._rowids).map(id => `_row:${ns}:${db}:${tb}:${id}`))
                await this.storage.delete(`_tb:${ns}:${db}:${tb}`);
            })

            await this.storage.delete(`_db:${ns}:${db}`)
        })

        await this.storage.delete(`_ns:${ns}`)

        delete kv.ns[ns];
        await this.storage.set('_kv', kv);
    }

    async createContent({ targets, data, ns, db, session }: {
        targets: string,
        data: any,
        ns: string,
        db: string,
        session: Session
    }) {
        const { id, tb } = parseIdFromThing(targets);

        // CREATE TABLE AND ADD ROW ID START
        let tbInfo = await this.infoForTable({ tb, ns, db });
        if (!tbInfo) {
            await this.defineTB({
                definition: `DEFINE TABLE ${tb} SCHEMALESS`,
                tb, ns, db
            });
            tbInfo = await this.infoForTable({ tb, ns, db });
        }
        tbInfo._rowids[id] = id;
        await this.setTB({ ns, db, tb, tbInfo });
        // CREATE TABLE AND ADD ROW ID END

        // PROCESS FIELDS, INDEXES AND EVENTS...

        const kvtable = await this.getTable(session, tb);

        const processedFieldsData = await processTable({
            session,
            dataIn: data,
            kvtable,
            kv: this
        })


        const output = { ...{ id: `${tb}:${id}` }, ...processedFieldsData }
        await this.storage.set(`_row:${ns}:${db}:${tb}:${id}`, output);
        return output;
    }

    async updateContent({ targets, data, ns, db }: { targets: string, data: any, ns: string, db: string }) {
        const { id, tb } = parseIdFromThing(targets);

        let tbInfo = await this.infoForTable({ tb, ns, db });
        if (!tbInfo) {
            await this.defineTB({
                definition: `DEFINE TABLE ${tb} SCHEMALESS`,
                tb, ns, db
            });
            tbInfo = await this.infoForTable({ tb, ns, db });
        }
        // remember row ids.
        if (!Object.keys(tbInfo._rowids).includes(id)) {
            tbInfo._rowids[id] = id;
            await this.setTB({ ns, db, tb, tbInfo });
        }

        const before = await this.storage.get(`${ns}/${db}/${tb}:${id}`);
        const output = { ...{ id: `${tb}:${id}` }, ...data }
        await this.storage.set(`_row:${ns}:${db}:${tb}:${id}`, output);
    }

    async select<T>({ projections, targets, ns, db }: {

        projections: string,
        /** table? */
        targets: string,
        ns: string,
        db: string
    }) {
        const tb = targets; // TODO ?
        let tbInfo = await this.infoForTable({ tb, ns, db });

        // console.log({ tb, ns, db })

        if (!tbInfo) throw new Error('Table does not exist.');

        const rows = await (await Promise.all(Object.keys(tbInfo._rowids).map(id => this.storage.get(`_row:${ns}:${db}:${tb}:${id}`))))
            .filter(r => r !== undefined)


        return rows as T[];
    }

}

export const parseIdFromThing = (thing: string) => {
    const id = (thing.indexOf(':') > 0) ? thing.split(':')[1] : crypto.randomUUID().split('-').join('');
    const tb = (thing.indexOf(':') > 0) ? thing.split(':')[0] : thing;
    return { tb, id }
}

export interface iNSinfo {
    db: tDefinitions,
    nl: tDefinitions,
    nt: tDefinitions,
}

export type tDefinitions = { [index: string]: string }

export interface iDBinfo {
    dl: tDefinitions,
    dt: tDefinitions,
    sc: tDefinitions,
    tb: tDefinitions,
}

export interface iTBinfo {
    _rowids: tDefinitions,
    ev: tDefinitions,
    fd: tDefinitions,
    ft: tDefinitions,
    ix: tDefinitions
}

export interface Entry {
    id: string
    [index: string]: unknown
}
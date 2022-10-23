import { DB } from "./db.ts";
import { iNSinfo } from "./kv.ts";
import { SurrealDBTS } from "./surrealdbts.ts";

export class NS {
    instance: SurrealDBTS
    name: string;
    definition: string;

    // info = {
    //     "db": {
    //         "openboard": "DEFINE DATABASE openboard"
    //     },
    //     "nl": {},
    //     "nt": {}
    // }

    nsInfo: iNSinfo = {
        db: {},
        nl: {},
        nt: {}
    }

    // databases: { [index: string]: DB } = {};

    constructor(instance: SurrealDBTS, opt: { name: string, definition: string }) {
        this.instance = instance;

        this.name = opt.name;
        this.definition = opt.definition;
    }

    infoForNS(): iNSinfo {
        return this.nsInfo;
        // const dbarray = Object.values(this.databases).map(n => [n.dbName, n.definition])
        // const db = Object.fromEntries(dbarray);
        // return { db, nl: {}, nt: {} };
    }

    defineDB(opt: { name: string, definition: string }) {
        const name = opt.name;
        const definition = opt.definition;

        // const db = new DB({ dbName: name, definition });
        // this.databases[name] = db;

        this.nsInfo.db[name] = definition;

        const db = new DB(this.instance, { dbName: name, ns: this.name })

        return db;
    }
}

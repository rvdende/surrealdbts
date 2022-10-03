import { DB } from "./db.ts";

export class NS {
    name: string;
    definition: string;

    // info = {
    //     "db": {
    //         "openboard": "DEFINE DATABASE openboard"
    //     },
    //     "nl": {},
    //     "nt": {}
    // }

    databases: { [index: string]: DB } = {};

    constructor(opt: { name: string, definition: string }) {
        this.name = opt.name;
        this.definition = opt.definition;
    }

    infoForNS() {
        const dbarray = Object.values(this.databases).map(n => [n.name, n.definition])
        const db = Object.fromEntries(dbarray);
        return { db, nl: {}, nt: {} };
    }

    defineDB(opt: { name: string, definition: string }) {
        const name = opt.name;
        const definition = opt.definition;

        const db = new DB({ name, definition });
        this.databases[name] = db;

        return db;
    }
}

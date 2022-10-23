import { iDBinfo } from "./kv.ts";
import { SurrealDBTS } from "./surrealdbts.ts";
import { KVTable } from "./tb.ts";

export class DB {
    instance: SurrealDBTS
    dbName: string;
    // definition: string;

    dbInfo: iDBinfo = {
        dl: {},
        dt: {},
        sc: {},
        tb: {}
    }

    nsName: string;

    constructor(instance: SurrealDBTS, options: {
        dbInfo?: iDBinfo,
        ns: string,
        dbName: string,
        // definition: string
    }) {
        
        this.instance = instance;

        if (options.dbInfo) {
            this.dbInfo.dl = options.dbInfo.dl;
            this.dbInfo.dt = options.dbInfo.dt;
            this.dbInfo.sc = options.dbInfo.sc;
            this.dbInfo.tb = options.dbInfo.tb;
        }

        this.nsName = options.ns;

        this.dbName = options.dbName;
        // this.definition = options.definition;
    }

    removeTable = async (tableName: string) => {

        let tbInfo = await this.instance.kv.infoForTable({ tb: tableName, ns: this.nsName, db: this.dbName });
        const table = new KVTable(this.instance, {tbInfo, tableName, nsName: this.nsName, dbName: this.dbName });
        await table.clearRows();

        console.log(table)

        delete this.dbInfo.tb[tableName];
        await this.save();
        return null;
    }

    save = async () => {
        await this.instance.kv.storage.set(`_db:${this.nsName}:${this.dbName}`, this.dbInfo);
    }
}

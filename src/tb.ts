import { Session } from "./iam.ts";

import { IndexData, parseIndex } from "./ix.ts";
import { Entry, iTBinfo, KV } from "./kv.ts";
import { logEvent } from "./log.ts";
import { SurrealDBTS } from "./surrealdbts.ts";


export class KVTable {

    // session: Session;
    instance: SurrealDBTS
    tableName: string;
    // as saved in the kv store.
    tbInfo: iTBinfo = {
        ev: {},
        fd: {},
        ft: {},
        ix: {},
        _rowids: {},
    }

    nsName: string
    dbName: string


    constructor(instance: SurrealDBTS, options: {
        tbInfo: iTBinfo,
        // session: Session,
        nsName: string,
        dbName: string,
        tableName: string
    }) {
        this.instance = instance;

        this.tbInfo.ev = options.tbInfo.ev;
        this.tbInfo.fd = options.tbInfo.fd;
        this.tbInfo.ft = options.tbInfo.ft;
        this.tbInfo.ix = options.tbInfo.ix;
        this.tbInfo._rowids = options.tbInfo._rowids;

        // this.session = options.session;
        this.dbName = options.dbName;
        this.nsName = options.nsName;
        this.tableName = options.tableName;

    }

    /** define data on a table description */
    async define(options: {
        /** ev = event   
         * fd = field    
         * ft = unknown   
         * ix = index    
         */
        type: "ev" | "fd" | "ft" | "ix",
        fieldName: string,
        definition: string
    }) {
        const { type, fieldName, definition } = options;
        // @ts-ignore
        this.tbInfo[type][fieldName] = definition;

        await this.save();

        return null;
    }

    defineIndex = async (query: string) => {
        // removes the "TABLE keyword from the definition same as surrealdb.
        const definition = (query[4] === "TABLE") ? query.replace(" TABLE ", " ") : query;
        const fieldName = definition.split(" ")[2];

        // todo: trigger operations to create the index and check for errors before creating it.
        const index = parseIndex(definition);
        // console.log(index);

        if (index.unique) {
            // create unique index or error.

            const rows: Entry[] = await this.instance.processQuery({ query: `SELECT * FROM ${this.tableName};` }).then(r => r.result);



            // console.log("vvvvvvvvvvvvvvvvvvvv")
            // console.log(rows);
            // console.log("^^^^^^^^^^^^^^^^^^^^")

            index.fields.forEach(f => {
                logEvent('info', 'kv_table.ts', `attempting to create new index on ${f}: ${index.definitionRaw}`);

                const uniqueIndex: IndexData[] = [];

                rows.forEach(r => {
                    uniqueIndex.forEach((e) => {
                        if (e.value === r[f]) throw Error(`Database index \`${index.indexName}\` already contains "${e.value}", with record \`${e.id}\``);
                    });

                    uniqueIndex.push({ id: r.id, value: r[f] })
                });
                console.log(uniqueIndex)

                // TODO SAVE THE INDEX 

                // get database rows and construct index.
            })
        }

        // "Database index `email` already contains \"first@example.com\", with record `user:vxjzehj1etj3uph9kpdn`"

        this.tbInfo.ix[fieldName] = definition;



        await this.save();
    }

    save = async () => {
        await this.instance.kv.setTB({
            ns: this.nsName,
            db: this.dbName,
            tb: this.tableName,
            tbInfo: this.tbInfo
        })
    }

    /** remove this table. */
    remove = async () => {
        await this.clearRows();
        return null;
    }

    /** removes rows but keeps the table definitions indexes fields etc.. */
    clearRows = async () => {
        // first remove all rows etc..
        await this.instance.kv.storage.delete(Object.keys(this.tbInfo._rowids).map(id => `_row:${this.nsName}:${this.dbName}:${this.tableName}:${id}`))
        return null;
    }

    async select(id: string) {
        const rows = await (await Promise.all(Object.keys(this.tbInfo._rowids).map(id => this.instance.kv.storage.get(`_row:${this.nsName}:${this.dbName}:${this.tableName}:${id}`))))
            .filter(r => r !== undefined);
        return rows;
    }
}
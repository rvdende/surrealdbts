import { Session } from "./iam.ts";
import { kv } from "./index.ts";
import { parseIndex } from "./ix.ts";
import { iTBinfo, KV } from "./kv.ts";
import { logEvent } from "./log.ts";

export class KVTable {
    tableName: string;
    // as saved in the kv store.
    tbInfo: iTBinfo = {
        ev: {},
        fd: {},
        ft: {},
        ix: {},
        _rowids: {},
    }

    session: Session;


    constructor(options: { tbInfo: iTBinfo, session: Session, tableName: string }) {
        this.tbInfo.ev = options.tbInfo.ev;
        this.tbInfo.fd = options.tbInfo.fd;
        this.tbInfo.ft = options.tbInfo.ft;
        this.tbInfo.ix = options.tbInfo.ix;
        this.tbInfo._rowids = options.tbInfo._rowids;

        this.session = options.session;
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
        console.log(index);

        if (index.unique) {
            // create unique index or error.
            
            index.fields.forEach( f => {
                logEvent('info', 'kv_table.ts', `attempting to create new index on ${f}: ${index.definitionRaw}`);

                
            })
        }

        // "Database index `email` already contains \"first@example.com\", with record `user:vxjzehj1etj3uph9kpdn`"

        this.tbInfo.ix[fieldName] = definition;



        await this.save();
    }

    select = async () => {

    }

    save = async () => {
        await kv.setTB({
            ns: this.session.ns,
            db: this.session.db,
            tb: this.tableName,
            tbInfo: this.tbInfo
        })
    }
}
import { Session } from "./iam.ts";
import { kv } from "./index.ts";
import { iTBinfo, KV } from "./kv.ts";

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

        await kv.setTB({
            ns: this.session.ns,
            db: this.session.db,
            tb: this.tableName,
            tbInfo: this.tbInfo
        })

        return null;
    }
}
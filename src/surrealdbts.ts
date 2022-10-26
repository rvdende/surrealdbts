import { Session } from "./iam.ts";
import { SR } from "./index.ts";
import { KV, KVConstructorOptions, parseIdFromThing, parseIdFromThingNoGenerate } from "./kv.ts";
import { devLog, logEvent, LogSeverity, setLogLevel } from "./log.ts";
import { generateThingId } from "./process.ts";
import { extractJSON, extractSetData } from "./process_table.ts";
import { clone } from "./utils.ts";

import { merge } from 'https://raw.githubusercontent.com/lodash/lodash/4.17.21-es/lodash.js';
export class SurrealDBTS {
    kv: KV;
    session: Session;

    constructor(options?: {
        user?: string,
        pass?: string
        kvOptions?: KVConstructorOptions
        kv?: KV,
        session?: Session
        log?: LogSeverity
    }) {

        if (options?.log) setLogLevel(options.log);

        if (options?.user && options.pass) {
            this.session = new Session({}); // todo login..
        }

        this.kv = new KV(this);

        if (options?.kv) {
            this.kv = options.kv; // pass through KV.
        } else {
            // create KV ?

            if (options?.kvOptions) {
                this.kv = new KV(this, options.kvOptions);
            } else {
                this.kv = new KV(this);
            }

        }

        if (options?.session) {
            this.session = options.session
        } else {
            this.session = new Session();
        }

    }

    /** this returns a scoped db instance to run commands against securely. */
    getUserSession = (session: Session) => {
        let userdb = new SurrealDBTS({ session, kv: this.kv });
        return userdb;
    }

    async processQueries<T = SR[]>(options: { queries: string[] }): Promise<T> {
        const results = [];

        // const session = new Session(JSON.parse(JSON.stringify(options.session)));

        for (const query of options.queries) {
            let result: any = undefined;

            const starttime = performance.now();
            const proc = await this.processQuery({ query }).catch(err => {
                logEvent('trace', 'process.ts processQueries()', err.message);

                devLog("======================== ERROR ========================", "red")
                console.error(err);
                // console.log();

                results.push(clone({
                    status: "ERR",
                    detail: err.message,
                    time: `${((performance.now() - starttime) * 1000).toFixed(2)}µs`
                }));
            });

            if (proc) {
                result = proc.result;

                results.push(clone({
                    time: `${((performance.now() - starttime) * 1000).toFixed(2)}µs`,
                    status: "OK",
                    result,
                }));
            }
        }

        return results as T;
    }

    async processQuery(options: { query: string }) {

        let query = options.query;

        if (query.trim().endsWith(";")) query = query.slice(0, -1).trim();

        // devLog(query, "red");
        // devLog(JSON.stringify(query));
        query = query.split("\n").map(l => l.trim()).join(" ")
        // devLog(query, "green");

        const statement = query.split(' ');
        logEvent("debug", `surrealdbts.ts processQuery`, `Executing: ${query}`);
        if (statement[0] === 'USE') {
            // todo check if USE DB in the same line statement[3] ...

            if (statement.length === 5 && statement[1] === 'NS' && statement[3] == 'DB') {
                const ns = statement[2];
                const db = statement[4];
                const result = await this.session.use(ns, db)
                await this.kv.defineNS({ ns, definition: `DEFINE NAMESPACE ${ns}` });
                await this.kv.defineDB({ ns, definition: `DEFINE DATABASE ${db}`, db })
                // console.log('use ...', this.session)
                return { result }
            }

            if (statement.length === 3 && statement[1] === 'NS') {
                const ns = statement[2];
                const result = this.session.useNs(ns);
                await this.kv.defineNS({ ns, definition: `DEFINE NAMESPACE ${ns}` });
                return { result }
            }

            if (statement.length === 3 && statement[1] === 'DB') {
                if (!this.session.ns) throw Error('Select namespace first.');
                const db = statement[2];
                const result = this.session.useDb(db);
                await this.kv.defineDB({ ns: this.session.ns, definition: `DEFINE DATABASE ${db}`, db })
                return { result }
            }

        }

        if (statement[0] === 'LET') {
            throw Error('LET not implemented yet.');
        }

        if (statement[0] === 'BEGIN') {
            throw Error('BEGIN not implemented yet.');
        }

        if (statement[0] === 'CANCEL') {
            throw Error('CANCEL not implemented yet.');
        }

        if (statement[0] === 'COMMIT') {
            throw Error('COMMIT not implemented yet.');
        }

        if (statement[0] === 'IF') {
            throw Error('IF ELSE not implemented yet.');
        }

        if (statement[0] === 'SELECT') {
            const projections = statement[1];
            if (statement[2] !== "FROM") throw new Error('Expected keyword FROM');
            const targets = statement[3];

            const { id, tb } = parseIdFromThingNoGenerate(targets);

            const table = await this.kv.getTable(this.session, tb);

            if (projections === "*" && id !== undefined) {
                const rows: any[] = await table.select(id);
                return { result: rows}
            }
            

            // TODO https://surrealdb.com/docs/surrealql/statements/select
            // needs more keywords implemented.
            const result = await this.kv.select({
                projections,
                targets,
                ns: this.session.ns,
                db: this.session.db
            })

            logEvent("trace", `process::select`, `${JSON.stringify(result)}`);

            return { result: result }
        }

        if (statement[0] === 'INSERT') {
            throw Error('INSERT not implemented yet.');
        }

        // https://surrealdb.com/docs/surrealql/statements/create
        if (statement[0] === "CREATE") {
            const targets = statement[1];
            const { id, tb } = parseIdFromThing(targets)

            // devLog(id, "yellow");

            let data: any = {};



            // CREATE @targets CONTENT
            if (statement[2] === 'CONTENT') {
                data = extractJSON(query, "CONTENT", "RETURN");
            }

            // CREATE @targets SET
            if (statement[2] === 'SET') {
                data = await extractSetData(targets, query)
            }

            data.id = `${tb}:${id}`;

            // devLog(data, "yellow");

            // if (!data.id) data.id = generateThingId(targets);

            const result = await this.kv.createContent({
                targets: statement[1],
                data,
                ns: this.session.ns,
                db: this.session.db,
                session: this.session
            });

            logEvent("trace", `process::create content`, `${query} ${JSON.stringify(statement)}`);
            return { result: [result] };

        }

        // https://surrealdb.com/docs/surrealql/statements/update
        if (statement[0] === 'UPDATE') {

            if (statement[2] === 'CONTENT') {
                const data = extractJSON(query, "CONTENT", "RETURN");
                const result = await this.kv.createContent({
                    targets: statement[1],
                    data,
                    ns: this.session.ns,
                    db: this.session.db,
                    session: this.session
                });

                logEvent("trace", `process::update`, `${query} ${JSON.stringify(statement)}`);
                return { result: [result] };
            }



            if (statement[2] === 'MERGE') {
                throw new Error('UPDATE MERGE not implemented yet')
            }

            if (statement[2] === 'PATCH') {
                throw new Error('UPDATE PATCH not implemented yet')
            }

            if (statement[2] === 'SET') {

                const targets = statement[1];
                const { id, tb } = parseIdFromThing(targets)
                const newdata = await extractSetData(targets, query);

                // find existing row.
                const table = await this.kv.getTable(this.session, tb);

                const rows: any[] = await table.select(id);

                const updatedrows = rows.map(r => {
                    return merge(r, newdata)
                })



                return { result: updatedrows };

            }
        }

        if (statement[0] === 'RELATE') {
            throw Error('RELATE not implemented yet.');
        }


        if (statement[0] === 'DELETE') {

            const table = await this.kv.getTable(this.session, statement[1]);
            const result = await table.clearRows();
            return { result };
        }

        // https://surrealdb.com/docs/surrealql/statements/define
        if (statement[0] === 'DEFINE') {
            const name = statement[2];
            const definition = query;

            // DEFINE NAMESPACE
            if (statement[1] === 'NAMESPACE') {
                logEvent("trace", "process.ts::define::field", "handing DEFINE NAMESPACE")
                const result = await this.kv.defineNS({ ns: name, definition });
                this.session.ns = name;
                logEvent("trace", `process.define.namespace`, `${query} ${JSON.stringify(result)}`);
                return { result }
            }

            // DEFINE DATABASE
            if (['DATABASE', 'DB'].indexOf(statement[1]) >= 0) {
                logEvent("trace", "process.ts::define::field", "handing DEFINE DATABASE || DB")
                if (!this.session.ns) throw new Error('Namespace not specified.')
                const result = await this.kv.defineDB({ db: name, definition, ns: this.session.ns })
                logEvent("trace", `process.define.database`, `${query} ${JSON.stringify(result)}`);
                return { result }
            }

            // DEFINE LOGIN
            if (statement[1] === 'LOGIN') {
                throw Error('not implemented yet.');
            }

            // DEFINE TOKEN
            if (statement[1] === 'TOKEN') {
                throw Error('not implemented yet.');
            }

            // DEFINE SCOPE
            if (statement[1] === 'SCOPE') {
                throw Error('not implemented yet.');
            }

            // DEFINE TABLE
            if (statement[1] === 'TABLE') {
                logEvent("trace", "process.ts::define::field", "handing DEFINE TABLE")
                if (!this.session.ns) throw Error('Select namespace first.');
                if (!this.session.db) throw Error('Select db first.');
                const result = await this.kv.defineTB({ tb: name, definition, ns: this.session.ns, db: this.session.db });
                logEvent("trace", `process.define.tb`, `${query} ${JSON.stringify(result)}`);
                return { result }
            }

            // DEFINE EVENT
            if (statement[1] === 'EVENT') {
                throw Error('not implemented yet.');
            }

            // DEFINE FIELD
            if (statement[1] === 'FIELD') {
                logEvent("trace", "process.ts::define::field", "handing DEFINE FIELD")
                if (!this.session.ns) throw Error('Select namespace first.');
                if (!this.session.db) throw Error('Select db first.');
                const tableIndex = (statement[4] === "TABLE") ? 5 : 4;
                const tableName: string = statement[tableIndex];
                // removes the "TABLE keyword from the definition same as surrealdb.
                const definition = (statement[4] === "TABLE") ? query.replace(" TABLE ", " ") : query;
                const table = await this.kv.getTable(this.session, tableName)

                const result = await table.define({
                    type: 'fd',
                    fieldName: statement[2],
                    definition
                })

                logEvent("trace", `process.define.field`, `${query} ${JSON.stringify(result)}`);
                return { result }
            }

            // DEFINE INDEX
            if (statement[1] === 'INDEX') {
                logEvent("trace", "process.ts::define::index", "handing DEFINE INDEX");
                if (!this.session.ns) throw Error('Select namespace first.');
                if (!this.session.db) throw Error('Select db first.');
                const tableIndex = (statement[4] === "TABLE") ? 5 : 4;
                const tableName: string = statement[tableIndex];


                const table = await this.kv.getTable(this.session, tableName)

                const result = await table.defineIndex(query);

                // const result = await table.define({
                //     type: 'ix',
                //     fieldName: statement[2],
                //     definition
                // })

                // const index = parseIndex(definition);
                // console.log('create index', index)

                logEvent("trace", `process.define.index`, `${query} ${JSON.stringify(result)}`);
                return { result }
            }

            logEvent("error", "process.ts::define::field")
        }



        // https://surrealdb.com/docs/surrealql/statements/remove
        if (statement[0] === 'REMOVE') {
            // REMOVE NAMESPACE
            if (statement[1] === 'NAMESPACE') {
                const ns = statement[2];
                const result = await this.kv.removeNS({ ns });
                return { result }
            }

            // REMOVE DATABASE
            if (statement[1] === 'DATABASE') {
                throw Error('not implemented yet.');
            }

            // REMOVE LOGIN
            if (statement[1] === 'LOGIN') {
                throw Error('not implemented yet.');
            }

            // REMOVE TOKEN
            if (statement[1] === 'TOKEN') {
                throw Error('not implemented yet.');
            }

            // REMOVE SCOPE
            if (statement[1] === 'SCOPE') {
                throw Error('not implemented yet.');
            }

            // REMOVE TABLE
            if (statement[1] === 'TABLE') {
                const databaseI = await this.kv.getDBSession(this.session);


                const tableName = statement[2];

                const result = await databaseI.removeTable(tableName);
                return { result };
            }

            // REMOVE EVENT
            if (statement[1] === 'EVENT') {
                throw Error('not implemented yet.');
            }

            // REMOVE FIELD
            if (statement[1] === 'FIELD') {
                throw Error('not implemented yet.');
            }

            // REMOVE INDEX
            if (statement[1] === 'INDEX') {
                throw Error('not implemented yet.');
            }
        }






        if (statement[0] === 'INFO') {
            // INFO FOR
            if (statement[1] === 'FOR') {
                // INFO FOR KV
                if (statement[2] === 'KV') {
                    const result = await this.kv.infoForKV();
                    logEvent("trace", `process.ts processQuery`, `${query} ${JSON.stringify(result)}`);
                    return { result }
                }

                if (!this.session.ns) throw Error('Select namespace first.');
                if (!this.session.db) throw Error('Select db first.');

                // INFO FOR NS
                if (statement[2] === 'NS') {
                    if (!this.session.ns) throw Error('Select namespace first.');

                    const result = await this.kv.infoForNS({ ns: this.session.ns });
                    logEvent("trace", `process.ts processQuery`, `${query} ${JSON.stringify(result)}`);
                    return { result }
                }

                // INFO FOR DB
                if (statement[2] === 'DB') {
                    if (!this.session.ns) throw Error('Select namespace first.');
                    if (!this.session.db) throw Error('Select db first.');
                    const result = await this.kv.infoForDB({ ns: this.session.ns, db: this.session.db });
                    logEvent("trace", `process.ts processQuery`, `${query} ${JSON.stringify(result)}`);
                    return { result }
                }

                // INFO FOR TABLE
                if (statement[2] === 'TABLE') {
                    if (!this.session.ns) throw Error('Select namespace first.');
                    if (!this.session.db) throw Error('Select db first.');
                    const result = clone(await this.kv.infoForTable({ tb: statement[3], ns: this.session.ns, db: this.session.db }));
                    delete result._rowids
                    logEvent("trace", `process.ts processQuery`, `${query} ${JSON.stringify(result)}`);
                    return { result }
                }
            }

        }


        if (statement[0] === 'LIVE') {
            const liveid = crypto.randomUUID();
            logEvent("trace", `process.ts live`, `${query} ${JSON.stringify(statement)} ${liveid}`);
            return { result: liveid }
        }

        if (statement[0] === 'KILL') {
            logEvent("trace", `process.ts kill`, `${query} ${JSON.stringify(statement)}`);
            return { result: null };
        }

        logEvent("error", `process.ts processQuery`, ` could not process ${query}`);
        console.log(query);
        throw Error('could not process')
    }

}

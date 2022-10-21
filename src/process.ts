import { Session } from "./iam.ts";
import { kv } from "./index.ts";
import { parseIndex } from "./ix.ts";
import { parseIdFromThing } from "./kv.ts";
import { logEvent } from "./log.ts";
import { extractJSON } from "./process_table.ts";
import { clone } from "./utils.ts";

export const processQueries = async (options: {
    queries: string[],
    session: Session
}) => {
    const results = [];

    const session = new Session(JSON.parse(JSON.stringify(options.session)));

    for (const query of options.queries) {
        let result: any = undefined;

        const starttime = performance.now();
        const proc = await processQuery({ query, session }).catch(err => {
            logEvent('trace', 'process.ts processQueries()', err.message);

            results.push({
                status: "ERR",
                detail: err.message,
                time: `${((performance.now() - starttime) * 1000).toFixed(2)}µs`
            })

        });

        if (proc) {
            result = proc.result;

            results.push({
                time: `${((performance.now() - starttime) * 1000).toFixed(2)}µs`,
                status: "OK",
                result,


            })
        }
    }

    return results;
}


export const processQuery = async (options: {
    query: string,
    session: Session
}) => {
    const query = options.query;
    const statement = query.split(' ');
    logEvent("debug", `process.ts`, `Executing: ${query}`);
    if (statement[0] === 'USE') {
        // todo check if USE DB in the same line statement[3] ...

        if (statement.length === 5 && statement[1] === 'NS' && statement[3] == 'DB') {
            const ns = statement[2];
            const db = statement[4];
            const result = await options.session.use(ns, db)
            await kv.defineNS({ ns, definition: `DEFINE NAMESPACE ${ns}` });
            await kv.defineDB({ ns, definition: `DEFINE DATABASE ${db}`, db })
            // console.log('use ...', options.session)
            return { result }
        }

        if (statement.length === 3 && statement[1] === 'NS') {
            const ns = statement[2];
            const result = options.session.useNs(ns);
            await kv.defineNS({ ns, definition: `DEFINE NAMESPACE ${ns}` });
            return { result }
        }

        if (statement.length === 3 && statement[1] === 'DB') {
            if (!options.session.ns) throw Error('Select namespace first.');
            const db = statement[2];
            const result = options.session.useDb(db);
            await kv.defineDB({ ns: options.session.ns, definition: `DEFINE DATABASE ${db}`, db })
            return { result }
        }

    }

    // https://surrealdb.com/docs/surrealql/statements/define
    if (statement[0] === 'DEFINE') {
        const name = statement[2];
        const definition = query;

        // DEFINE NAMESPACE
        if (statement[1] === 'NAMESPACE') {
            logEvent("trace", "process.ts::define::field", "handing DEFINE NAMESPACE")
            const result = await kv.defineNS({ ns: name, definition });
            options.session.ns = name;
            logEvent("trace", `process.define.namespace`, `${query} ${JSON.stringify(result)}`);
            return { result }
        }

        // DEFINE DATABASE
        if (['DATABASE', 'DB'].indexOf(statement[1]) >= 0) {
            logEvent("trace", "process.ts::define::field", "handing DEFINE DATABASE || DB")
            if (!options.session.ns) throw new Error('Namespace not specified.')
            const result = await kv.defineDB({ db: name, definition, ns: options.session.ns })
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
            if (!options.session.ns) throw Error('Select namespace first.');
            if (!options.session.db) throw Error('Select db first.');
            const result = await kv.defineTB({ tb: name, definition, ns: options.session.ns, db: options.session.db });
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
            if (!options.session.ns) throw Error('Select namespace first.');
            if (!options.session.db) throw Error('Select db first.');
            const tableIndex = (statement[4] === "TABLE") ? 5 : 4;
            const tableName: string = statement[tableIndex];
            // removes the "TABLE keyword from the definition same as surrealdb.
            const definition = (statement[4] === "TABLE") ? query.replace(" TABLE ", " ") : query;
            const table = await kv.getTable(options.session, tableName)

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
            if (!options.session.ns) throw Error('Select namespace first.');
            if (!options.session.db) throw Error('Select db first.');
            const tableIndex = (statement[4] === "TABLE") ? 5 : 4;
            const tableName: string = statement[tableIndex];
            
            
            const table = await kv.getTable(options.session, tableName)

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

    if (statement[0] === 'INFO') {
        // INFO FOR
        if (statement[1] === 'FOR') {
            // INFO FOR KV
            if (statement[2] === 'KV') {
                const result = await kv.infoForKV();
                logEvent("trace", `process.ts processQuery`, `${query} ${JSON.stringify(result)}`);
                return { result }
            }

            // INFO FOR NS
            if (statement[2] === 'NS') {
                if (!options.session.ns) throw Error('Select namespace first.');

                const result = await kv.infoForNS({ ns: options.session.ns });
                logEvent("trace", `process.ts processQuery`, `${query} ${JSON.stringify(result)}`);
                return { result }
            }

            // INFO FOR DB
            if (statement[2] === 'DB') {
                if (!options.session.ns) throw Error('Select namespace first.');
                if (!options.session.db) throw Error('Select db first.');
                const result = await kv.infoForDB({ ns: options.session.ns, db: options.session.db });
                logEvent("trace", `process.ts processQuery`, `${query} ${JSON.stringify(result)}`);
                return { result }
            }

            // INFO FOR TABLE
            if (statement[2] === 'TABLE') {
                if (!options.session.ns) throw Error('Select namespace first.');
                if (!options.session.db) throw Error('Select db first.');
                const result = clone(await kv.infoForTable({ tb: statement[3], ns: options.session.ns, db: options.session.db }));
                delete result._rowids
                logEvent("trace", `process.ts processQuery`, `${query} ${JSON.stringify(result)}`);
                return { result }
            }
        }

    }

    // https://surrealdb.com/docs/surrealql/statements/remove
    if (statement[0] === 'REMOVE') {
        // REMOVE NAMESPACE
        if (statement[1] === 'NAMESPACE') {
            const ns = statement[2];
            const result = await kv.removeNS({ ns });
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
            throw Error('not implemented yet.');
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

    if (!options.session.ns) throw Error('Select namespace first.');
    if (!options.session.db) throw Error('Select db first.');

    // https://surrealdb.com/docs/surrealql/statements/create
    if (statement[0] === "CREATE") {
        const targets = statement[1];
        const { id, tb } = parseIdFromThing(targets)

        // CREATE @targets CONTENT
        if (statement[2] === 'CONTENT') {
            const data = extractJSON(query, "CONTENT", "RETURN");
            if (!data.id) data.id = generateThingId(targets);

            const result = await kv.createContent({
                targets: statement[1],
                data,
                ns: options.session.ns,
                db: options.session.db,
                session: options.session
            });

            logEvent("trace", `process::create content`, `${query} ${JSON.stringify(statement)}`);
            return { result: [result] };
        }

        // CREATE @targets SET
        if (statement[2] === 'SET') {

            console.log("---------------------------")
            console.log({ id, tb });

            // TODO move to a seperate parsing function that turns references into objects.
            const data: any = {}
            statement.slice(3).join(" ").split(',').forEach(
                field => {
                    const key = field.split("=")[0].trim();
                    const value = field.split("=")[1].trim();
                    data[key] = value.replaceAll("\"", "").replaceAll("'", "");
                })

            if (!data.id) data.id = generateThingId(targets);



            const result = await kv.createContent({
                targets: tb,
                data,
                ns: options.session.ns,
                db: options.session.db,
                session: options.session
            })

            logEvent("trace", `process::create set`, `${query} ${JSON.stringify(statement)}`);
            return { result: [result] };
        }
    }

    if (statement[0] === "SELECT") {
        const projections = statement[1];
        if (statement[2] !== "FROM") throw new Error('Expected keyword FROM');
        const targets = statement[3];

        // TODO https://surrealdb.com/docs/surrealql/statements/select
        // needs more keywords implemented.
        const result = await kv.select({
            projections,
            targets,
            ns: options.session.ns,
            db: options.session.db
        })

        logEvent("trace", `process::select`, `${JSON.stringify(result)}`);

        return { result: result }
    }

    if (statement[0] === 'UPDATE') {

        if (statement[2] === 'CONTENT') {
            const data = extractJSON(query, "CONTENT", "RETURN");
            const result = await kv.createContent({
                targets: statement[1],
                data,
                ns: options.session.ns,
                db: options.session.db,
                session: options.session
            });

            logEvent("trace", `process::update`, `${query} ${JSON.stringify(statement)}`);
            return { result: [result] };
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



export const generateThingId = (tableName: string) => {
    const id = crypto.randomUUID().split('-').join('').slice(-20);
    return `${tableName}:${id}`
}
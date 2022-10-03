import { Session } from "./iam.ts";
import { kv } from "./index.ts";
import { logEvent } from "./log.ts";
import { NS } from "./ns.ts";
import { extractJSON, processFields } from "./process_fields.ts";
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
                result,
                status: "OK",
                time: `${((performance.now() - starttime) * 1000).toFixed(2)}µs`
            })
        }
    }

    return results;
}


export const processQuery = async (options: {
    query: string,
    session: Session
}): Promise<{ result: any }> => {
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

    if (statement[0] === 'DEFINE') {
        const name = statement[2];
        const definition = query;

        if (statement[1] === 'NAMESPACE') {
            logEvent("trace", "process.ts::define::field", "handing DEFINE NAMESPACE")
            const result = await kv.defineNS({ ns: name, definition });
            options.session.ns = name;
            logEvent("trace", `process.define.namespace`, `${query} ${JSON.stringify(result)}`);
            return { result }
        }

        // define::database
        if (['DATABASE', 'DB'].indexOf(statement[1]) >= 0) {
            logEvent("trace", "process.ts::define::field", "handing DEFINE DATABASE || DB")
            if (!options.session.ns) throw new Error('Namespace not specified.')
            const result = await kv.defineDB({ db: name, definition, ns: options.session.ns })
            logEvent("trace", `process.define.database`, `${query} ${JSON.stringify(result)}`);
            return { result }
        }

        // define::table
        if (statement[1] === 'TABLE') {
            logEvent("trace", "process.ts::define::field", "handing DEFINE TABLE")
            if (!options.session.ns) throw Error('Select namespace first.');
            if (!options.session.db) throw Error('Select db first.');
            const result = await kv.defineTB({ tb: name, definition, ns: options.session.ns, db: options.session.db });
            logEvent("trace", `process.define.tb`, `${query} ${JSON.stringify(result)}`);
            return { result }
        }

        // define::field
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
        logEvent("error", "process.ts::define::field")
    }

    if (statement[0] === 'INFO') {

        if (statement[1] === 'FOR') {
            if (statement[2] === 'KV') {
                const result = await kv.infoForKV();
                logEvent("trace", `process.ts processQuery`, `${query} ${JSON.stringify(result)}`);
                return { result }
            }

            if (statement[2] === 'NS') {
                if (!options.session.ns) throw Error('Select namespace first.');

                const result = await kv.infoForNS({ ns: options.session.ns });
                logEvent("trace", `process.ts processQuery`, `${query} ${JSON.stringify(result)}`);
                return { result }
            }

            if (statement[2] === 'DB') {
                if (!options.session.ns) throw Error('Select namespace first.');
                if (!options.session.db) throw Error('Select db first.');
                const result = await kv.infoForDB({ ns: options.session.ns, db: options.session.db });
                logEvent("trace", `process.ts processQuery`, `${query} ${JSON.stringify(result)}`);
                return { result }
            }

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

    if (statement[0] === 'REMOVE') {
        if (statement[1] === 'NAMESPACE') {
            const ns = statement[2];
            const result = await kv.removeNS({ ns });
            return { result }
        }
    }

    if (!options.session.ns) throw Error('Select namespace first.');
    if (!options.session.db) throw Error('Select db first.');

    if (statement[0] === "CREATE") {

        if (statement[2] === 'CONTENT') {
            const data = extractJSON(query, "CONTENT", "RETURN");

            const result = await kv.createContent({
                targets: statement[1],
                data,
                ns: options.session.ns,
                db: options.session.db
            });

            logEvent("trace", `process::create content`, `${query} ${JSON.stringify(statement)}`);
            return { result: [result] };
        }

        if (statement[2] === 'SET') {
            const tableName = statement[1];

            // TODO move to a seperate parsing function that turns references into objects.
            const data: any = {}
            statement.slice(3).join(" ").split(',').forEach(
                field => {
                    const key = field.split("=")[0].trim();
                    const value = field.split("=")[1].trim();
                    data[key] = value.replaceAll("\"", "").replaceAll("'", "");
                })

            if (!data.id) data.id = generateThingId(tableName);

            // check fields
            const kvtable = await kv.getTable(options.session, tableName);

            const processedFieldsData = await processFields({ session: options.session, dataIn: data, kvtable }).catch((err) => {
                logEvent('trace', 'process.ts create set', err.message);
                // pass error to caller so it can be sent to client.
                throw err;
            })

            const result = await kv.createContent({
                targets: tableName,
                data: processedFieldsData,
                ns: options.session.ns,
                db: options.session.db
            });
            logEvent("trace", `process::create set`, `${query} ${JSON.stringify(statement)}`);
            return { result: [result] };
        }

        const result = {};
        return { result }
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
                db: options.session.db
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

    // if (query === 'INFO FOR NS') {
    //     if (!ns) throw 'TODO NS NOT IN USE';
    //     const result = await ns.infoForNS();
    //     return { result }
    // }

    logEvent("error", `process.ts processQuery`, ` could not process ${query}`);
    console.log(query);
    throw Error('could not process')
}



export const generateThingId = (tableName: string) => {
    const id = crypto.randomUUID().split('-').join('');
    return `${tableName}:${id}`
}
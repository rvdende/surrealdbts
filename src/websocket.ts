import { logEvent } from "./log.ts";
import { processQueries, processQuery } from "./process.ts";
import { Session, signin } from "./iam.ts";
import { v4 } from "https://deno.land/std@0.157.0/uuid/mod.ts";
import { TextLineStream } from "https://deno.land/std/streams/mod.ts"

export interface SWebsocket extends WebSocket {
    id?: string
    session?: Session
}

export interface WebsocketRequest {
    id: string
    method: string
    params: any[]
}

export const websocketMessageHandler = async (m: MessageEvent, ws: SWebsocket) => {
    const query = JSON.parse(m.data) as WebsocketRequest;
    const method = query.method;
    const id = query.id;
    const params = query.params.filter(p => p != null);

    logEvent("trace", "websocket.ts websocketMessageHandler()", `ws.id: "${ws.id}" ${JSON.stringify(query)}`);

    try {
        let result: unknown = null;

        if (method === 'signin') {
            let output = await signin(params[0]);
            ws.session = output.session;
            result = output.response;
            ws.send(JSON.stringify({ id, result }));
            return;
        }

        if (method === 'ping') {
            result = true;
            ws.send(JSON.stringify({ id, result }));
            return;
        }

        if (!ws.session) {
            // must be authed to run anything below.
            const errorMsg = 'Not authorized.'
            throw new Error(errorMsg);
        }

        if (method === 'query') {
            const queryParams: string[] = params;
            const queries = queryParams[0].trim().split(';').map(q => q.trim()).filter(q => q != "");
            result = await processQueries({
                queries,
                session: ws.session
            });
            ws.send(JSON.stringify({ id, result }));
            return;
        }

        if (method === 'use') {
            console.log('websocket use')
            const output = await processQuery({
                query: `USE NS ${params[0]} DB ${params[1]}`,
                session: ws.session
            })

            console.log(ws.session);

            ws.send(JSON.stringify({ id, result: output.result }));
            return;
        }

        if (method === 'create') {
            const output = await processQuery({
                query: `CREATE ${params[0]} CONTENT ${JSON.stringify(params[1])} RETURN AFTER`,
                session: ws.session
            })
            ws.send(JSON.stringify({ id, result: output.result }));
            return;
        }

        if (method === 'change') {
            const output = await processQuery({
                query: `UPDATE ${params[0]} CONTENT ${JSON.stringify(params[1])} RETURN AFTER`,
                session: ws.session
            })

            const packet = JSON.stringify({ id, result: output.result })
            logEvent("trace", "ws.send", packet);
            ws.send(packet);
            return;
        }

        if (method === 'select') {
            const output = await processQuery({
                query: `SELECT * FROM ${params[0]}`,
                session: ws.session
            })
            const packet = JSON.stringify({ id, result: output.result });
            logEvent("trace", "ws.send", packet);
            ws.send(packet);
            return;
        }

        if (method === 'live') {
            // console.log(params);
            const output = await processQuery({
                query: `LIVE SELECT * FROM ${params[0]}`,
                session: ws.session
            })
            const packet = JSON.stringify({ id, result: output.result });
            logEvent("trace", "ws.send", packet);
            ws.send(packet);
            return;
        }

        if (method === 'kill') {
            logEvent("trace", "websockets.ts kill", `${JSON.stringify(params)}`);
            const output = await processQuery({
                query: `KILL ${params[0]}`,
                session: ws.session
            })
            const packet = JSON.stringify({ id, result: output.result });
            logEvent("trace", "ws.send", packet);
            ws.send(packet);
            return;
        }

        logEvent("info", "surreal::web ws.onmessage.send", JSON.stringify({ id, result }));
        // ws.send(JSON.stringify({ id, result }));
        throw Error(`Could not process method:"${method}" params: [${params}]`)
    } catch (error) {
        logEvent("error", "web.ts catch", `ERROR ${error}`);
        console.log(error);
        ws.send(JSON.stringify({ id, error }));
    }
}
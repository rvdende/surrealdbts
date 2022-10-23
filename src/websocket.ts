import { logEvent } from "./log.ts";
import { Session, signin } from "./iam.ts";
import { SurrealDBTS } from "./surrealdbts.ts";


export interface SWebsocket extends WebSocket {
    id?: string
    session?: Session
    instance?: SurrealDBTS
}

export interface WebsocketRequest {
    id: string
    method: string
    params: any[]
}

export const websocketMessageHandler = async (m: MessageEvent, ws: SWebsocket, serverinstance: SurrealDBTS) => {
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

            ws.instance = serverinstance.getUserSession(ws.session);

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
            throw new Error(`${errorMsg}. ${JSON.stringify(query)}`);
        }

        if (!ws.instance) {
            // must have a valid instance to run anything below
            const errorMsg = 'No authed instance to use.'
            throw new Error(`${errorMsg}. ${JSON.stringify(query)}`);
        }

        if (method === 'query') {
            const queryParams: string[] = params;
            const queries = queryParams[0].trim().split(';').map(q => q.trim()).filter(q => q != "");
            result = await ws.instance.processQueries({ queries });
            ws.send(JSON.stringify({ id, result }));
            return;
        }

        if (method === 'use') {
            console.log('websocket use')
            const output = await ws.instance.processQuery({ query: `USE NS ${params[0]} DB ${params[1]}` })

            ws.send(JSON.stringify({ id, result: output.result }));
            return;
        }

        if (method === 'create') {
            const output = await ws.instance.processQuery({ query: `CREATE ${params[0]} CONTENT ${JSON.stringify(params[1])} RETURN AFTER` });
            ws.send(JSON.stringify({ id, result: output.result }));
            return;
        }

        if (method === 'change') {
            const output = await ws.instance.processQuery({ query: `UPDATE ${params[0]} CONTENT ${JSON.stringify(params[1])} RETURN AFTER` });

            const packet = JSON.stringify({ id, result: output.result })
            logEvent("trace", "ws.send", packet);
            ws.send(packet);
            return;
        }

        if (method === 'select') {
            const output = await ws.instance.processQuery({ query: `SELECT * FROM ${params[0]}` });
            const packet = JSON.stringify({ id, result: output.result });
            logEvent("trace", "ws.send", packet);
            ws.send(packet);
            return;
        }

        if (method === 'live') {
            // console.log(params);
            const output = await ws.instance.processQuery({ query: `LIVE SELECT * FROM ${params[0]}` });
            const packet = JSON.stringify({ id, result: output.result });
            logEvent("trace", "ws.send", packet);
            ws.send(packet);
            return;
        }

        if (method === 'kill') {
            logEvent("trace", "websockets.ts kill", `${JSON.stringify(params)}`);
            const output = await ws.instance.processQuery({ query: `KILL ${params[0]}` });
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
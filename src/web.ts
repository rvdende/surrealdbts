
import { opine, OpineRequest } from "https://deno.land/x/opine@2.3.3/mod.ts";
import { getArgs } from './args.ts'
import { logEvent } from "./log.ts";
import { Session } from "./iam.ts";
import { SWebsocket, websocketMessageHandler } from "./websocket.ts";
import { processQueries } from "./process.ts";
import { readAll } from "https://deno.land/std@0.120.0/streams/conversion.ts";

export function web() {
  const args = getArgs();
  const app = opine();
  const sockets = new Map<string, SWebsocket>();

  const handleWs = (ws: SWebsocket, req: OpineRequest) => {
    // generate a unique id
    ws.id = crypto.randomUUID();
    sockets.set(ws.id, ws);

    ws.addEventListener("open", () => {
      logEvent("trace", "surreal::web ws.onopen", `new ws.id: "${ws.id}" ${req.headers.get("host")} "${req.headers.get('user-agent')}" `);
    });

    ws.addEventListener("close", (_) => {
      logEvent("trace", "surreal::web ws.close", `ws closed "${ws.id}"`);
    });

    ws.addEventListener("message", async (e) => {
      await websocketMessageHandler(e, ws);
    });
  };

  app.use(async (req, res, next) => { 
     "${req.headers.get('user-agent')}"
    await logEvent('info', 'web.ts', `${req.headers.get("host")} ${req.method} ${req.path} "${req.headers.get('user-agent')}" `)
    next();
  });

  app.get("/rpc", async (req, res, next) => {
    if (req.headers.get("upgrade") === "websocket") {
      const sock = req.upgrade();
      await handleWs(sock, req);
    } else {
      res.send("You've gotta set the magic header...");
    }

    next();
  });

  app.post("/sql", async (req, res) => {
    const body = new TextDecoder().decode(await readAll(req.raw));

    const authorization = req.headers.get('authorization');
    if (!authorization) {
      logEvent('warn', 'web.ts /sql', 'authorization error')
      throw Error('authorization missing from header')
    }

    const session = new Session({
      authorization, ns: req.headers.get('NS') || undefined,
      db: req.headers.get('db') || undefined
    })
    const queries = body.trim().split(';').map((q: string) => q.trim()).filter((q: string) => q != "");

    const result = await processQueries({ queries, session }).catch(async (err) => {
      await logEvent('error', 'web /sql', `${err.message}`)
      console.log(err);
      await logEvent('trace', 'web /sql error', `${err.toString()}`)
      await res.send({ status: 'error', message: err.message });
    });
    if (result) {
      await logEvent('info', 'web /sql', `${req.method} ${req.path} ${body}`)
      await res.send(result);
    }
  });

  // app.use((_, res, __) => {
  //   res.setHeader("access-control-allow-origin", "*");
  //   res.setHeader(
  //     "access-control-expose-headers",
  //     "Upgrade,sec-websocket-accept,connection",
  //   );

  //   res.send();
  // });

  app.listen(args.port, () => {
    logEvent('info', 'web.ts web()', `Webserver listening on ${args.port} `)
  });
}

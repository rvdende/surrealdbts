
import { getArgs } from "./args.ts";
import { KV } from "./kv.ts";
import { logEvent } from "./log.ts";

const args = getArgs();

export interface SigninProps {
    user: string
    pass: string
}

export const signin = (props: SigninProps) => {
    // console.log('signin', props);

    if (props.user === args.user && props.pass === args.pass) {
        logEvent('debug', 'iam.ts', 'Authenticated as super user')
        const session = new Session({ user: props.user })
        return { response: '', session };
    }

    // TODO handle other signins here.
    // if (props.user) user = findUser(); ...


    throw { "code": -32000, "message": "There was a problem with authentication" };
}

export const sessions: ISession[] = [];
export interface ISession {
    user?: string
    token?: string
    ns?: string
    db?: string
    authorization?: string
}

export class Session implements ISession {
    user!: string
    token!: string
    ns!: string
    db!: string
    authorization!: string

    constructor(options?: Partial<ISession>) {
        if (options) {
            if (options.authorization) this.authorization = options.authorization;
            if (options.user) this.user = options.user;
            if (options.token) this.token = options.token;
            if (options.ns) this.ns = options.ns;
            if (options.db) this.db = options.db;
        }
    }

    useNs(ns: string) {
        logEvent('trace', 'iam::session', `USE NS ${ns}`)
        this.ns = ns;
        return null
    }

    useDb(db: string) {
        logEvent('trace', 'iam::session', `USE DB ${db}`)
        this.db = db;
        return null
    }

    use(ns: string, db: string) {
        logEvent('trace', 'iam::session', `Session use ${JSON.stringify({ ns, db })}`)
        this.ns = ns;
        this.db = db;
        return null;
    }
}
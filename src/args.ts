import { parse } from "https://deno.land/std@0.157.0/flags/mod.ts";
import { LogSeverity } from "./log.ts";

export interface Args {
    _: string[]
    user?: string
    pass?: string
    /** The logging level for the database server [env: LOG=] [default: info] [possible values: warn, info, debug, trace, full] */
    log?: LogSeverity
    bind?: string
    storageArgs: 'memory' | string
    port: number
}

export const getArgs = () => {
    const args = parse(Deno.args) as Args;
    args.storageArgs = (args._.at(-1) === 'start') ? 'memory' : args._.at(-1) as string
    args.port = args.bind ? parseInt(args.bind.split(':').at(-1) || "8000") : 8000
    return args;
}

export const getArgsFromCLI = () => {
    const args = parse(Deno.args) as Args;
    args.storageArgs = (args._.at(-1) === 'start') ? 'memory' : args._.at(-1) as string
    args.port = args.bind ? parseInt(args.bind.split(':').at(-1) || "8000") : 8000
    return args;
}
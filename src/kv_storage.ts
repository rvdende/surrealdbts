import { KVConstructorOptions } from "./kv.ts";
import { logEvent } from "./log.ts";

import { Store } from 'https://deno.land/x/store@v1.2.0/mod.ts'
import { KVStorageFile } from "./kv_storage_file.ts";
import { KVStorageMemory } from "./kv_storage_memory.ts";
import { getArgs } from "./args.ts";

export interface KVStorageEngine {
    set: (key: string | { [key: string]: any }, val?: any) => Promise<boolean>;
    get: <T = unknown>(key: string) => Promise<T>
    delete: (key: string | string[]) => Promise<boolean>;
}

export const initializeStorage = (options: KVConstructorOptions) => {
    

    const args = getArgs();

    if (options.storageArgs.startsWith('file://')) {
        let filename = 'db_'+args.storageArgs.slice(7)+'.json';
        logEvent("info", "kv_storage.ts", `Starting kvs store "${filename}"`);
        return new KVStorageFile('db_'+args.storageArgs.slice(7)+'.json');
    }


    // default;
    logEvent("info", "kv_storage.ts", `Starting kvs store in memory`);
    return new KVStorageMemory();
}
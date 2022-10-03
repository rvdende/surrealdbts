```
> deno run --allow-all --watch --allow-hrtime --unstable src/index.ts start --user root --pass root --log debug --bind 0.0.0.0:8080 file://test
Watcher Process started.

  .d8888b.                                            888 8888888b.  888888b.       888             
 d88P  Y88b                                           888 888  "Y88b 888  "88b      888             
 Y88b.                                                888 888    888 888  .88P      888             
  "Y888b.   888  888 888d888 888d888 .d88b.   8888b.  888 888    888 8888888K.      888888 .d8888b  
     "Y88b. 888  888 888P"   888P"  d8P  Y8b     "88b 888 888    888 888  "Y88b     888    88K      
       "888 888  888 888     888    88888888 .d888888 888 888    888 888    888     888    "Y8888b. 
 Y88b  d88P Y88b 888 888     888    Y8b.     888  888 888 888  .d88P 888   d88P d8b Y88b.       X88 
  "Y8888P"   "Y88888 888     888     "Y8888  "Y888888 888 8888888P"  8888888P"  Y8P  "Y888  88888P' 

                                                                                    Version: 0.0.1
 Inspired by https://surrealdb.com/ this is a typescript clone that aims to be compatible...

[2022-10-03 17:44:18]  INFO   index.ts      Root authentication is enabled
[2022-10-03 17:44:18]  INFO   index.ts      Root username is 'root'
[2022-10-03 17:44:18]  INFO   index.ts      Database strict mode is disabled
[2022-10-03 17:44:18]  INFO   kv_storage.ts Starting kvs store "db_test.json"
[2022-10-03 17:44:18]  INFO   start.ts      Starting webserver on 0.0.0.0:8080
[2022-10-03 17:44:18]  INFO   web.ts web()  Webserver listening on 8080 
[2022-10-03 17:44:57]  INFO   web.ts        0.0.0.0:8080 GET /rpc "Deno/1.26.0" 
[2022-10-03 17:44:57]  DEBUG  iam.ts        Authenticated as super user
[2022-10-03 17:44:57]  DEBUG  process.ts    Executing: REMOVE NAMESPACE testing
[2022-10-03 17:44:57]  DEBUG  process.ts    Executing: INFO FOR KV
...
```

The goal is to have a surrealdb compatible database that is fully developed in typescript.   
Still in very early stage development, but have fun!

# How to use:

Install https://deno.land/ if you do not have deno yet (tested with deno 1.26.0).

```
git clone https://github.com/rvdende/surrealdbts.git
cd surrealdbts
deno run --allow-all --watch --allow-hrtime --unstable src/index.ts start --user root --pass root --log debug --bind 0.0.0.0:8080 file://test
```

# Running the tests:

In another window run:

```
# runs against localhost:8000
deno run --allow-net --watch tests/index.ts 0

# runs against localhost:8080
deno run --allow-net --watch tests/index.ts 1
```
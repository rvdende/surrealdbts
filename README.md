deno run --allow-all --watch --allow-hrtime --unstable src/index.ts start --user root --pass root --log debug --bind 0.0.0.0:8080 file://test

deno run --allow-net --watch tests/index.ts 1
import { assert } from "https://deno.land/std@0.157.0/_util/assert.ts"

import { SurrealDBTS } from "./src/surrealdbts.ts";
import { iKVinfo } from "./tests/surrealclient.ts";
import { SR } from './src/index.ts'
import { devLog, logEvent } from "./src/log.ts";
import { stringBetweenKeywordsProc,stringBetweenKeywords, parseField } from "./src/process_table.ts";
import { is } from "./src/functions/validation.ts";


Deno.test("testFields", () => {
    logEvent("test", "fields", `testing parsing of fields`);

    const astring = 'DEFINE FIELD age ON person TYPE number ASSERT $value > 0;'
    const a = parseField(astring)
    assert(a.fieldName == "age", 'Expected a.fieldName to equal age')
    assert(a.tableName == "person", 'Expected a.tableName to equal person');
    assert(a.type == 'number', 'type should be number');
    assert(a.assert?.definition === '$value > 0', 'type assert should be $value > 0')

    const bstring = 'DEFINE FIELD email ON person TYPE string ASSERT is::email($value);'
    const b = parseField(bstring)

    assert(b.fieldName === 'email');
    assert(b.tableName === 'person');
    assert(b.type === 'string');
    assert(b.assert?.definition === 'is::email($value)')

    const cstring = "DEFINE FIELD name ON person TYPE string ASSERT $value VALUE $value OR 'No name';"
    const c = parseField(cstring)
    assert(c.fieldName === 'name');
    assert(c.tableName === 'person');
    assert(c.type === 'string')
    assert(c.assert?.definition === "$value VALUE $value OR 'No name'")
})

Deno.test("StringBetweenKeywords", () => {
    logEvent("test", "stringBetweenKeywords", `test stringBetweenKeywords`);

    assert(stringBetweenKeywordsProc('abc de ef gh xyz', "abc", "xyz") === 'de ef gh', 'error string between keywords proc')

    // TEST STRING
    const teststring = "ab cd FOO some important content BAR asdf"

    // Both start and end
    const result = stringBetweenKeywords(teststring, ["FOO"], ["BAR"]);
    assert((result === 'some important content'), "stringBetweenKeywords() Both start and end test failed.")

    // neither matches
    const resultb = stringBetweenKeywords(teststring, ["BAZ"], ["ASDF"]);
    assert((resultb === undefined), "stringBetweenKeywords() neither matches test failed.")

    // first matches
    const resultc = stringBetweenKeywords(teststring, ["FOO"], ["NOMATCH"]);
    assert((resultc === 'some important content BAR asdf'), "stringBetweenKeywords() first matches failed.")

     // first matches
     const resultc2 = stringBetweenKeywords(teststring, ["FOO"]);
     assert((resultc2 === 'some important content BAR asdf'), "stringBetweenKeywords() first matches failed.")
 
    // last matches
    const resultd = stringBetweenKeywords(teststring, ["NOMATCH"], ["BAR"]);
    assert((resultd === undefined), "stringBetweenKeywords() last matches failed.");

    // index test
    const resulte = stringBetweenKeywords('DEFINE INDEX email ON user COLUMNS email, phone, username UNIQUE', ['COLUMNS'], ['UNIQUE'])
    assert( resulte?.trim() === 'email, phone, username', 'unexpected string between keywords for define index test');
})

Deno.test("Validation", () => {
    logEvent("test", "functions_validation", `isEmail`);
    assert(is.email("joe.soap@abc.co.za"))
    assert(!is.email("thisisnotanemail"))
})

Deno.test("INFO", async () => {
    const instance = new SurrealDBTS({ log: 'debug' });
    const output = await instance.processQueries<[SR<iKVinfo>]>({ queries: ["INFO FOR KV;"] })
    assert(output[0].result.ns, "Expected result.ns data")
    // const outputb = await instance.processQuery({ query: "USE NS features DB platform;" })
    // console.log(outputb);
})


Deno.test("Quick Start", async () => {
    const instance = new SurrealDBTS({ log: 'debug' });

    const tests: ITests[] = [
        {
            q: "USE NS test DB test;",
            t: (out: SR) => {
                assert(out.status === "OK", "Error with USE NS test DB test")
            }
        },
        {
            q: "CREATE account SET name = 'ACME Inc', created_at = time::now();",
            t: (out: SR<any>) => {
                assert(out.result[0].created_at != "time::now()", "Error with time::now() on CREATE .. SET")
            }
        },
        {
            q: "SELECT * FROM account;",
            t: (out: SR<any>) => {
                assert(out.result.length != 0, "Could not SELECT * FROM account")
            }
        },
        {
            q: `CREATE author:john SET
            name.first = 'John',
            name.last = 'Adams',
            name.full = string::join(' ', name.first, name.last),
            age = 29,
            admin = true,
            signup_at = time::now()
        ;`,
        t: (out) => {
            console.log(out);
        }
        }
    ]

    const output = await instance.processQueries<[SR, SR<any>]>({ queries: tests.map(t => t.q) })

    tests.forEach((t, index) => {
        logEvent("test", "test.ts", t.q)
        t.t(output[index]);
    });

})



interface ITests {
    q:string,
    t: (out: SR<any>) => void
}
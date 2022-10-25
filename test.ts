import { assert } from "https://deno.land/std@0.157.0/_util/assert.ts"

import { SurrealDBTS } from "./src/surrealdbts.ts";
import { iKVinfo, rest } from "./tests/surrealclient.ts";
import { SR } from './src/index.ts'
import { devLog, logEvent } from "./src/log.ts";
import { stringBetweenKeywordsProc, stringBetweenKeywords, parseField } from "./src/process_table.ts";
import { is } from "./src/functions/validation.ts";
import { configs } from "./tests/test_config.ts";
import { string } from "./src/functions/string.ts";



Deno.test("DEFINE FIELD", () => {
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
    assert(resulte?.trim() === 'email, phone, username', 'unexpected string between keywords for define index test');
})


Deno.test("Functions Validation", () => {
    logEvent("test", "functions_validation", `isEmail`);
    assert(is.email("joe.soap@abc.co.za"))
    assert(!is.email("thisisnotanemail"))
})

// Deno.test("Functions String", () => {
//     const output = string.join("abc", "def", "efg");
//     assert(output === "abc def efg", "expected string.join to work");
// })

Deno.test("INFO", async () => {
    const instance = new SurrealDBTS({ log: 'debug' });
    const output = await instance.processQueries<[SR<iKVinfo>]>({ queries: ["INFO FOR KV;"] })

    assert(output[0].result.ns, "Expected result.ns data")
    const outputb = await instance.processQuery({ query: "USE NS features DB platform;" })
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
            q: "DELETE author;",
            t: (out) => {
                assert(out.status === "OK", "Could not clear author;")
            }
        },

        {
            q: "SELECT * FROM author;",
            t: (out, ref, color) => {
                assert(out.result.length === 0, "Expected zero entries")
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
            t: (out, ref, color) => {
                devLog({ out, ref }, color)
                
                // assert(out.result[0].admin === true, "admin should be true");
                // assert(out.result[0].age === 29, "age should be 29");
                // assert(out.result[0].name.first === "John", "Name should be John")
                // assert(out.result[0].name.last === "Adams", "Last should be Adams")
                // assert(out.result[0].name.full === "John Adams", "Expected string::join to work.")
                // assert(out.result[0].signup_at.slice(0,10) === new Date().toISOString().slice(0,10), "Expected time::now() to work.")
            }
        },

        // {
        //     q: "SELECT * FROM author;",
        //     t: (out, ref, color) => {
        //         assert(out.result.length === 1, "Expected only one entry")
        //     }
        // },

        // {
        //     q: "UPDATE author:john SET name.first = 'Joe'",
        //     t: (out, ref, color) => {
        //         devLog({ out, ref }, color)
        //         // assert(out.status === "OK", out.detail)
        //     }
        // }
    ]

    const output = await instance.processQueries<[SR, SR<any>]>({ queries: tests.map(t => t.q) })

    // runs against the official surreal db.
    const outputReference = await rest.query(configs[0], tests.map(t => t.q).join(""));

    // console.log({ outputReference });
    // console.log({ output })


    tests.forEach((t, index) => {
        logEvent("test", "test.ts", t.q)
        t.t(outputReference[index], "reference", "green");
        t.t(output[index], "myimplementation", "red");

        assert(output[index].status === outputReference[index].status, `Error when calling "${t.q}" ERROR: Status should match.`);
    });

})


interface ITests {
    q: string,
    t: (out: SR<any>, reference?: string, color?: string) => void
}
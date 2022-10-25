import { assert } from "https://deno.land/std@0.157.0/_util/assert.ts"

import { SurrealDBTS } from "./src/surrealdbts.ts";
import { iKVinfo, rest } from "./tests/surrealclient.ts";
import { SR } from './src/index.ts'
import { devLog, logEvent } from "./src/log.ts";
import { stringBetweenKeywordsProc, stringBetweenKeywords, parseField } from "./src/process_table.ts";
import { is } from "./src/functions/validation.ts";
import { configs } from "./tests/test_config.ts";
import { string } from "./src/functions/string.ts";
import { assertThrows } from "https://deno.land/std@0.153.0/testing/asserts.ts";



Deno.test("DEFINE FIELD", () => {
    // logEvent("test", "fields", `testing parsing of fields`);

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
    // logEvent("test", "stringBetweenKeywords", `test stringBetweenKeywords`);

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

/////// START functions string

Deno.test("Functions Validation", () => {
    assert(is.email("joe.soap@abc.co.za"), "Error with is::email")
    assert(!is.email("thisisnotanemail"), "Error with is::email negative test")
})

Deno.test("Functions string::concat()	Concatenates strings together", () => {
    assert(string.concat('this', ' ', 'is', ' ', 'a', ' ', 'test') === "this is a test", "Error with string::concat");
    assert(string.concat(1, 2, 3, 4, 5) === "12345", "Error with string::concat numbers");
});

Deno.test("Functions string::endsWith()	Checks whether a string ends with another string", () => {
    assert(string.endsWith('some test', 'test') === true, "Error with string::endsWith()");
    assert(string.endsWith(12345, '345') === true, "Error with string::endsWith() numbers")
});

Deno.test("Functions string::join()	Joins strings together with a delimiter", () => {
    assert(string.join(', ', 'a', 'list', 'of', 'items') === "a, list, of, items", "Error with string::join")
    assert(string.join(', ', 1, 2, 3, 4, 5) === "1, 2, 3, 4, 5", "Error with string::join() numbers");
});

Deno.test("Functions string::length()	Returns the length of a string", () => {
    assert(string.length('this is a test') === 14, "Error with string::length()");
    assert(string.length(12345) === 5, "Error with string::length() numbers");
});

Deno.test("Functions string::lowercase()	Converts a string to lowercase", () => {
    assert(string.lowercase('THIS IS A TEST') === 'this is a test', "Error with string::lowercase()");
    assert(string.lowercase(12345) === '12345', "Error with string::lowercase() numbers");
});

Deno.test("Functions string::repeat()	Repeats a string a number of times", () => {
    assert(string.repeat('test', 3) === 'testtesttest', "Error with string::repeat()")
    assert(string.repeat(123, 3) === '123123123', "Error with string::repeat() numbers")
});

Deno.test("Functions string::replace()	Replaces an occurence of a string with another string", () => {
    assert(string.replace('this is a test', 'a test', 'awesome') === 'this is awesome', "Error with string::replace()");
    assert(string.replace(12345, '12', '54') === '54345', "Error with string::replace() numbers");
});

Deno.test("Functions string::reverse()	Reverses a string", () => {
    assert(string.reverse('this is a test') === 'test a is this', "Error with string::reverse()");
    assert(string.reverse(12345) === '54321', "Error with string::reverse() numbers");
});

Deno.test("Functions string::slice()	Extracts and returns a section of a string", () => {
    assert(string.slice('this is a test', 10, 4) === 'test', "Error with string::slice()")
    assert(string.slice(12345.00, 0, 5) === '12345', "Error with string::slice() numbers")
});

Deno.test("Functions string::slug()	Converts a string into human and URL-friendly string", () => {
    assert(string.slug('SurrealDB has launched #database #awesome') === "surrealdb-has-launched-database-awesome", "Error with string::slug()");
    assert(string.slug(12345.01) === "12345-01", "Error with string::slug() numbers");
});

Deno.test("Functions string::split()	Divides a string into an ordered list of substrings", () => {
    assert(JSON.stringify(string.split('this, is, a, list', ', ')) === JSON.stringify(["this", "is", "a", "list"]), "Error with string::split()");
    assert(JSON.stringify(string.split(12345.01, '.')) === JSON.stringify(["12345", "01"]), "Error with string::split() numbers");
});

Deno.test("Functions string::startsWith()	Checks whether a string starts with another string", () => {
    assert(string.startsWith('some test', 'some') === true, "Error with string::startsWith()");
    assert(string.startsWith(12345, "123") === true, "Error with string::startsWith() numbers");
});

Deno.test("Functions string::trim()	Removes whitespace from the start and end of a string", () => {
    assert(string.trim('    this is a test    ') === "this is a test", "Error with string::trim()");
    assert(string.trim(12345) === "12345", "Error with string::trim()");
});

Deno.test("Functions string::uppercase()	Converts a string to uppercase", () => {
    assert(string.uppercase('this is a test') === "THIS IS A TEST", "Error with string::uppercase()");
    assert(string.uppercase(12345) === "12345", "Error with string::uppercase()");
});

Deno.test("Functions string::words()	Splits a string into an array of separate words", () => {
    assert(string.words('this is a test').toString() === ["this", "is", "a", "test"].toString(), "Error with string::words()");
    assert(string.words(12345).toString() === ["12345"].toString(), "Error with string::words() numbers");
});

/////// END functions string

/////// START functions time
Deno.test("Functions time::", () => { });

Deno.test("Functions time::day()	Extracts the day as a number from a datetime", () => {});
Deno.test("Functions time::floor()	Rounds a datetime down by a specific duration", () => {});
Deno.test("Functions time::group()	Groups a datetime by a particular time interval", () => {});
Deno.test("Functions time::hour()	Extracts the hour as a number from a datetime", () => {});
Deno.test("Functions time::mins()	Extracts the minutes as a number from a datetime", () => {});
Deno.test("Functions time::month()	Extracts the month as a number from a datetime", () => {});
Deno.test("Functions time::nano()	Returns the number of nanoseconds since the UNIX epoch", () => {});
Deno.test("Functions time::now()	Returns the current datetime", () => {});
Deno.test("Functions time::round()	Rounds a datetime up by a specific duration", () => {});
Deno.test("Functions time::secs()	Extracts the secs as a number from a datetime", () => {});
Deno.test("Functions time::unix()	Returns the number of seconds since the UNIX epoch", () => {});
Deno.test("Functions time::wday()	Extracts the week day as a number from a datetime", () => {});
Deno.test("Functions time::week()	Extracts the week as a number from a datetime", () => {});
Deno.test("Functions time::yday()	Extracts the yday as a number from a datetime", () => {});
Deno.test("Functions time::year()	Extracts the year as a number from a datetime", () => {});

/////// END functions time


Deno.test("INFO", async () => {
    const instance = new SurrealDBTS({
        log: 'none'
    });
    const output = await instance.processQueries<[SR<iKVinfo>]>({ queries: ["INFO FOR KV;"] })

    assert(output[0].result.ns, "Expected result.ns data")
    const outputb = await instance.processQuery({ query: "USE NS features DB platform;" })
})



Deno.test("Quick Start", async () => {
    const instance = new SurrealDBTS({
        log: 'none'
    });

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
                assert(out.result[0].admin === true, "admin should be true");
                assert(out.result[0].age === 29, "age should be 29");
                assert(out.result[0].name.first === "John", "Name should be John")
                assert(out.result[0].name.last === "Adams", "Last should be Adams")
                assert(out.result[0].name.full === "John Adams", "Expected string::join to work.")
                assert(out.result[0].signup_at.slice(0, 10) === new Date().toISOString().slice(0, 10), "Expected time::now() to work.")
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
        // logEvent("test", "test.ts", t.q)
        t.t(outputReference[index], "reference", "green");
        t.t(output[index], "myimplementation", "red");

        assert(output[index].status === outputReference[index].status, `Error when calling "${t.q}" ERROR: Status should match.`);
    });

})


interface ITests {
    q: string,
    t: (out: SR<any>, reference?: string, color?: string) => void
}
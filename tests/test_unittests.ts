import { assert } from "https://deno.land/std@0.153.0/_util/assert.ts";

import { parseField, stringBetweenKeywords, stringBetweenKeywordsProc } from "../src/process_table.ts";
import { logEvent } from "../src/log.ts";
import { is } from "../src/functions/validation.ts";

export const unittests = () => {
    test_stringBetweenKeywords();
    testFields();
    test_functions_validation();
}



const testFields = () => {
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

}

const test_stringBetweenKeywords = () => {
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
}

const test_functions_validation = () => {

    logEvent("test", "functions_validation", `isEmail`);
    assert(is.email("joe.soap@abc.co.za"))
    assert(!is.email("thisisnotanemail"))
    
}


import { FieldAssert, parseAssertFunction } from "./functions/validation.ts";
import { Session } from "./iam.ts";
// import { kv } from "./index.ts";
import { parseIndex } from "./ix.ts";
import { KV, parseIdFromThing } from "./kv.ts";
import { devLog } from "./log.ts";
import { generateThingId } from "./process.ts";
import { KVTable } from "./tb.ts";

// https://www.tutorialspoint.com/safely-setting-object-properties-with-dot-notation-strings-in-javascript
// https://github.com/lodash/lodash/issues/5411
import { set } from 'https://raw.githubusercontent.com/lodash/lodash/4.17.21-es/lodash.js';
import { evalScript } from "./eval.ts";

export const parseField = (definitionRaw: string) => {
    // https://surrealdb.com/docs/surrealql/statements/define

    // DEFINE FIELD email ON user TYPE string ASSERT is::email($value)
    // DEFINE FIELD timestamp ON TABLE devices TYPE datetime;

    const definition = definitionRaw.replaceAll(";", "")
    const x = definition.split(' ');

    if (x[0] !== "DEFINE") throw Error('Expected DEFINE keyword')
    if (x[1] !== "FIELD") throw Error('Expected FIELD keyword');

    if (x[3] !== "ON") throw Error('Expected ON keyword');

    const tableIndex = (x[4] === "TABLE") ? 5 : 4;
    const tableName: string = x[tableIndex];

    const fieldName = x[2];
    const type = (x.indexOf("TYPE") >= 0) ? x[x.indexOf("TYPE") + 1] : undefined;
    const permissions = stringBetweenKeywords(definition, ["PERMISSIONS"]);
    const assert = stringBetweenKeywords(definition, ["ASSERT"], ["PERMISSIONS"]);
    const value = stringBetweenKeywords(definition, ["VALUE"], ["ASSERT"]);

    const field: Field = {
        fieldName,
        tableName,
        type,
        assert: parseAssertFunction(assert),
        permissions,
        value,
    }

    return field;
}

// assert(JSON.stringify(parseField("")) === "");

export const processTable = async (options: {
    session: Session,
    dataIn: any,
    kvtable: KVTable,
    kv: KV
}) => {
    const { session, dataIn, kvtable } = options;

    const indexTasks = [];

    Object.keys(kvtable.tbInfo.ix).forEach(ix => {
        const index = parseIndex(kvtable.tbInfo.ix[ix]);
        if (index.unique && index.fields) {
            index.fields.forEach(async (uniqueFieldName) => {
                if (dataIn[uniqueFieldName]) {
                    // todo optimize select.
                    const result = await options.kv.select<any>({
                        projections: "",
                        targets: kvtable.tableName,
                        ns: session.ns,
                        db: session.db
                    })

                    const uniqueRowAlreadyExists = result.filter((i) => i[uniqueFieldName] === dataIn[uniqueFieldName]);
                    if (uniqueRowAlreadyExists.length > 0) {
                        // console.log('asmdklamsdkl');
                        // throw new Error('asdf')
                    }
                }
            })
        }

    })

    // throw new Error('placeholder error');

    const fieldTasks = Object.keys(kvtable.tbInfo.fd).map(async fd => {
        const field = parseField(kvtable.tbInfo.fd[fd])

        if (dataIn[field.fieldName]) {
            // console.log('field found');
            // console.log(field);
            // check assert
            if (field.assert?.tsEquavalent) {
                // todo check isemail
                const functionsValidations = new TextDecoder().decode(await Deno.readFile('./src/functions/validation.js'))

                // TODO add before etc...
                const value = dataIn[fd];
                const definitions = `const $value = "${dataIn[fd]}";`

                const result = await eval([functionsValidations, definitions, field.assert.tsEquavalent].join("\n"))
                if (result === false) throw Error(`Found "${value}" for field \`${fd}\`, with record \`${kvtable.tableName}:${dataIn.id}\`, but but field must conform to: ${field.assert.definition}`)
            }
        }

    })

    const results = await Promise.all(fieldTasks)

    return dataIn;
}



/** this is unit tested in test_unittests.ts */

export const stringBetweenKeywordsProc = (inputstring: string, startKeyword: string, endKeyword?: string) => {
    let workingstring = inputstring + '';
    let startIndex = inputstring.indexOf(`${startKeyword}`);
    let endIndex: number | undefined = undefined;



    if (endKeyword) endIndex = inputstring.indexOf(`${endKeyword}`);


    if (startIndex >= 0) {
        startIndex += startKeyword.length;
    } else {
        startIndex = 0;
        return undefined;
    }

    if (endIndex !== undefined && endIndex < 0) endIndex = undefined;
    workingstring = inputstring.slice(startIndex, endIndex);
    return workingstring.trim();
}

export const stringBetweenKeywords = (instring: string, startKeywords: string[], endKeywords?: string[]): string | undefined => {
    for (const s of startKeywords) {
        if (endKeywords) {
            for (const e of endKeywords) {
                const r = stringBetweenKeywordsProc(instring, s, e)
                if (r) return r;
            }
        }
    }

    // always try without the endkeywords
    for (const s of startKeywords) {
        const r = stringBetweenKeywordsProc(instring, s);
        if (r) return r;
    }

    return undefined;
}

export const extractJSON = (inputstring: string,
    before: string | string[],
    after: string | string[]
) => {
    let trimmed = "";
    if (typeof before === "string") {
        trimmed = inputstring.slice(inputstring.indexOf(before) + before.length + 1)
    }
    const reversed = trimmed.split("").reverse().join("");

    const lengthFromEndUntilJSON = reversed.indexOf("}");

    if (trimmed.length - lengthFromEndUntilJSON) {
        trimmed = trimmed.slice(0, -lengthFromEndUntilJSON);
    }

    const parsed = JSON.parse(trimmed);
    return parsed;
}

export const extractSetData = async (targets: string, query: string) => {

    // we run these at the end.
    const scriptsToExecute: { path: string, value: any }[] = [];

    const data: any = {}

    const qstr = stringBetweenKeywords(query, ["SET"]);

    if (!qstr) return {};
    let busyWithField = true;
    let field = "";
    let value = "";
    let ignoreCommas = false;

    const setValue = (object: Object, path: string, value: any) => {
        if (typeof value === "string" && value.indexOf("::") > 0) {
            // console.log(`adding script to run: ${value}`)
            scriptsToExecute.push({ path, value });
        }
        set(object, path, value) // set using dot notation
    }

    const parseValue = (valIn: string) => {
        if (valIn.startsWith("\'") && valIn.endsWith("\'")) {
            return valIn.slice(1, -1);
        }

        if (valIn.startsWith("\"") && valIn.endsWith("\"")) {
            return valIn.slice(1, -1);
        }

        if (valIn.indexOf("::") >= 0) {
            return valIn;
        } else {
            try {

                return JSON.parse(valIn);
            } catch (err) {
                return valIn;
            }
        }
    }

    const parseChar = (c: string) => {
        if (c === "(") {
            ignoreCommas = true
        }

        if (c === ")") {
            ignoreCommas = false;
        }

        if (!ignoreCommas && c === ',') {

            // data[field.trim()] = parseValue(value.trim());
            setValue(data, field.trim(), parseValue(value.trim())) // set using dot notation
            field = "";
            value = "";
            busyWithField = true;
            return;
        }

        if (c === "=") {
            busyWithField = false;
            return;
        }

        if (busyWithField) {
            field += c;
            return;
        }

        if (!busyWithField) {
            value += c;
            return;
        }
    }

    for (let char = 0; char < qstr.length; char++) {
        let c = qstr[char]; // character
        parseChar(c);
    }
    parseChar(',');


    const { id, tb } = parseIdFromThing(targets)

    data.id = `${tb}:${id}`;

    for (var s of scriptsToExecute) {
        const evalresult = await evalScript(s.value, data);
        set(data, s.path, evalresult)
    }

    return data;
}


export interface Field {
    fieldName: string
    tableName: string
    type?: string
    value?: string
    assert?: FieldAssert
    permissions?: any
}

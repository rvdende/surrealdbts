import { resolve } from "https://deno.land/std@0.153.0/path/win32.ts";
import { assert } from "https://deno.land/std@0.157.0/_util/assert.ts";
import { FieldAssert, parseAssertFunction } from "./functions/validation.ts";
import { Session } from "./iam.ts";
import { kv } from "./index.ts";
import { KVTable } from "./kv_table.ts";

export interface Index {
    indexName: string
    tableName: string
    fulltext: boolean
    unique: boolean
    definitionRaw: string,
    fields: string[]
}

export const parseIndex = (definitionRaw: string) => {
    // DEFINE INDEX @name ON [ TABLE ] @table [ FIELDS | COLUMNS ] @fields [ UNIQUE ]
    const words = definitionRaw.split(' ');
    const wordTableNameIndex = (words[4] === 'TABLE') ? 5 : 4;
    const fields = stringBetweenKeywords(definitionRaw, ["FIELDS", "COLUMNS"], ["UNIQUE"]);

    if (!fields) throw Error(`could not parse index definition: ${definitionRaw}`)

    const index: Index = {
        indexName: words[2],
        tableName: words[wordTableNameIndex],
        fulltext: words.indexOf('FULLTEXT') > 0,
        unique: words.indexOf('UNIQUE') > 0,
        definitionRaw,
        fields: fields.split(', '),
    }

    return index;
}

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
    kvtable: KVTable
}) => {
    const { session, dataIn, kvtable } = options;

    const indexTasks = [];

    Object.keys(kvtable.tbInfo.ix).forEach(ix => {
            const index = parseIndex(kvtable.tbInfo.ix[ix]);
            if (index.unique && index.fields) {
                index.fields.forEach(async (uniqueFieldName) => {
                    if (dataIn[uniqueFieldName]) {
                        // todo optimize select.
                        const result = await kv.select<any>({
                            projections: "",
                            targets: kvtable.tableName,
                            ns: session.ns,
                            db: session.db
                        })

                        const uniqueRowAlreadyExists = result.filter((i) => i[uniqueFieldName] === dataIn[uniqueFieldName]);
                        if (uniqueRowAlreadyExists.length > 0) {
                            console.log('asmdklamsdkl');
                            throw new Error('asdf')
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



export interface Field {
    fieldName: string
    tableName: string
    type?: string
    value?: string
    assert?: FieldAssert
    permissions?: any
}

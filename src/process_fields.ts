import { fs } from "https://deno.land/std@0.153.0/node/internal_binding/constants.ts";
import { FieldAssert, parseAssertFunction } from "./functions/validation.ts";
import { Session } from "./iam.ts";
import { iTBinfo, tDefinitions } from "./kv.ts";
import { KVTable } from "./kv_table.ts";



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
    const permissions = stringBetweenKeywords(definition, "PERMISSIONS");
    const assert = stringBetweenKeywords(definition, "ASSERT", "PERMISSIONS");
    const value = stringBetweenKeywords(definition, "VALUE", "ASSERT");

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

export const processFields = async (options: { session: Session, dataIn: any, kvtable: KVTable }) => {
    const { session, dataIn, kvtable } = options;


    const tasks = Object.keys(kvtable.tbInfo.fd).map(async fd => {
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

    const results = await Promise.all(tasks)

    return dataIn;
}

/** this is unit tested in test_unittests.ts */
export const stringBetweenKeywords = (inputstring: string, startKeyword: string, endKeyword?: string) => {
    let workingstring = inputstring + '';
    let startIndex = inputstring.indexOf(` ${startKeyword} `);
    let endIndex: number | undefined = undefined;

    if (endKeyword) endIndex = inputstring.indexOf(` ${endKeyword} `);

    if (startIndex >= 0) {
        startIndex += startKeyword.length + 2;
    } else {
        startIndex = 0;
        return undefined;
    }

    if (endIndex && endIndex < 0) endIndex = undefined;
    workingstring = inputstring.slice(startIndex, endIndex);
    return workingstring;
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

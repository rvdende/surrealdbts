import { stringBetweenKeywords } from "./process_table.ts";

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
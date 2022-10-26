export interface FieldAssert {
    funcName: string,
    param: string
    definition?: string,
    tsEquavalent?: string
}

export const parseAssertFunction = (definition?: string): FieldAssert | undefined => {
    if (!definition) return undefined;

    const tsEquavalent = definition.replaceAll("is::", "is.");

    const fieldAssert: FieldAssert = {
        funcName: '',
        param: '',
        definition,
        tsEquavalent,
    }

    return fieldAssert;
}

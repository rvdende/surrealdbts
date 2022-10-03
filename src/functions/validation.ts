export interface FieldAssert {
    funcName: string,
    param: string
    definition?: string,
    tsEquavalent?: string
}

export const parseAssertFunction = (definition?: string): FieldAssert | undefined => {
    if (!definition) return undefined;

    let tsEquavalent = definition.replaceAll("is::", "is.");

    let fieldAssert: FieldAssert = {
        funcName: '',
        param: '',
        definition,
        tsEquavalent,
    }

    return fieldAssert;
}

export const is = {
    email: (email: string) => {

        if (typeof email != 'string') return false;

        let check = email.toLowerCase()
            .match(
                /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
            );

        return !!check;
    }
}
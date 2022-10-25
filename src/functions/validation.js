"use strict";
exports.__esModule = true;
exports.is = exports.parseAssertFunction = void 0;
var parseAssertFunction = function (definition) {
    if (!definition)
        return undefined;
    var tsEquavalent = definition.replaceAll("is::", "is.");
    var fieldAssert = {
        funcName: '',
        param: '',
        definition: definition,
        tsEquavalent: tsEquavalent
    };
    return fieldAssert;
};
exports.parseAssertFunction = parseAssertFunction;
exports.is = {
    email: function (email) {
        if (typeof email != 'string')
            return false;
        var check = email.toLowerCase()
            .match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
        return !!check;
    }
};

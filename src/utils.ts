export const clone = (input: any) => {
    return JSON.parse(JSON.stringify(input));
}

export const getHighResolutionISOdatestringNow = () => {
    let now = new Date();

    return now.toISOString();
    // function pad(n) { return n < 10 ? '0' + n : n }
    // var localIsoString = date.getFullYear() + '-'
    //     + pad(date.getMonth() + 1) + '-'
    //     + pad(date.getDate()) + 'T'
    //     + pad(date.getHours()) + ':'
    //     + pad(date.getMinutes()) + ':'
    //     + pad(date.getSeconds());
    // if(date.getTimezoneOffset() == 0) localIsoString += 'Z';
    // return localIsoString;
}
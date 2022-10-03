export const clone = (input: any) => {
    return JSON.parse(JSON.stringify(input));
}
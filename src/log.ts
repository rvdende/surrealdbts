import { getArgs } from "./args.ts";

export type LogSeverity = "test" | "log" | "error" | "warn" | "info" | "debug" | "trace" | "full";

export function logEvent(severity: LogSeverity, source: string, message = "") {
    const args = getArgs();

    const coldate = "color: white; background-color: black;";
    let colseverity = "color: cyan; background-color: black;";

    if (severity === 'test') colseverity = "color: green; background-color: black;"
    if (severity === 'log') colseverity = "color: yellow; background-color: black;"
    if (severity === 'info') colseverity = "color: cyan; background-color: black;"
    if (severity === 'debug') colseverity = "color: magenta; background-color: black;"
    if (severity === 'warn') colseverity = "color: yellow; background-color: black;"
    if (severity === 'error') colseverity = "color: red; background-color: black;"
    if (severity === 'trace') colseverity = "color: white; background-color: black;"

    const colsource = "color: green; background-color: black;";
    const colmessage = colseverity;

    if (args.log === 'debug') {
        if (severity === 'trace') return;
        if (severity === 'warn') return;
    }


    console.log(`%c[${formatDate(new Date())}]  %c${severity.toUpperCase().padEnd(7)}%c${source.padEnd(13)} %c${message}`, coldate, colseverity, colsource, colmessage);
}

function padTo2Digits(num: number) {
    return num.toString().padStart(2, '0');
}

function formatDate(date: Date) {
    return (
        [
            date.getFullYear(),
            padTo2Digits(date.getMonth() + 1),
            padTo2Digits(date.getDate()),
        ].join('-') +
        ' ' +
        [
            padTo2Digits(date.getHours()),
            padTo2Digits(date.getMinutes()),
            padTo2Digits(date.getSeconds()),
        ].join(':')
    );
}
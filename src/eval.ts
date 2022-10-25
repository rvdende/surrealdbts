import { devLog } from "./log.ts";

export const evalScript = async (scriptIn: string, data: object) => {
    let script = scriptIn.replaceAll("::", ".");
    devLog("evalScript", "red");

    devLog(script, "red");

    const functionsTime = new TextDecoder().decode(await Deno.readFile('./src/functions/time.js'))
    const functionsString = new TextDecoder().decode(await Deno.readFile('./src/functions/string.js'))

    const scriptToRun = [
        functionsTime,
        functionsString,
        objectToScript(data),
        script.replaceAll("::", ".")
    ].join("\n");

    try {
        const result = await eval(scriptToRun)

        devLog({result}, "green");

        return result;
    } catch (err) {
        throw err;
    }

}


export const objectToScript = (input: any) => {
    let script = "";

    Object.keys(input).forEach((key: any) => {
        script += `const ${key} = ${JSON.stringify(input[key])};\n`
    })

    return script;
}
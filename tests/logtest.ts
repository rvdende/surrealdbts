import { SR } from "../src/index.ts";

export function logTest(cmds: string[], results: SR<any>[]) {
	cmds.forEach((value, index) => {
		const logCommand = `r[${index.toString()}]`
		console.log(`%c${cmds[index]}`, "color: magenta");
		const res = results[index];

		const color = (res.status === "OK") ? "color: green" : "color: red";

		console.log(`%c${logCommand} = ${JSON.stringify(res, null, 2)}`,  color);
	})
}
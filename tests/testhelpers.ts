import { SR, SurrealDBTS } from "../src/index.ts";
import { assert } from "https://deno.land/std@0.157.0/_util/assert.ts";
import { rest } from "./surrealclient.ts";
import { configs } from "./test_config.ts";

export interface ITests {
  q: string;
  t: (out: SR<any>, reference?: string, color?: string, data?: { reference: SR<any>, myimplementation: SR<any> }) => void;
}

export const runTests = async (tests: ITests[]) => {
  const instance = new SurrealDBTS({
    // log: "none",
  });

  // runs against the official surreal db.
  const outputReference = await rest.query(
    configs[0],
    tests.map((t) => t.q).join(""),
  );

  let output = await instance.processQueries<[SR, SR<any>]>({
    queries: tests.map((t) => t.q),
  });

  // console.log({ outputReference });
  // console.log({ output })

  tests.forEach((t, index) => {
    // logEvent("test", "test.ts", t.q)
    t.t(outputReference[index], "reference", "green", { reference: outputReference[index], myimplementation: output[index] });
    t.t(output[index], "myimplementation", "red", { reference: outputReference[index], myimplementation: output[index] });

    assert(
      output[index].status === outputReference[index].status,
      `Error when calling "${t.q}" ERROR: Status should match.`,
    );
  });
};

export function logTest(cmds: string[], results: SR<any>[]) {
  cmds.forEach((value, index) => {
    const logCommand = `r[${index.toString()}]`;
    console.log(`%c${cmds[index]}`, "color: magenta");
    const res = results[index];

    const color = (res.status === "OK") ? "color: green" : "color: red";

    console.log(`%c${logCommand} = ${JSON.stringify(res, null, 2)}`, color);
  });
}


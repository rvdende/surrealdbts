import { setRaw } from "https://deno.land/std@0.153.0/_deno_unstable.ts";
import { assert } from "https://deno.land/std@0.157.0/_util/assert.ts";
import { SR } from "../src/index.ts";
import { iDBinfo, iTBinfo } from "../src/kv.ts";
import { logEvent } from "../src/log.ts";
import { logTest } from "./logtest.ts";
import { rest, iKVinfo } from './surrealclient.ts'
import { TestConfig } from './test_config.ts'


export const httptest = async (config: TestConfig) => {
	try {

		///////////////////////////////////////////////////////////////////////////////////////////////////
		// CLEAR THE DB BEFORE ALL TESTS.

		const cleardbcmds = [
			"REMOVE NAMESPACE testing;",
			"REMOVE NAMESPACE features;",
			"INFO FOR KV;"]
		logEvent("test", "test_http::httptest", cleardbcmds.join(""));

		await rest.query<[SR, SR, SR<iKVinfo>]>(config, cleardbcmds.join("")).then((r) => {
			// logTest(cleardbcmds, r);
			assert(r[0].status == "OK");
			assert(r[1].status == "OK");
			assert(r[2].result.ns.testing == undefined);
			assert(r[2].result.ns.features == undefined);
		});

		///////////////////////////////////////////////////////////////////////////////////////////////////


		logEvent("test", "test_http::httptest", "INFO FOR KV;");
		await rest.query<[SR<iKVinfo>]>(config, "INFO FOR KV;").then(
			(r) => {
				if (!r[0].result.ns) throw Error('Expected NS data.')
				if (r[0].result.ns["testing"]) throw Error('NS should be deleted.')
			});

		logEvent("test", "test_http::httptest", "DEFINE NAMESPACE testing");
		await rest.query<[SR]>(config, "DEFINE NAMESPACE testing").then(r => {
			if (r[0].status !== "OK") throw new Error('Expected OK');
			if (!r[0].time) throw new Error('Missing time string')
		});

		logEvent("test", "test_http::httptest", `Should create a table entry`);
		await rest.query<[SR]>(config, "CREATE account SET name = 'ACME Inc', created_at = time::now();").then(r => {
			if (r[0].status === 'ERR') throw Error(r[0].detail)
		});

		// ns FEATURES
		/** define namespace features and databases to test the examples in the documentation. */

		// db platform
		/** Create namespace features with db platform; */
		logEvent("test", "test_http::httptest", "Create namespace features with db platform;");
		await rest.query<[SR]>(config, "DEFINE NAMESPACE features; DEFINE DATABASE platform;").then(r => {
			if (r[0].status !== "OK") throw new Error('Expected OK');
			if (!r[0].time) throw new Error('Missing time string')
		});


		// db platform
		/** -- Specify a field on the user table */


		logEvent("test", "test_http::httptest", `features / platform / Specify a field on the user table`);

		await rest.query<[SR, SR]>(config, `REMOVE NAMESPACE features; USE NS features;`).then(r => {
			if (r[0].status !== "OK") throw new Error('Expected OK');
			if (r[1].status !== "OK") throw new Error('Expected OK');
		});



		// -- Specify a field on the user table
		const definitionTBdefineFieldTest = 'DEFINE FIELD email ON TABLE user TYPE string ASSERT is::email($value)';
		await rest.query<[SR, SR, SR<iTBinfo>, SR<any[]>, SR<any[]>, SR<any[]>]>(config, `USE NS features DB platform;
		DEFINE FIELD email ON TABLE user TYPE string ASSERT is::email($value);
		INFO FOR TABLE user;
		CREATE user SET name = \"Test User\", email = \"rouan@8bo.org\";
		CREATE user SET name = \"Another User\", email = \"notanemail\";
		SELECT * FROM user WHERE email = \"rouan@8bo.org\";
		`).then(r => {

			// USE NS features DB platform;
			assert(r[0].status === "OK");

			// DEFINE FIELD email ON TABLE user TYPE string ASSERT is::email($value);
			assert(r[1].status === "OK");

			// INFO FOR TABLE user;			
			assert(r[2].result.fd.email == definitionTBdefineFieldTest.replace(" TABLE ", " "), "Error: Field did not set on table user.");

			// CREATE user SET name = \"Test User\", email = \"rouan@8bo.org\";
			assert(r[3].status === "OK");
			assert(r[3].result[0].email === "rouan@8bo.org", "Error in email field on response")
			assert(r[3].result[0].name === "Test User", 'error in name field on response');
			assert(r[3].result[0].id.split(':')[0] === "user", 'error in id field on response');

			// CREATE user SET name = \"Another User\", email = \"notanemail\";
			assert(r[4].status === "ERR", 'Expected ERR');
			assert(r[4].detail?.startsWith('Found "notanemail" for field `email`, with record `user'), 'Missing details of error')

			// SELECT * FROM user WHERE email = \"rouan@8bo.org\";
			assert(r[5].status === 'OK', 'Expected OK');
			assert(r[5].result[0].email === 'rouan@8bo.org', 'Missing entry data email')
			assert(r[5].result[0].name === "Test User", 'Missing entry data name')
		});

		//////////////////// TEST ADDING A UNIQUE INDEX AFTER THERE IS A DUPLICATE ALREADY.
		// -- Add a unique index on the email field to prevent duplicate values
		interface testUserEntry {
			name: string
			email: string
		}

		let testColumnUnique: testUserEntry[] = [{
			name: "Test User First Email",
			email: "first@example.com"
		}, {
			name: "Test User Second Email",
			email: "second@example.com"
		}, {
			name: "Test User Third Email",
			email: "first@example.com"
		}];


		const cmds_test_index = [
			`USE NS features DB platform; `,
			`CREATE user SET name = \"${testColumnUnique[0].name}\", email = \"${testColumnUnique[0].email}\";`,
			`CREATE user SET name = \"${testColumnUnique[1].name}\", email = \"${testColumnUnique[1].email}\";`,
			`CREATE user SET name = \"${testColumnUnique[2].name}\", email = \"${testColumnUnique[2].email}\";`,
			`DEFINE INDEX email ON TABLE user COLUMNS email UNIQUE;`
		]

		await rest.query<[SR, SR<testUserEntry[]>, SR<testUserEntry[]>, SR<testUserEntry[]>, SR]>(config, cmds_test_index.join(""))
			.then(r => {
				// logTest(cmds_test_index, r);
				assert(r[0].status === "OK"); // USE NS ...

				assert(r[1].status === "OK"); // CREATE 0
				assert(r[2].status === "OK"); // CREATE 1
				assert(r[3].status === "OK"); // CREATE 2

				assert(r[1].result[0].name === testColumnUnique[0].name, 'Error creating user entry 0');
				assert(r[2].result[0].name === testColumnUnique[1].name, 'Error creating user entry 0');
				assert(r[3].result[0].name === testColumnUnique[2].name, 'Error creating user entry 1');

				assert(r[4].status === "ERR", 'Expected status to be ERR because of unique column.')
				assert(r[4].detail?.startsWith(`Database index \`email\` already contains "${testColumnUnique[0].email}", with record \`user:`))
			})


		///////////////////////// TEST ADDING AN INDEX AND THEN A DUPLICATE

		const cmds_test_index2 = [
			`USE NS features DB platform; `,
			`REMOVE TABLE user;`,
			`INFO FOR DB;`, // check if it did remove.
			`CREATE user SET name = \"${testColumnUnique[0].name}\", email = \"${testColumnUnique[0].email}\";`,
			`CREATE user SET name = \"${testColumnUnique[1].name}\", email = \"${testColumnUnique[1].email}\";`,
			`DEFINE INDEX email ON TABLE user COLUMNS email UNIQUE;`,
			`CREATE user SET name = \"${testColumnUnique[2].name}\", email = \"${testColumnUnique[2].email}\";`
		]

		await rest.query<[SR, SR, SR<iDBinfo>]>(config, cmds_test_index2.join("")).then(r => {
			logTest(cmds_test_index2, r);
			assert(r[0].status === "OK"); // USE NS ...
			assert(r[1].status === "OK" && r[1].result === null, "Error removing table user"); // REMOVE TABLE user;		
			assert(r[2].status === "OK" && r[2].result.tb.user === undefined, "Did not remove the user table")
		})




	} catch (err) {
		logEvent("error", "ERROR", err.message);
	}
}




interface SurrealTest {
	query: string,

}
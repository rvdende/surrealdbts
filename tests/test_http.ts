import { iTBinfo } from "../src/kv.ts";
import { logEvent } from "../src/log.ts";
import { KV, SR, rest } from './surrealclient.ts'
import { TestConfig } from './test_config.ts'


export const httptest = async (config: TestConfig) => {
	try {
		logEvent("test", "test_http::httptest", `REMOVE NAMESPACE testing;`);
		await rest.query<[SR<"">]>(config, `REMOVE NAMESPACE testing;`).then((result) => {
			if (result[0].status !== "OK") throw new Error('Expected OK');
		});

		logEvent("test", "test_http::httptest", "INFO FOR KV;");
		await rest.query<[SR<KV>]>(config, "INFO FOR KV;").then(
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
		const definitionTBdefineFieldTest = 'DEFINE FIELD email ON TABLE user TYPE string ASSERT is::email($value)';
		const definitionTBdefineFieldTestResult = 'DEFINE FIELD email ON user TYPE string ASSERT is::email($value)'

		logEvent("test", "test_http::httptest", `features / platform / Specify a field on the user table`);

		await rest.query<[SR,SR]>(config, `REMOVE NAMESPACE features; USE NS features;`).then(r => {
			if (r[0].status !== "OK") throw new Error('Expected OK');
			if (r[1].status !== "OK") throw new Error('Expected OK');
		});

		await rest.query<[SR,SR]>(config, `USE NS features DB platform; ${definitionTBdefineFieldTest}`).then(r => {
			if (r[0].status !== "OK") throw new Error('Expected OK');
			if (r[1].status !== "OK") throw new Error('Expected OK');
		});

		await rest.query<[SR,SR<iTBinfo>]>(config, "USE NS features DB platform; INFO FOR TABLE user;").then(r => {
			if (r[0].status !== "OK") throw new Error('Expected OK');
			if (r[1].status !== "OK") throw new Error('Expected OK');
			// console.log(r);
			// console.log(r[1].result.fd.email);
			if (r[1].result.fd.email !== definitionTBdefineFieldTestResult) { throw new Error('field did not set on table user')}
		});

		// TODO CREATE email test field.
		await rest.query<[SR,SR<any[]>]>(config, "USE NS features DB platform; CREATE user SET name = \"Test User\", email = \"rouan@8bo.org\";").then(r => {
			if (r[0].status !== "OK") throw new Error('Expected OK');
			if (r[1].status !== "OK") throw new Error('Expected OK');
			if (r[1].result[0].email != "rouan@8bo.org") throw new Error('error in email field on response')
			if (r[1].result[0].name != "Test User") throw new Error('error in name field on response')
			if (r[1].result[0].id.split(':')[0] != "user") throw new Error('error in id field on response')
		});

		await rest.query<[SR,SR<any[]>]>(config, "USE NS features DB platform; CREATE user SET name = \"Test User\", email = \"notanemail\";").then(r => {
			if (r[0].status !== "OK") throw new Error('Expected OK');
			if (r[1].status !== "ERR") throw new Error('Expected ERR');
			if (!r[1].detail?.startsWith('Found "notanemail" for field `email`, with record `user')) throw new Error('Missing details of error');

		});

	} catch (err) {
		logEvent("error", "ERROR", err.message);
	}
}
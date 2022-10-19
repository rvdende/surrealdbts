import { logEvent } from "../src/log.ts";
import { IPerson } from "./interface_iperson.ts";
import { Surreal, KV, SR } from './surrealclient.ts'
import { TestConfig } from './test_config.ts'

export const websockettest = async (config: TestConfig) => {
	logEvent("test", "test_websocket::websockettest", "Starting test");
	const db = Surreal.Instance;

	logEvent("test", "test_websocket::websockettest", `connect to /rpc`);
	await db.connect(`${config.url}/rpc`);

	logEvent("test", "test_websocket::websockettest", `WS sign in with user and pass`);
	await db.signin({ user: config.user, pass: config.pass })


	logEvent("test", "test_websocket::websockettest", `WS REMOVE NAMESPACE testing;`);
	await db.query<[SR<"">]>(`REMOVE NAMESPACE testing;`).then((result) => {
		if (result[0].status !== `OK`) throw new Error('Expected OK');
	});

	logEvent("test", "test_websocket::websockettest", `WS INFO FOR KV;`);
	await db.query<[SR<KV>]>(`INFO FOR KV;`).then(
		(r) => {
			if (!r[0].result.ns) throw Error('Expected NS data.')
			if (r[0].result.ns[`testing`]) throw Error('NS should be deleted.')
		});

	logEvent("test", "test_websocket::websockettest", `WS DEFINE NAMESPACE $ns;`);
	await db.query<[SR]>(`DEFINE NAMESPACE testing;`).then(r => {
		if (r[0].status !== `OK`) throw new Error('Expected OK');
		if (!r[0].time) throw new Error('Missing time string')
	});
	await db.query<[SR<KV>]>(`INFO FOR KV;`).then(
		(r) => {
			if (!r[0].result.ns) throw Error('Expected NS data.')
			if (!r[0].result.ns[`testing`]) throw Error('NS should be created.')
		});

	logEvent("test", "test_websocket::websockettest", `DEFINE DATABASE $tb`);

	await db.query<[SR]>(`USE NS testing; DEFINE DATABASE asdf;`).then(r => {
		if (r[0].status !== `OK`) throw new Error('Expected OK');
		if (!r[0].time) throw new Error('Missing time string')
	});

	await db.query<[SR]>(`USE NS testing; INFO FOR NS;`).then(r => {
		if (r[0].status !== `OK`) throw new Error('Expected OK');
		if (!r[0].time) throw new Error('Missing time string')
	});


	logEvent("test", "test_websocket::websockettest", `use(ns, db)`);
	await db.use('testing', 'testing').then(r => {
		if (r !== null) throw new Error('expected null');
	})

	logEvent("test", "test_websocket::websockettest", `create(tb, data)`);
	const tobie: IPerson = {
		title: 'Founder & CEO',
		name: {
			first: 'Tobie',
			last: 'Morgan Hitchcock',
		},
		marketing: true,
		identifier: Math.random().toString(36).substr(2, 10),
	}
	await db.create<IPerson>(`person`, tobie).then(r => {
		if (!r[0].id) throw Error('missing id');
		if (r[0].name.first !== tobie.name.first) throw Error('missing name.first');
		if (r[0].marketing !== tobie.marketing) throw Error('boolean mismatch');
	})

	logEvent("test", "test_websocket::websockettest", `WS CHANGE table:id`);
	await db.change(`person:jaime`, {
		marketing: true,
	}).then(r => {
		if (!r[0].id) throw Error('missing id');
		if (r[0].marketing !== true) throw Error('marketing expected to be true;')
	})


	logEvent("test", "test_websocket::websockettest", `WS SELECT`);
	await db.select<IPerson>(`person`).then(r => {
		console.log(r)
		if (r.length !== 2) throw Error('expected two entries.');
		// if (r[0].name.first !== 'Tobie') throw Error('missing first entry name');
		// if (r[1].id != 'person:jaime') throw Error('missing jaime id');
	})


	logEvent("test", "test_websocket::websockettest", `WS PING`);
	await db.ping().then(r => { if (r !== true) throw Error('ping response expected to be true') })


	logEvent("test", "test_websocket::websockettest", `WS LIVE & KILL`);
	await db.live(`person`, `DIFF FROM person;`).then(async r => {
		let liveid = "";
		console.log("live", r);
		liveid = r;

		await db.create<IPerson>(`person`, { title: 'live tester1', name: { first: 'joe', last: 'soap' }, marketing: false, identifier: 'livetester1' })
		await db.create<IPerson>(`person`, { title: 'live tester2', name: { first: 'joe', last: 'soap' }, marketing: false, identifier: 'livetester2' })
		await db.create<IPerson>(`person`, { title: 'live tester3', name: { first: 'joe', last: 'soap' }, marketing: false, identifier: 'livetester3' })

		console.log(liveid);
		await db.kill(liveid).then(r => { console.log(r); });

	})

	logEvent("test", "test_websocket::websockettest", `EOF`);
}

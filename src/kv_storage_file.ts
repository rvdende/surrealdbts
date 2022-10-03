// from https://deno.land/x/store@v1.2.0/mod.ts?source

import { join } from 'https://deno.land/std@0.61.0/path/mod.ts'
import { KVStorageEngine } from "./kv_storage.ts";

export interface StoreOptions {
	name?: string
	path?: string
}

export class KVStorageFile implements KVStorageEngine {
	public name: string
	public path: string

	private filePath: string
	private dirExists: boolean
	private data: any

	constructor(opts?: string | StoreOptions) {
		if (typeof opts === 'string') {
			opts = {
				name: opts
			}
		}

		const {
			name = '.datastore',
			path = '.'
		} = opts || {}

		this.name = name
		this.path = path.startsWith('/') ? path : join(Deno.cwd(), path)
		this.filePath = join(this.path, name)
		this.dirExists = false
		this.load();
	}

	private isNullOrEmptyData() {
		return !this.data || !Object.keys(this.data).length
	}

	private async load() {
		// console.log('kv storage load')
		let data = this.data

		if (data) {
			return data
		}

		try {
			const content = new TextDecoder().decode(await Deno.readFile(this.filePath))
			
			data = content && JSON.parse(content)
			this.dirExists = true
		}
		catch (e) {
			if (e.name !== 'NotFound') {
				throw e
			}
		}

		data = data || {}
		this.data = data

		return data
	}

	private async save() {
		// console.log('saving db');
		const { data, filePath } = this

		if (!this.data) {
			return
		}

		if (!this.dirExists) {
			await mkdir(this.path)
		}

		try {
			await Deno.writeFile(filePath, new TextEncoder().encode(JSON.stringify(data)), {
				mode: 0o0600
			})
		}
		catch (e) {
			throw e
		}
	}

	async get (key: string) {
		await this.load()

		return this.data[key]
	}

	async set (key: string | { [key: string]: any }, val?: any) {
		await this.load()

		let dataChanged = false

		if (typeof key === 'string') {
			const oldVal = this.data[key]

			if (oldVal !== val) {
				this.data[key] = val
				dataChanged = true
			}
		}
		else {
			const keys = Object.keys(key)

			for (const k of keys) {
				const oldVal = this.data[k]
				const val = key[k]

				if (oldVal !== val) {
					this.data[k] = val
					dataChanged = true
				}
			}
		}

		if (dataChanged) {
			await this.save()
			return true
		}

		return false
	}

	async has(key: string) {
		await this.load()

		return this.data.hasOwnProperty(key)
	}

	async delete(key: string | string[]) {
		if (this.isNullOrEmptyData()) {
			return false
		}

		await this.load()

		let dataChanged = false

		if (typeof key === 'string') {
			key = [key]
		}

		for (const k of key) {
			if (await this.has(k)) {
				delete this.data[k]
				dataChanged = true
			}
		}

		if (dataChanged) {
			await this.save()
			return true
		}

		return false
	}

	async clear() {
		if (this.isNullOrEmptyData()) {
			return
		}

		this.data = {}
		await this.save()
	}

	async toObject() {
		return this.data || await this.load()
	}
}

export const directoryExists = async (dir: string, parent: string) => {
	for await (const entry of Deno.readDir(parent)) {
		if (entry.isDirectory && entry.name === dir) {
			return true
		}
	}
	return false
}

export const mkdir = async (path: string) => {
	const parent = Deno.cwd()
	const segments = path.replace(parent, '').split('/')
	let exists = true

	for (let i = 0; i < segments.length; i++) {
		const s = segments[i]

		if (!s || !i && s === '.') {
			continue
		}
		else if (s === '..') {
			return
		}

		if (!await directoryExists(s, parent + segments.slice(0, i).join('/'))) {
			exists = false
			break
		}
	}

	if (!exists) {
		await Deno.mkdir(path, {
			recursive: true
		})
		return path
	}
}
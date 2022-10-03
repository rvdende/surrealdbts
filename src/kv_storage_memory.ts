// from https://deno.land/x/store@v1.2.0/mod.ts?source

import { join } from 'https://deno.land/std@0.61.0/path/mod.ts'
import { KVStorageEngine } from "./kv_storage.ts";
import { logEvent } from './log.ts';

export interface StoreOptions {
	name?: string
	path?: string
}

export class KVStorageMemory implements KVStorageEngine {
	// public name: string
	// public path: string

	// private filePath: string
	// private dirExists: boolean
	private data: any = {}

	constructor(opts?: string | StoreOptions) { }

	private isNullOrEmptyData() {
		return !this.data || !Object.keys(this.data).length
	}

	private async load() {
		await logEvent('error', 'memory storage can not load()')
		return this.data
	}

	private async save() {
		await logEvent('error', 'memory storage can not save()')
	}

	async get(key: string) {
		await logEvent('trace', 'memory storage get()')
		return this.data[key]
	}

	async set(key: string | { [key: string]: any }, val?: any) {
		await logEvent('trace', 'memory storage set()')
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
			return true
		}

		return false
	}

	async has(key: string) {
		await logEvent('trace', 'memory storage has()')
		return this.data.hasOwnProperty(key)
	}

	async delete(key: string | string[]) {
		await logEvent('trace', 'memory storage delete()')
		if (this.isNullOrEmptyData()) {
			return false
		}

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
			return true
		}

		return false
	}

	async clear() {
		await logEvent('trace', 'memory storage clear()')
		if (this.isNullOrEmptyData()) {
			return
		}

		this.data = {}
	}

	async toObject() {
		await logEvent('trace', 'memory storage toObject()')
		return this.data || await this.load()
	}
}

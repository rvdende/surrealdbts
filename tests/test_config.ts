export interface TestConfig {
    id?: string,
    url: string
    user: string,
    pass: string,
    NS?: string,
    DB?: string
}


export const configs: TestConfig[] = [{
    id: 'SurrealDB Official',
    url: 'http://0.0.0.0:8000',
    user: 'root',
    pass: 'root',
    NS: 'testing',
    DB: 'testing'
}, {
    id: 'Rouan DenoDB',
    url: 'http://0.0.0.0:8080',
    user: 'root',
    pass: 'root',
    NS: 'testing',
    DB: 'testing'
}]

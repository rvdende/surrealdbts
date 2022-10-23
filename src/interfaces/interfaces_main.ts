/** Surreal Result */
export interface SR<T = null> {
    result: T
    status: "OK" | string
    time: string
    detail?: string
}
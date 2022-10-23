


export const generateThingId = (tableName: string) => {
    const id = crypto.randomUUID().split('-').join('').slice(-20);
    return `${tableName}:${id}`
}
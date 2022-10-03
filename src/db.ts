
export class DB {
    name: string;
    definition: string;

    constructor(opt: { name: string, definition: string }) {
        this.name = opt.name;
        this.definition = opt.definition;
    }
}

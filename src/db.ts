
export class DB {
    name: string;
    definition: string;

    // info = {
    //     "db": {
    //         "openboard": "DEFINE DATABASE openboard"
    //     },
    //     "nl": {},
    //     "nt": {}
    // }

    constructor(opt: { name: string, definition: string }) {
        this.name = opt.name;
        this.definition = opt.definition;
    }
}

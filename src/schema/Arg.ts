export class Arg {
    private readonly _name : string;
    private readonly _optional: boolean;

    constructor(name: string, optional: boolean) {
        this._name = name;
        this._optional = optional;
    }

    get name(): string {
        return this._name;
    }

    get optional(): boolean {
        return this._optional;
    }
}

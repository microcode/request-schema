export class Arg {
    constructor(private _name: string, private _optional: boolean) {}

    get name(): string {
        return this._name;
    }

    get optional(): boolean {
        return this._optional;
    }
}

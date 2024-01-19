import { IResult } from "./IResult";

export class Result implements IResult {
    _value?: unknown = undefined;
    _meta = new Map<string,unknown>();

    get value() {
        return this._value;
    }

    withValue(v: unknown) {
        this._value = v;
        return this;
    }

    addMeta(k: string, v: unknown): IResult {
        this._meta.set(k,v);
        return this;
    }

    get meta() {
        return this._meta;
    }
}

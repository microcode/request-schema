import { IResult } from "./IResult";

export class Result implements IResult {
    _value: any | null = null;
    _meta = new Map<string,any>();

    get value() {
        return this._value;
    }

    withValue(v: any) {
        this._value = v;
        return this;
    }

    addMeta(k: string, v: any): IResult {
        this._meta.set(k,v);
        return this;
    }

    get meta() {
        return this._meta;
    }
}

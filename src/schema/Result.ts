type MetaMap = Map<string,any>;

export interface IResult {
    readonly value: any | null;
    readonly meta: MetaMap;

    withValue(v: any) : IResult;
    addMeta(key: string, value: any) : IResult;
}

export class Result {
    _value: any | null = null;
    _meta: MetaMap = new Map<string,any>();

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

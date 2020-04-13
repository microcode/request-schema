class Result {
    constructor() {
        this._value = undefined;
        this._meta = new Map();
    }

    get value() {
        return this._value;
    }

    with_value(v) {
        this._value = v;
        return this;
    }

    add_meta(k, v) {
        this._meta.set(k,v);
    }

    get meta() {
        return this._meta;
    }
}

exports.Result = Result;

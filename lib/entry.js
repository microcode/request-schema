class Entry {
    constructor(filters, func) {
        this._filters = filters;
        this._func = func;

        Object.seal(this);
    }

    get filters() {
        return this._filters;
    }

    get func() {
        return this._func;
    }
}

exports.Entry = Entry;

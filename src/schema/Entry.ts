import {IFilter} from '../Filter';

export interface IEntry {
    filters: IFilter[];
    func: any;
    args: [];
}

export class Entry {
    private readonly _filters: IFilter[];
    private readonly _func: any;
    private _args: any[];

    constructor(filters: IFilter[], func: any) {
        this._filters = filters;
        this._func = func;
        this._args = [];
    }

    get filters(): IFilter[] {
        return this._filters;
    }

    get func(): any {
        return this._func;
    }

    get args(): any[] {
        return this._args;
    }

    set args(value: any[]) {
        this._args = value;
    }
}

import { IFilter } from '../IFilter';
import { IEntry } from './IEntry';

export class Entry implements IEntry {
    private _args: any[];

    constructor(private _filters: IFilter[], private _func: any) {
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

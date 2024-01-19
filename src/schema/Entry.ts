import { IFilter } from '../IFilter';
import { IEntry, IEntryFunction } from './IEntry';
import { Arg } from './Arg';

export class Entry implements IEntry {
    private _args: Arg[];

    constructor(private _filters: IFilter[], private _func: IEntryFunction) { 
        this._args = [];
    }

    get filters(): IFilter[] {
        return this._filters;
    }

    get func(): IEntryFunction {
        return this._func;
    }

    get args(): Arg[] {
        return this._args;
    }

    set args(value: Arg[]) {
        this._args = value;
    }
}

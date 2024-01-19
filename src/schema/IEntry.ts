import { IFilter } from '../IFilter';
import { Arg } from './Arg';

export type IEntryFunction = Function; // eslint-disable-line @typescript-eslint/ban-types

export interface IEntry {
    filters: IFilter[];
    func: IEntryFunction;
    args: Arg[];
}

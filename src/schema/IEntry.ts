import { IFilter } from '../IFilter';

export interface IEntry {
    filters: IFilter[];
    func: any;
    args: any[];
}

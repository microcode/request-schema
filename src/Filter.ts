import {IFilterData} from "./FilterData";

export abstract class IFilter {
    abstract run(data: IFilterData): Promise<void>;
}

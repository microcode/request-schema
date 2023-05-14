import { IFilterData } from "./IFilterData";

export abstract class IFilter {
    abstract run(data: IFilterData): Promise<void>;
}

import { FilterData } from "./FilterData";
import { CompletionCallbackFn } from "./IFilterData";
import { IFilter } from "./IFilter";
import { Result } from "./schema/Result";
import { IResult } from "./schema/IResult";

import * as chai from "chai";
import "mocha";

const expect = chai.expect;

describe('Filter', function () {
    it('should pass on a successful run', async function () {
        class TestFilter extends IFilter {
            async run(_filterData: FilterData) {}
        }

        const filterData = new FilterData("", "", {}, {}, new Map<string,string>(), async (_result: IResult) => {}, async(_err: Error) => {}, async (_fn: CompletionCallbackFn) => {}, new Result());
        const filter = new TestFilter();

        await filter.run(filterData);
    });

    it('should fail when throwing an error', async function () {
        class TestFilter extends IFilter {
            async run(_filterData: FilterData) {
                throw new Error("Rejected");
            }
        }

        let err;
        const filterData = new FilterData("", "", {}, {}, new Map<string,string>(), async (_result: IResult) => {}, async (_err: Error) => {
            err = _err;
        }, async (_fn: CompletionCallbackFn) => {}, new Result());
        const filter = new TestFilter();

        try {
            await filter.run(filterData);
        } catch (err) {
            filterData.reject(err as Error);
        }
        expect(err).to.not.be.undefined;
    });

    it('should fail when explicitly rejected', async function () {
        class TestFilter extends IFilter {
            async run(filterData: FilterData) {
                filterData.reject(new Error("Rejected"));
            }
        }

        let err;
        const filterData = new FilterData("", "", {}, {}, new Map<string,string>(), async (_result: IResult) => {}, async (_err: Error) => {
            err = _err;
        }, async (_fn: CompletionCallbackFn) => {}, new Result());
        const filter = new TestFilter();

        await filter.run(filterData);
        expect(err).to.not.be.undefined;
    });

    it('should resolve data', async function () {
        class TestFilter extends IFilter {
            async run(filterData: FilterData) {
                filterData.resolve("test");
            }
        }

        let result : IResult = new Result();
        let err : Error | undefined;
        const filterData = new FilterData("", "", {}, {}, new Map<string,string>(), async (_result: IResult) => { result = _result; }, async (_err: Error) => {
            err = _err;
        }, async (_fn: CompletionCallbackFn) => {}, new Result());
        const filter = new TestFilter();

        await filter.run(filterData);

        expect(result).to.not.be.undefined;
        expect(result.value).to.equal("test");
        expect(err).to.be.undefined;
    });

    it('can register functions to run after a successful resolve', async function () {
        class TestFilter extends IFilter {
            async run(filterData: FilterData) {
                await filterData.onCompleted(async (_err: Error | null, _result: IResult | null, _context: any) => {});
            }
        }

        const functions: CompletionCallbackFn[] = [];
        const filterData = new FilterData("", "", {}, {}, new Map<string,string>(), async (_result: IResult) => {}, async (_err: Error) => {}, async (func: CompletionCallbackFn) => { functions.push(func); }, new Result());
        const filter = new TestFilter();

        await filter.run(filterData);
        expect(functions.length).to.equal(1);
    });

});

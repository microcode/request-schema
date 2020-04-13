const { Filter } = require('..');
const { FilterData } = require('../lib/filter');
const { Result } = require('../lib/schema/result');

const assert = require('assert');

describe('Filter', function () {
    it('should pass on a successful run', async function () {
        class TestFilter extends Filter {
            async run(filterData) {}
        }

        const filterData = new FilterData("", "", {}, {}, {}, () => {}, () => {});
        const filter = new TestFilter();

        await filter.run(filterData);
    });

    it('should fail when throwing an error', async function () {
        class TestFilter extends Filter {
            async run(filterData) {
                throw new Error("Rejected");
            }
        }

        let err = undefined;
        const filterData = new FilterData("", "", {}, {}, {}, () => {}, (_err) => {
            err = _err;
        });
        const filter = new TestFilter();

        try {
            await filter.run(filterData);
        } catch (err) {
            filterData.reject(err);
        }
        assert(err !== undefined);
    });

    it('should fail when explicitly rejected', async function () {
        class TestFilter extends Filter {
            async run(filterData) {
                filterData.reject(new Error("Rejected"));
            }
        }

        let err = undefined;
        const filterData = new FilterData("", "", {}, {}, {}, () => {}, (_err) => {
            err = _err;
        });
        const filter = new TestFilter();

        await filter.run(filterData);
        assert(err !== undefined);
    });

    it('should should resolve data', async function () {
        class TestFilter extends Filter {
            async run(filterData) {
                console.log(filterData);
                filterData.resolve("test");
            }
        }

        let data = undefined, err = undefined;
        const filterData = new FilterData("", "", {}, {}, {}, (_data) => { data = _data; }, (_err) => {
            err = _err;
        }, undefined, new Result());
        const filter = new TestFilter();

        await filter.run(filterData);

        assert(data.value === "test");
        assert(err === undefined);
    });

    it('can register functions to run after a successful resolve', async function () {
        class TestFilter extends Filter {
            async run(filterData) {
                filterData.on_completed(() => {});
            }
        }

        let functions = [];
        const filterData = new FilterData("", "", {}, {}, {}, () => {}, () => {}, (func) => { functions.push(func); });
        const filter = new TestFilter();

        await filter.run(filterData);
        assert.equal(functions.length, 1);
    });
});

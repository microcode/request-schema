const { Schema, Filter } = require('..');
const assert = require('assert');

describe('Schema', function () {
    it('should register and call methods properly', async function () {
        const testUrl = '/test';
        const readMethod = 'read';
        const writeMethod = 'write';

        const schema = new Schema([readMethod, writeMethod]);

        let store = { data: 0 };

        schema.on(readMethod, testUrl, async () => {
            return store;
        });

        schema.on(writeMethod, testUrl, async data => {
            store = data;
        });

        await schema.run(readMethod, testUrl).then(response => {
            assert(response && response.data === 0);
        });
        await schema.run(writeMethod, testUrl, { data: 1 });
        await schema.run(readMethod, testUrl).then(response => {
            assert(response && response.data === 1);
        });
    });

    it('should run methods on wildcard urls properly', async function () {
        const readMethod = 'read';
        const schema = new Schema([readMethod]);
        const id = '1234';

        schema.on(readMethod, '/foo/:test_id/bar', async test_id => {
            assert.equal(test_id, id);
        });

        await schema.run(readMethod,'/foo/' + id + '/bar');
    });

    it('should allow most function signatures', async function () {
        const schema = new Schema(['read']);

        await schema.on('read', '/foo/:a', function (a) {});
        await schema.on('read', '/foo/:a', function func(a) {});
        await schema.on('read', '/foo/:a/:b', async function func(a,b) {});
        await schema.on('read', '/foo/:a', (a) => {});
        await schema.on('read', '/foo/:a/:b', async (a,b) => {});
    });

    it('should not allow unknown arguments', async function () {
        const schema = new Schema(['read']);
        assert.throws(() => { schema.on('read', '/foo', function func(a) {}); }, Error);
    });

    it('should allow extra arguments', async function () {
        const method = 'emit';
        let origValue = 'bar';
        let valueName = 'value';
        let paramValue = '1234';
        const schema = new Schema([method], { extra: [valueName] });

        let matched = false, called = false;
        await schema.on(method, '/foo/:a', function (value, a) {
            if (a !== paramValue) throw new Error("Parameter not matching");
            if (value === origValue) matched = true;
            called = true;
        });

        await schema.run(method, '/foo/1234', {}, {}, new Map([[valueName, origValue]]));

        assert.equal(called, true);
        assert.equal(matched, true);
    });

    it('should fail calling if an argument value cannot be found', async function () {
        const method = 'emit';
        let origValue = 'bar';
        let valueName = 'value';
        let paramValue = '1234';
        const schema = new Schema([method], { extra: [valueName] });

        let called = false;
        await schema.on(method, '/foo/:a', function (value, a) {
            called = true;
        });

        try {
            await schema.run(method, '/foo/1234');
        } catch (err) {
            assert.equal(err.message, "Argument value not found");
        }

        assert.equal(called, false);
    });

    it('should not allow registering urls on non-existing methods', async function () {
        const schema = new Schema(['a']);

        assert.throws(() => { schema.on('b', '/test') }, Error);
    });

    it('can access context variable', async function () {
        const schema = new Schema(['read']);
        const value = '1234';

        schema.on('read', '/foo', function foo() {
            assert.equal(this.value, value);
        });
        schema.on('read', '/foo2', (context) => {
            assert.equal(context.value, value);
        });

        await schema.run('read', '/foo', {}, { value: value });
        await schema.run('read', '/foo2', {}, { value: value });
    });

    it('cannot access context variable via this on expression statements', async function () {
        const schema = new Schema(['read']);
        const value = '1234';

        schema.on('read', '/foo', () => {
            assert.notEqual(this.value, value);
        });

        await schema.run('read', '/foo', {}, { value: value });
    });

    it('contains path in filter data', async function () {
        const schema = new Schema(['read']);
        const path = '/foo';

        let filter_executed = false;
        class TestFilter extends Filter {
            async run(data) {
                assert.equal(data.path, path);
                filter_executed = true;
            }
        }

        let function_executed = false;
        schema.on('read', path, new TestFilter(), () => {
            assert.equal(true, filter_executed, "Filter has not executed");
            function_executed = true;
        });

        await schema.run('read', '/foo', {}, {});
        assert.equal(true, function_executed, "Function has not executed");
    });

    it('runs filter before calling the function', async function () {
        const schema = new Schema(['read']);

        let filter_executed = false;
        class TestFilter extends Filter {
            async run() {
                filter_executed = true;
            }
        }

        let function_executed = false;
        schema.on('read', '/foo', new TestFilter(), () => {
            assert.equal(true, filter_executed, "Filter has not executed");
            function_executed = true;
        });

        await schema.run('read', '/foo', {}, {});
        assert.equal(true, function_executed, "Function has not executed");
    });

    it('fails to register method if filter is not inheriting from Filter', async function () {
        const schema = new Schema(['read']);

        assert.throws(() => { schema.on('read', '/foo', () => {}, () => {}); }, Error);
    });

    it('does not run function if filter rejects', async function () {
        const schema = new Schema(['read']);

        class TestFilter extends Filter {
            async run() {
                throw new Error("Rejected");
            }
        }

        let function_executed = false;
        schema.on('read', '/foo', new TestFilter(), () => {
            assert.equal(true, filter_executed, "Filter has not executed");
            function_executed = true;
        });

        let err = undefined;
        await schema.run('read', '/foo', {}, {}).catch(_err => {
            err = _err;
        });
        assert.equal(err.message, "Rejected");
    });

    it('runs second function if first is rejected', async function () {
        const schema = new Schema(['read']);

        class TestFilter extends Filter {
            async run() {
                throw new Error("Rejected");
            }
        }

        let function1_executed = false, function2_executed = false;
        schema.on('read', '/foo', new TestFilter(), () => {
            function1_executed = true;
        });
        schema.on('read', '/foo', () => {
            function2_executed = true;
        });

        await schema.run('read', '/foo', {}, {});

        assert.equal(function1_executed, false, "First function should not execute");
        assert.equal(function2_executed, true, "Second function should execute");
    });

    it('can be resolved early by a filter', async function () {
        const schema = new Schema(['read']);

        class TestFilter extends Filter {
            async run(filterData) {
                await filterData.resolve("test");
            }
        }

        let function_executed = false;
        schema.on('read', '/foo', new TestFilter(), () => {
            function_executed = true;
        });

        const data = await schema.run('read', '/foo', {}, {});

        assert.equal(function_executed, false, "Function should not execute");
        assert.equal(data, "test");
    });

    it('won\'t run the second function if the first one succeeds', async function () {
        const method = 'read';
        const path = '/foo';
        const testData = '1234';

        const schema = new Schema([method]);

        schema.on(method, path, function () {
            return testData;
        });
        schema.on(method, path, function () {
            throw new Error("Should not execute");
        });

        assert.equal(await schema.run(method, path), testData);
    });

    it('won\'t run filters for the second function if the first one succeeds', async function () {
        const method = 'read';
        const path = '/foo';
        const testData = '1234';

        const schema = new Schema([method]);

        class TestFilter extends Filter {
            async run() {
                throw new Error("Should not execute");
            }
        }

        schema.on(method, path, function () {
            return testData;
        });
        schema.on(method, path, new TestFilter(), function () {
            throw new Error("Should not execute");
        });

        assert.equal(await schema.run(method, path), testData);
    });

    it('won\'t allow a filter to resolve twice', async function () {
        const method = 'read';
        const path = '/foo';
        const testData = '1234';

        const schema = new Schema([method]);

        class TestFilter extends Filter {
            async run(data) {
                await data.resolve(testData);
                await data.resolve(testData);
            }
        }

        schema.on(method, path, new TestFilter(), function () {
            return testData;
        });

        let resolve_err = undefined;
        try {
            await schema.run(method, path);
        } catch (err) {
            resolve_err = err;
        }

        assert.equal(resolve_err.message, "on_resolve already called");
    });

    it('can run resolve callbacks registered by a filter', async function () {
        const schema = new Schema(['read']);
        const testData = "test";
        const testContext = {
            is_context: true
        };

        let callback_executed = false;
        class TestFilter extends Filter {
            async run(filterData) {
                await filterData.on_completed((err, data, context) => {
                    assert(!err);
                    assert.equal(data, testData);
                    assert.equal(context.is_context, true);
                    callback_executed = true;
                });
            }
        }

        let function_executed = true;
        schema.on('read', '/foo', new TestFilter(), () => {
            function_executed = true;
            return testData;
        });

        const data = await schema.run('read', '/foo', {}, testContext);

        assert.equal(function_executed, true, "Function should execute");
        assert.equal(callback_executed, true, "Callback should execute");
        assert.equal(data, testData);
    });

    it('will execute completion callbacks in reverse order', async function () {
        const schema = new Schema(['read']);
        const testData = "test";
        const testContext = {
            is_context: true
        };

        let count = 0;
        let last = 0;

        class TestFilter1 extends Filter {
            async run(filterData) {
                await filterData.on_completed(() => {
                    count++;
                    last = 1;
                });
            }
        }

        class TestFilter2 extends Filter {
            async run(filterData) {
                await filterData.on_completed(() => {
                    count++;
                    last = 2;
                });
            }
        }

        schema.on('read', '/foo', new TestFilter1(), new TestFilter2(), () => {});

        await schema.run('read', '/foo', {}, testContext);

        assert.equal(count, 2);
        assert.equal(last, 1);
    });
});

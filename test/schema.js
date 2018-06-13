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
                filterData.resolve("test");
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

    it('can run resolve callbacks registered by a filter', async function () {
        const schema = new Schema(['read']);
        const testData = "test";
        const testContext = {
            is_context: true
        };

        let callback_executed = false;
        class TestFilter extends Filter {
            async run(filterData) {
                filterData.on_resolve((data, context) => {
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

    it('won\'t run resolve callbacks registered by earlier filters', async function () {
        const schema = new Schema(['read']);
        const testData = "test";
        const testContext = {
            is_context: true
        };

        class TestFilter1 extends Filter {
            async run(filterData) {
                filterData.on_resolve(() => {
                    throw new Error("Should not execute");
                });
            }
        }

        let callback_executed = false;
        class TestFilter2 extends Filter {
            async run(filterData) {
                filterData.on_resolve((data, context) => {
                    assert.equal(data, testData);
                    assert.equal(context.is_context, true);
                    callback_executed = true;
                });
            }
        }

        schema.on('read', '/foo', new TestFilter1(), () => {
            throw new Error("This function fails");
        });

        let function_executed = true;
        schema.on('read', '/foo', new TestFilter2(), () => {
            function_executed = true;
            return testData;
        });

        const data = await schema.run('read', '/foo', {}, testContext);

        assert.equal(function_executed, true, "Function should execute");
        assert.equal(callback_executed, true, "Callback should execute");
        assert.equal(data, testData);
    });
});

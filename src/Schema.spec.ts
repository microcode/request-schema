import {Schema} from "./Schema";

import * as chai from "chai";

import "mocha";
import { IFilterData } from "./IFilterData";
import { IFilter } from "./IFilter";
import { IResult } from "./schema/IResult";

const expect = chai.expect;

/* tslint:disable:only-arrow-functions */
/* tslint:disable:no-unused-expression */
/* tslint:disable:variable-name */
/* tslint:disable:no-empty */
/* tslint:disable:max-classes-per-file */

before(function () {
    chai.should();
});


describe('Schema', function () {

    it('should register and call methods properly', async function () {
        const testUrl = '/test';
        const readMethod = 'read';
        const writeMethod = 'write';

        const schema = new Schema([readMethod, writeMethod]);

        type TestData = { data: number };

        let store = { data: 0 };

        schema.on(readMethod, testUrl, async () => {
            return store;
        });

        schema.on(writeMethod, testUrl, async (data: any) => {
            store = data;
        });

        await schema.run(readMethod, testUrl).then(result => {
            expect(result.value).to.not.be.undefined;
            expect((result.value as TestData).data).to.equal(0);
        });
        await schema.run(writeMethod, testUrl, { data: 1 });
        await schema.run(readMethod, testUrl).then(result => {
            expect(result.value).to.not.be.undefined;
            expect((result.value as TestData).data).to.equal(1);
        });
    });

    it('should run methods on wildcard urls properly', async function () {
        const readMethod = 'read';
        const schema = new Schema([readMethod]);
        const id = '1234';

        schema.on(readMethod, '/foo/:test_id/bar', async (test_id: string) => {
            expect(test_id).to.equal(id);
        });

        await schema.run(readMethod,'/foo/' + id + '/bar');
    });

    it('should run methods with query parameters properly', async function () {
        const readMethod = 'read';
        const schema = new Schema([readMethod]);
        const id = '1234';
        const q1_value = '5678';
        const q2_value = '0246';

        let function_executed = false;
        schema.on(readMethod, '/foo/:test_id/bar?q1=:q1&q2=:q2', async (test_id: string,q1: string,q2: string) => {
            expect(test_id).to.equal(id);
            expect(q1).to.equal(q1_value);
            expect(q2).to.equal(q2_value);
            function_executed = true;
        });

        await schema.run(readMethod,'/foo/' + id + '/bar?q1=' + q1_value + '&q2=' + q2_value);

        expect(function_executed).to.be.true;
    });

    it('should issue a metric callback on success', async function () {
        const readMethod = 'read';
        const path = '/foo/:test_id/bar';
        const id = '1234';
        let metricCalled = false;
        const schema = new Schema([readMethod], {
            metricFn: (_started: number, _completed: number, _method: string, _path: string, _error: Error | null) => {
                expect(_method).to.equal(readMethod);
                expect(_path).to.equal(path);
                metricCalled = true;
            }
        });

        schema.on(readMethod, path, async (test_id: string) => {test_id;});

        await schema.run(readMethod,'/foo/' + id + '/bar');
        expect(metricCalled).to.be.true;
    });

    it('should issue a metric callback on failure', async function () {
        const readMethod = 'read';
        const path = '/foo/:test_id/bar';
        const id = '1234';
        let metricCalled = false;
        const schema = new Schema([readMethod], {
            metricFn: (_started: number, _completed: number, _method: string, _path: string, _error: Error | null) => {
                expect(_method).to.equal(readMethod);
                expect(_path).to.equal(path);
                metricCalled = true;
            }
        });

        schema.on(readMethod, path, async (test_id: string) => {
            test_id;
            throw new Error("Method failed");
        });

        try {
            await schema.run(readMethod,'/foo/' + id + '/bar');
            throw new Error("Should not happen");
        } catch (err) {
            expect((err as Error).message).to.equal("Method failed");
        }

        expect(metricCalled).to.be.true;
    });

    it('should allow most function signatures', async function () {
        const schema = new Schema(['read']);

        await schema.on('read', '/foo/:a', function (a: string) {a;});
        await schema.on('read', '/foo/:a', function func(a: string) {a;});
        await schema.on('read', '/foo/:a/:b', async function func(a: string,b: string) {a;b;});
        await schema.on('read', '/foo/:a', (a: string) => {a;});
        await schema.on('read', '/foo/:a/:b', async (a: string,b: string) => {a;b;});
    });

    it('should not allow unknown arguments', async function () {
        const schema = new Schema(['read']);
        expect(() => { schema.on('read', '/foo', function func(a: string) {a;}); }).to.throw("Unknown function parameter");
    });

    it('should allow extra arguments', async function () {
        const method = 'emit';
        const origValue = 'bar';
        const valueName = 'value';
        const paramValue = '1234';
        const schema = new Schema([method], { extraArguments: [valueName], errorFilter: (_err: Error) => true });

        let matched = false;
        let called = false;
        await schema.on(method, '/foo/:a', function (value: string, a: string) {
            expect(a).to.equal(paramValue);
            if (value === origValue) matched = true;
            called = true;
        });

        await schema.run(method, '/foo/1234', {}, {}, new Map([[valueName, origValue]]));

        expect(called).to.be.true;
        expect(matched).to.be.true;
    });

    it('should fail calling if a node argument value cannot be found', async function () {
        const method = 'emit';
        const valueName = 'value';
        const schema = new Schema([method], { extraArguments: [valueName], errorFilter: (_err: Error) => true });

        let called = false;
        await schema.on(method, '/foo/:a', function (value: string, a: string) {
            value;a;
            called = true;
        });

        try {
            await schema.run(method, '/foo/1234');
            throw new Error("This should not be called");
        } catch (err) {
            expect((err as Error).message).to.equal("Argument value not found");
        }

        expect(called).to.be.false;
    });

    it('should not allow registering urls on non-existing methods', async function () {
        const schema = new Schema(['a']);

        expect(() => { schema.on('b', '/test') }).to.throw("Unsupported method");
    });

    it('can access context variable', async function () {
        const schema = new Schema(['read']);
        const value = '1234';
        type Context = { value: string };

        schema.on('read', '/foo', function foo(this: Context) {
            expect(this.value).to.equal(value);
        });
        schema.on('read', '/foo2', (context: any) => {
            expect(context.value).to.equal(value);
        });

        await schema.run('read', '/foo', {}, { value });
        await schema.run('read', '/foo2', {}, { value });
    });

    it('cannot access context variable via this on expression statements', async function () {
        const schema = new Schema(['read']);
        const value = '1234';

        schema.on('read', '/foo', () => {
            expect(this.value).to.not.equal(value);
        });

        await schema.run('read', '/foo', {}, { value });
    });

    it('contains path in filter data', async function () {
        const schema = new Schema(['read']);
        const path = '/foo';

        let filter_executed = false;
        class TestFilter extends IFilter {
            async run(data: IFilterData) {
                expect(data.path).to.equal(path);
                filter_executed = true;
            }
        }

        let function_executed = false;
        schema.on('read', path, new TestFilter(), () => {
            expect(filter_executed).to.be.true;
            function_executed = true;
        });

        await schema.run('read', '/foo', {}, {});
        expect(function_executed).to.be.true;
    });

    it('runs filter before calling the function', async function () {
        const schema = new Schema(['read']);

        let filter_executed = false;
        class TestFilter extends IFilter {
            async run(_data: IFilterData) {
                filter_executed = true;
            }
        }

        let function_executed = false;
        schema.on('read', '/foo', new TestFilter(), () => {
            expect(filter_executed).to.be.true;
            function_executed = true;
        });

        await schema.run('read', '/foo', {}, {});
        expect(function_executed).to.be.true;
    });

    it('fails to register method if filter is not inheriting from Filter', async function () {
        const schema = new Schema(['read']);

        expect(() => { schema.on('read', '/foo', () => {}, () => {}); }).to.throw("Not a valid filter");
    });

    it('does not run function if filter rejects', async function () {
        const schema = new Schema(['read']);

        class TestFilter extends IFilter {
            async run(_data: IFilterData) {
                throw new Error("Rejected");
            }
        }

        let function_executed = false;
        schema.on('read', '/foo', new TestFilter(), () => {
            function_executed = true;
        });

        try {
            await schema.run('read', '/foo', {}, {});
            throw new Error("This should not be called");
        } catch (err) {
            expect((err as Error).message).to.equal("Rejected");
        }

        expect(function_executed).to.be.false;
    });

    it('runs second function if first is rejected', async function () {
        const schema = new Schema(['read']);

        class TestFilter extends IFilter {
            async run(_data: IFilterData) {
                throw new Error("Rejected");
            }
        }

        let function1_executed = false;
        let function2_executed = false;
        schema.on('read', '/foo', new TestFilter(), () => {
            function1_executed = true;
        });
        schema.on('read', '/foo', () => {
            function2_executed = true;
        });

        await schema.run('read', '/foo', {}, {});

        expect(function1_executed).to.be.false;
        expect(function2_executed).to.be.true;
    });

    it('won\'t run the second function if first is rejected with a non-filtered error', async function () {
        const schema = new Schema(['read'], {
            extraArguments: [],
            errorFilter: (_err) => false
        });

        class TestFilter extends IFilter {
            async run(_data: IFilterData) {
                throw new Error("Rejected");
            }
        }

        let function1_executed = false;
        let function2_executed = false;
        schema.on('read', '/foo', new TestFilter(), () => {
            function1_executed = true;
        });
        schema.on('read', '/foo', () => {
            function2_executed = true;
        });

        try {
            await schema.run('read', '/foo', {}, {});
            throw new Error("This should not be called");
        } catch (err) {
            expect((err as Error).message).to.equal("Rejected");
        }

        expect(function1_executed).to.be.false;
        expect(function2_executed).to.be.false;
    });

    it('can be resolved early by a filter', async function () {
        const schema = new Schema(['read']);

        class TestFilter extends IFilter {
            async run(data: IFilterData) {
                await data.resolve("test");
            }
        }

        let function_executed = false;
        schema.on('read', '/foo', new TestFilter(), () => {
            function_executed = true;
        });

        const result = await schema.run('read', '/foo', {}, {});

        expect(function_executed).to.be.false;
        expect(result.value).to.equal("test");
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

        expect((await schema.run(method, path)).value).to.equal(testData);
    });

    it('won\'t run filters for the second function if the first one succeeds', async function () {
        const method = 'read';
        const path = '/foo';
        const testData = '1234';

        const schema = new Schema([method]);

        class TestFilter extends IFilter {
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

        expect((await schema.run(method, path)).value).to.equal(testData);
    });

    it('won\'t allow a filter to resolve twice', async function () {
        const method = 'read';
        const path = '/foo';
        const testData = '1234';

        const schema = new Schema([method]);

        class TestFilter extends IFilter {
            async run(data: IFilterData) {
                await data.resolve(testData);
                await data.resolve(testData);
            }
        }

        schema.on(method, path, new TestFilter(), function () {
            return testData;
        });

        try {
            await schema.run(method, path);
            throw new Error("This should not be called");
        } catch (err) {
            expect((err as Error).message).to.equal("on_resolve already called");
        }
    });

    it('won\'t run second filter if first one fails', async function () {
        const method = 'read';
        const path = '/foo';
        const testData = '1234';

        const schema = new Schema([method]);

        let filter1 = false;
        let filter2 = false;
        let func = false;

        class TestFilter1 extends IFilter {
            async run(_data: IFilterData) {
                filter1 = true;
                throw new Error("This should happen");
            }
        }

        class TestFilter2 extends IFilter {
            async run(_data: IFilterData) {
                filter2 = true;
                throw new Error("This should not happen");
            }
        }

        schema.on(method, path, new TestFilter1(), new TestFilter2(), function () {
            func = true;
            return testData;
        });

        try {
            await schema.run(method, path);
            throw new Error("This should not be called");
        } catch (err) {
            expect((err as Error).message).to.equal("This should happen");
        }

        expect(filter1).to.be.true;
        expect(filter2).to.be.false;
        expect(func).to.be.false;
    });

    it('can run resolve callbacks registered by a filter', async function () {
        const schema = new Schema(['read']);
        const testData = "test";
        const testContext = {
            is_context: true
        };

        let callback_executed = false;
        class TestFilter extends IFilter {
            async run(filterData: IFilterData) {
                await filterData.onCompleted(async (err: Error | null, _result: IResult | null, context: any) => {
                    expect(!err).to.be.true;
                    expect(_result!.value).to.equal(testData);
                    expect(context.is_context).to.be.true;
                    callback_executed = true;
                });
            }
        }

        let function_executed = true;
        schema.on('read', '/foo', new TestFilter(), () => {
            function_executed = true;
            return testData;
        });

        const result = await schema.run('read', '/foo', {}, testContext);

        expect(function_executed).to.be.true;
        expect(callback_executed).to.be.true;
        expect(result.value).to.equal(testData);
    });

    it('will execute completion callbacks in reverse order', async function () {
        const schema = new Schema(['read']);
        const testContext = {
            is_context: true
        };

        let count = 0;
        let last = 0;

        class TestFilter1 extends IFilter {
            async run(filterData: IFilterData) {
                await filterData.onCompleted(async (_err: Error | null, _result: IResult | null, _context: any) => {
                    count++;
                    last = 1;
                });
            }
        }

        class TestFilter2 extends IFilter {
            async run(filterData: IFilterData) {
                await filterData.onCompleted(async (_err: Error | null, _result: IResult | null, _context: any) => {
                    count++;
                    last = 2;
                });
            }
        }

        schema.on('read', '/foo', new TestFilter1(), new TestFilter2(), () => {});

        await schema.run('read', '/foo', {}, testContext);

        expect(count).to.equal(2);
        expect(last).to.equal(1);
    });

    it('can retrieve arguments for node', async function () {
        const readMethod = 'read';
        const schema = new Schema([readMethod]);

        schema.on(readMethod, '/test/:value', async () => {});

        const capture = new Map();
        const nodeData = schema.get(readMethod, '/test/1234', capture);
        expect(!!nodeData).to.be.true;
        expect(nodeData!.entries.length).to.equal(1);

        expect(capture.has('value')).to.be.true;
        expect(capture.get('value')).to.equal('1234');
    });

    it('should properly handle filters scheduling execution', async function () {
        const testUrl = '/test';
        const readMethod = 'read';
        const schema = new Schema([readMethod]);

        class QueueFilter extends IFilter {
            _queue: any[] = [];

            async run(data: IFilterData) {
                return new Promise<void>(resolve => {
                    this._queue.push({ data, resolve });
                    if (this._queue.length > 1) {
                        return;
                    }
                    this.pop();
                });
            }

            pop() {
                if (!this._queue.length) {
                    return;
                }

                const entry = this._queue[0];
                entry.data.onCompleted(async (_err: Error | null, _result: IResult | null, _context: any) => {
                    this._queue.shift();
                    this.pop();
                });

                entry.resolve();
            }
        }

        const sleep = async (timeout: number) => new Promise<void>(resolve => setTimeout(resolve, timeout));

        let function_calls = 0;
        schema.on(readMethod, testUrl, new QueueFilter(), async () => {
            await sleep(5);
            function_calls++;
        });

        await Promise.all([
            schema.run(readMethod, testUrl),
            schema.run(readMethod, testUrl),
            schema.run(readMethod, testUrl)
        ]);

        expect(function_calls).to.equal(3);
    });

    it('should properly handle errors while filters scheduling execution', async function () {
        const readMethod = 'read';
        const schema = new Schema([readMethod]);

        class QueueFilter extends IFilter {
            _queue: any[] = [];

            async run(data: IFilterData) {
                return new Promise<void>(resolve => {
                    this._queue.push({ data, resolve });
                    if (this._queue.length > 1) {
                        return;
                    }
                    this.pop();
                });
            }

            pop() {
                if (!this._queue.length) {
                    return;
                }

                const entry = this._queue[0];
                entry.data.onCompleted(async (_err: Error | null, _result: IResult | null, _context: any) => {
                    this._queue.shift();
                    this.pop();
                });

                entry.resolve();
            }
        }

        let function_calls = 0;
        let function_failures = 0;
        schema.on(readMethod, "/test?q=:a", new QueueFilter(), async (q: string) => {
            expect(q).to.equal("1");
            function_calls++;
        });

        await Promise.all([
            schema.run(readMethod, "/test").catch(() => { function_failures++; }),
            schema.run(readMethod, "/test").catch(() => { function_failures++; }),
            schema.run(readMethod, "/test?q=1")
        ]);

        expect(function_calls).to.equal(1);
        expect(function_failures).to.equal(2);
    });


    it('can enumerate filters on nodes', async function () {
        const testUrl = '/test';
        const readMethod = 'read';
        const schema = new Schema([readMethod]);

        class TestFilter extends IFilter {
            async run(_data: IFilterData) {}
        }

        schema.on(readMethod, testUrl, new TestFilter(), async () => {});

        const nodeData = schema.get(readMethod, testUrl);
        expect(!!nodeData).to.be.true;
        expect(nodeData!.entries.length).to.equal(1);

        const entry = nodeData!.entries[0];
        expect(!!entry).to.be.true;
        expect(entry!.filters.length).to.equal(1);

        const filter = entry!.filters[0];
        expect(!!filter).to.be.true;
        expect(filter instanceof TestFilter).to.be.true;
    });

    it('should decode URI components properly for arguments', async function () {
        const readMethod = 'read';
        const schema = new Schema([readMethod]);
        const testValue1 = "ÅÄÖ";
        const testValue2 = "ABC/DEF";

        let function_executed1 = false;
        schema.on(readMethod, '/foo/:value', async (value: string) => {
            expect(value).to.equal(testValue1);
            function_executed1 = true;
        });

        let function_executed2 = false;
        schema.on(readMethod, '/bar/:value', async (value: string) => {
            expect(value).to.equal(testValue2);
            function_executed2 = true;
        });

        await schema.run(readMethod,'/foo/' + encodeURIComponent(testValue1));
        await schema.run(readMethod,'/bar/' + encodeURIComponent(testValue2));

        expect(function_executed1).to.be.true;
        expect(function_executed2).to.be.true;
    });

    it('should handle optional argument with value', async function () {
        const readMethod = 'read';
        const schema = new Schema([readMethod]);
        const q_value = '5678';

        let function_executed = false;
        schema.on(readMethod, '/foo?q=:q', async (q: string) => {
            expect(q).to.equal(q_value);
            function_executed = true;
        });

        await schema.run(readMethod,'/foo?q=' + q_value);

        expect(function_executed).to.be.true;
    });

    it('should handle optional argument without value', async function () {
        const readMethod = 'read';
        const schema = new Schema([readMethod]);

        let function_executed = false;
        schema.on(readMethod, '/foo?q=:q', async (q: string) => {
            expect(q).to.be.undefined;
            function_executed = true;
        });

        await schema.run(readMethod,'/foo');

        expect(function_executed).to.be.true;
    });

    it('should return meta values registered by filters', async function () {
        const schema = new Schema(['read']);
        const path = '/foo';

        class TestFilter extends IFilter {
            async run(data: IFilterData) {
                data.result.addMeta("key", "value");
            }
        }

        schema.on('read', path, new TestFilter(), () => {
            return "bar";
        });

        const result = await schema.run('read', '/foo', {}, {});
        expect(result.value).to.equal("bar");
        expect(result.meta.get("key")).to.equal("value");
    });
});

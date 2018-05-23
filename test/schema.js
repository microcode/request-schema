const { Schema } = require('..');
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
            assert.equal(test_id === id);
        });

        await schema.run(readMethod,'/foo/' + id + '/bar');
    });

    it('should allow most function signatures', async function () {
        const schema = new Schema(['read']);

        schema.on('read', '/foo/:a', function func(a) {});
        schema.on('read', '/foo/:a/:b', async function func(a,b) {});
        schema.on('read', '/foo/:a', (a) => {});
        schema.on('read', '/foo/:a/:b', async (a,b) => {});
    });

    it('should not allow unknown arguments', async function () {
        schema.on('read', '/foo', function func(a) {});
    });

    it('should not allow registering urls on non-existing methods', async function () {
        const schema = new Schema(['a']);

        assert.throws(() => { schema.on('b', '/test') }, Error);
    });
});

import {Result} from "./Result";

import * as chai from "chai";
import "mocha";

const expect = chai.expect;

describe('Result', function () {
    it('should return value passed in', async function () {
        const result = new Result();
        const value = "foo";

        const out = result.withValue(value);
        expect(out.value).to.equal(value);
    });

    it('should carry meta values', async function() {
        const result = new Result();
        const value = "foo";

        const metaKey = "bar";
        const metaValue = "blutti";

        const out = result.addMeta(metaKey, metaValue).withValue(value);

        expect(out.value).to.equal(value);
        expect(Array.from(out.meta.entries())).to.deep.equal([[metaKey, metaValue]]);
    })
});

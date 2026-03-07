import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert'

import { withGoldLapel, init, start, stop, proxyUrl, GoldLapel } from '../index.js'

function mockStart(returnUrl) {
    const calls = []
    async function _start(upstream, opts) {
        calls.push({ upstream, opts })
        return returnUrl
    }
    return { _start, calls }
}

class MockPrismaClient {
    constructor(opts) {
        this._opts = opts
    }
}


describe('withGoldLapel', () => {
    const origUrl = process.env.DATABASE_URL

    beforeEach(() => {
        delete process.env.DATABASE_URL
    })

    afterEach(() => {
        if (origUrl !== undefined) {
            process.env.DATABASE_URL = origUrl
        } else {
            delete process.env.DATABASE_URL
        }
    })

    it('calls start with DATABASE_URL and returns PrismaClient with proxy URL', async () => {
        process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/mydb'
        const { _start, calls } = mockStart('postgresql://user:pass@localhost:7932/mydb')

        const client = await withGoldLapel({ _start, _PrismaClient: MockPrismaClient })

        assert.strictEqual(calls.length, 1)
        assert.strictEqual(calls[0].upstream, 'postgresql://user:pass@host:5432/mydb')
        assert.deepStrictEqual(calls[0].opts, { port: undefined, extraArgs: undefined })
        assert(client instanceof MockPrismaClient)
        assert.strictEqual(client._opts.datasources.db.url, 'postgresql://user:pass@localhost:7932/mydb')
    })

    it('uses explicit url over env', async () => {
        process.env.DATABASE_URL = 'postgresql://env@host:5432/db'
        const { _start, calls } = mockStart('postgresql://user:pass@localhost:7932/mydb')

        await withGoldLapel({
            url: 'postgresql://explicit@host:5432/db',
            _start,
            _PrismaClient: MockPrismaClient,
        })

        assert.strictEqual(calls[0].upstream, 'postgresql://explicit@host:5432/db')
    })

    it('throws when no DATABASE_URL', async () => {
        await assert.rejects(
            () => withGoldLapel({ _start: mockStart('x')._start, _PrismaClient: MockPrismaClient }),
            /DATABASE_URL not set/,
        )
    })

    it('passes port to start', async () => {
        process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/mydb'
        const { _start, calls } = mockStart('postgresql://user:pass@localhost:9000/mydb')

        await withGoldLapel({ port: 9000, _start, _PrismaClient: MockPrismaClient })

        assert.strictEqual(calls[0].opts.port, 9000)
    })

    it('passes extraArgs to start', async () => {
        process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/mydb'
        const { _start, calls } = mockStart('postgresql://user:pass@localhost:7932/mydb')

        await withGoldLapel({
            extraArgs: ['--verbose'],
            _start,
            _PrismaClient: MockPrismaClient,
        })

        assert.deepStrictEqual(calls[0].opts.extraArgs, ['--verbose'])
    })
})


describe('init', () => {
    const origUrl = process.env.DATABASE_URL

    beforeEach(() => {
        delete process.env.DATABASE_URL
    })

    afterEach(() => {
        if (origUrl !== undefined) {
            process.env.DATABASE_URL = origUrl
        } else {
            delete process.env.DATABASE_URL
        }
    })

    it('rewrites process.env.DATABASE_URL to proxy URL', async () => {
        process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/mydb'
        const { _start } = mockStart('postgresql://user:pass@localhost:7932/mydb')

        await init({ _start })

        assert.strictEqual(process.env.DATABASE_URL, 'postgresql://user:pass@localhost:7932/mydb')
    })

    it('uses explicit url over env', async () => {
        process.env.DATABASE_URL = 'postgresql://env@host:5432/db'
        const { _start, calls } = mockStart('postgresql://explicit@localhost:7932/db')

        await init({ url: 'postgresql://explicit@host:5432/db', _start })

        assert.strictEqual(calls[0].upstream, 'postgresql://explicit@host:5432/db')
    })

    it('throws when no DATABASE_URL', async () => {
        await assert.rejects(
            () => init({ _start: mockStart('x')._start }),
            /DATABASE_URL not set/,
        )
    })

    it('returns the proxy URL', async () => {
        process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/mydb'
        const { _start } = mockStart('postgresql://user:pass@localhost:7932/mydb')

        const result = await init({ _start })

        assert.strictEqual(result, 'postgresql://user:pass@localhost:7932/mydb')
    })

    it('passes port to start', async () => {
        process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/mydb'
        const { _start, calls } = mockStart('postgresql://user:pass@localhost:9000/mydb')

        await init({ port: 9000, _start })

        assert.strictEqual(calls[0].opts.port, 9000)
    })
})


describe('re-exports', () => {
    it('re-exports start from goldlapel', () => {
        assert.strictEqual(typeof start, 'function')
    })

    it('re-exports stop from goldlapel', () => {
        assert.strictEqual(typeof stop, 'function')
    })

    it('re-exports proxyUrl from goldlapel', () => {
        assert.strictEqual(typeof proxyUrl, 'function')
    })

    it('re-exports GoldLapel from goldlapel', () => {
        assert.strictEqual(typeof GoldLapel, 'function')
    })
})

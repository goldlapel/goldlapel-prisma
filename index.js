import { start, stop, proxyUrl, GoldLapel, NativeCache } from 'goldlapel'

const DEFAULT_PORT = 7932
const READ_OPS = new Set([
    'findFirst', 'findFirstOrThrow',
    'findUnique', 'findUniqueOrThrow',
    'findMany', 'count', 'aggregate', 'groupBy',
])
const WRITE_OPS = new Set([
    'create', 'createMany', 'createManyAndReturn',
    'update', 'updateMany', 'updateManyAndReturn',
    'upsert', 'delete', 'deleteMany',
])

function makeKey(model, operation, args) {
    try {
        return 'prisma\0' + model + '\0' + operation + '\0' + JSON.stringify(args ?? null)
    } catch {
        return null
    }
}

function modelToTable(model) {
    return model.toLowerCase()
}

export function cacheExtension(options = {}) {
    const port = options.invalidationPort ?? options._invalidationPort ?? (DEFAULT_PORT + 2)
    const cache = options._cache || new NativeCache()
    if (!options._cache && !cache._socket) {
        cache.connectInvalidation(port)
    }

    return {
        name: 'goldlapel-cache',
        query: {
            $allOperations({ model, operation, args, query }) {
                if (!model) return query(args)

                const table = modelToTable(model)

                if (WRITE_OPS.has(operation)) {
                    cache.invalidateTable(table)
                    return query(args)
                }

                if (!READ_OPS.has(operation)) return query(args)

                const key = makeKey(model, operation, args)
                if (key === null) return query(args)

                const entry = cache._cache.get(key)
                if (entry !== undefined && cache._invalidationConnected) {
                    cache._cache.delete(key)
                    cache._cache.set(key, entry)
                    cache.statsHits++
                    return entry.result
                }

                cache.statsMisses++
                return query(args).then((result) => {
                    if (cache._enabled && cache._invalidationConnected) {
                        if (cache._cache.has(key)) {
                            cache._cache.delete(key)
                        } else if (cache._cache.size >= cache._maxEntries) {
                            cache._evictOne()
                        }
                        const tables = new Set([table])
                        cache._cache.set(key, { result, rows: [result], fields: [], tables })
                        let keys = cache._tableIndex.get(table)
                        if (!keys) {
                            keys = new Set()
                            cache._tableIndex.set(table, keys)
                        }
                        keys.add(key)
                    }
                    return result
                })
            },
        },
    }
}

export async function withGoldLapel(options = {}) {
    const url = options.url || process.env.DATABASE_URL
    if (!url) throw new Error('Gold Lapel: DATABASE_URL not set. Pass { url } or set DATABASE_URL.')
    process.env.GOLDLAPEL_CLIENT = 'prisma'
    const startFn = options._start || start
    const proxy = await startFn(url, { config: options.config, port: options.port, extraArgs: options.extraArgs })
    process.env.DATABASE_URL = proxy

    const proxyPort = options.port ?? DEFAULT_PORT
    const invPort = options.config?.invalidationPort ?? (proxyPort + 2)

    const PC = options._PrismaClient || (await import('@prisma/client')).PrismaClient
    const ext = cacheExtension({
        invalidationPort: invPort,
        ...options._cacheOptions,
    })
    return new PC({ datasources: { db: { url: proxy } } }).$extends(ext)
}

export async function init(options = {}) {
    const url = options.url || process.env.DATABASE_URL
    if (!url) throw new Error('Gold Lapel: DATABASE_URL not set. Pass { url } or set DATABASE_URL.')
    process.env.GOLDLAPEL_CLIENT = 'prisma'
    const startFn = options._start || start
    const proxy = await startFn(url, { config: options.config, port: options.port, extraArgs: options.extraArgs })
    process.env.DATABASE_URL = proxy
    return proxy
}

export { start, stop, proxyUrl, GoldLapel, NativeCache }

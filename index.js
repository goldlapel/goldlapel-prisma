import { start, stop, proxyUrl, GoldLapel } from 'goldlapel'

export async function withGoldLapel(options = {}) {
    const url = options.url || process.env.DATABASE_URL
    if (!url) throw new Error('Gold Lapel: DATABASE_URL not set. Pass { url } or set DATABASE_URL.')
    const startFn = options._start || start
    const proxy = await startFn(url, { config: options.config, port: options.port, extraArgs: options.extraArgs })
    process.env.DATABASE_URL = proxy
    const PC = options._PrismaClient || (await import('@prisma/client')).PrismaClient
    return new PC({ datasources: { db: { url: proxy } } })
}

export async function init(options = {}) {
    const url = options.url || process.env.DATABASE_URL
    if (!url) throw new Error('Gold Lapel: DATABASE_URL not set. Pass { url } or set DATABASE_URL.')
    const startFn = options._start || start
    const proxy = await startFn(url, { config: options.config, port: options.port, extraArgs: options.extraArgs })
    process.env.DATABASE_URL = proxy
    return proxy
}

export { start, stop, proxyUrl, GoldLapel }

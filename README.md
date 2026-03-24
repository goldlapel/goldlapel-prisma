# goldlapel-prisma

Gold Lapel plugin for [Prisma](https://www.prisma.io/) — automatic Postgres query optimization with one line of code. Includes L1 native cache — an in-process cache that serves repeated reads in microseconds with no TCP round-trip.

## Install

```bash
npm install goldlapel goldlapel-prisma
```

## Quick start

### Option A: `withGoldLapel()` (Prisma v5/v6)

Returns a wired `PrismaClient` with the connection routed through Gold Lapel and L1 native cache active:

```javascript
import { withGoldLapel } from 'goldlapel-prisma'

const prisma = await withGoldLapel()

const users = await prisma.user.findMany()
```

### Option B: `init()` (all Prisma versions)

Rewrites `DATABASE_URL` to point at the proxy. You construct `PrismaClient` yourself — works with Prisma v5, v6, and v7+:

```javascript
import { init } from 'goldlapel-prisma'

await init()

// Now create PrismaClient as usual — it reads the rewritten DATABASE_URL
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
```

## Prisma v7 note

Prisma v7 removed the `datasources` constructor override. Use `init()` instead of `withGoldLapel()` — it rewrites `process.env.DATABASE_URL` before you create the client.

## Options

Both `withGoldLapel()` and `init()` accept an options object:

| Option | Description |
|--------|-------------|
| `url` | Upstream Postgres URL. Defaults to `process.env.DATABASE_URL`. |
| `port` | Port for the Gold Lapel proxy. Defaults to `7932`. |
| `config` | Configuration object with camelCase keys (see below). |
| `extraArgs` | Array of extra CLI args passed to the Gold Lapel binary. |

```javascript
const prisma = await withGoldLapel({
  url: 'postgresql://user:pass@host:5432/mydb',
  port: 9000,
  config: { mode: 'butler', poolSize: 30, disableN1: true },
})
```

## Re-exports

For convenience, `goldlapel-prisma` re-exports everything from `goldlapel`:

```javascript
import { start, stop, proxyUrl, GoldLapel } from 'goldlapel-prisma'
```

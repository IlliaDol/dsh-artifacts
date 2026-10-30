/**
 * Serve the live gallery. No dependencies, no directory listing.
 *
 * usage: node scripts/serve-gallery.mjs [port]
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..')
const port = Number(process.argv[2] ?? 8777)
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost')
  const relative = decodeURIComponent(url.pathname === '/' ? '/gallery.html' : url.pathname)
  const target = path.join(ROOT, relative)
  if (!target.startsWith(ROOT)) {
    response.writeHead(403).end('forbidden')
    return
  }
  fs.readFile(target, (error, data) => {
    if (error) {
      response.writeHead(404, { 'content-type': 'text/plain' }).end('not found')
      return
    }
    response.writeHead(200, {
      'content-type': TYPES[path.extname(target)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    }).end(data)
  })
})

server.listen(port, '127.0.0.1', () => {
  console.log(`gallery: http://127.0.0.1:${port}/`)
})

import { createServer, request as forward, type IncomingMessage } from 'node:http';
import { connect } from 'node:net';
import type { Duplex } from 'node:stream';

type Route = 'stage' | 'save' | 'resolve' | 'discard' | 'read' | 'recover';
type Boundary = 'before' | 'after' | 'drop-before' | 'drop-after';
type Rule = { route: Route; boundary: Boundary };

function origin(value: string, upstream = false) {
  const url = new URL(value);
  const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
  if (
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    (upstream
      ? url.protocol !== 'http:' || !loopback
      : url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback))
  )
    throw new Error(
      upstream
        ? 'Upstream must be a loopback HTTP origin.'
        : 'Public origin must be HTTPS (loopback HTTP is allowed for isolated tests).',
    );
  return url;
}

/** Transport only: application credentials, authorization and transactions stay intact. */
export async function createManualTransport({
  publicOrigin,
  upstreamOrigin,
  householdId,
  port = 0,
  report = () => {},
}: {
  publicOrigin: string;
  upstreamOrigin: string;
  householdId: string;
  port?: number;
  report?: (event: { phase: string; route?: Route; status?: number }) => void;
}) {
  const publicUrl = origin(publicOrigin);
  const upstream = origin(upstreamOrigin, true);
  if (!/^[\w-]{1,128}$/.test(householdId)) throw new Error('Supply the test household ID.');
  const prefix = `/api/households/${householdId}/`;
  let armed: Rule | undefined;
  let active: Rule | undefined;
  let held: { rule: Rule; release: () => void; drop: () => void } | undefined;
  let closed = false;
  const sockets = new Set<Duplex>();
  function route(request: IncomingMessage): Route | undefined {
    const path = new URL(request.url ?? '/', publicUrl).pathname;
    if (!path.startsWith(prefix)) return;
    const suffix = path.slice(prefix.length);
    if (request.method === 'GET' && suffix === 'map') return 'read';
    if (request.method !== 'POST') return;
    if (suffix === 'map/save') return 'save';
    if (suffix === 'map/resolve-conflict') return 'resolve';
    if (/^map\/(?:discard|discard-proposal)$/.test(suffix)) return 'discard';
    if (
      /^map\/(?:draft|object-form|relationship|relationship-form|object-type|relationship-type)$/.test(
        suffix,
      )
    )
      return 'stage';
    if (/^(?:text-assistant|voice)\/(?:[^/]+\/)?recover$/.test(suffix)) return 'recover';
  }
  function track(socket: Duplex) {
    sockets.add(socket);
    socket.once('close', () => sockets.delete(socket));
    socket.on('error', () => socket.destroy());
  }
  const server = createServer((request, response) => {
    if (request.headers.host !== publicUrl.host) {
      response.writeHead(421).end();
      return;
    }
    const selectedRoute = route(request);
    const selected = !active && armed?.route === selectedRoute ? armed : undefined;
    if (selected) {
      armed = undefined;
      active = selected;
      response.once('close', () => {
        if (active === selected) active = undefined;
        if (held?.rule === selected) held = undefined;
      });
    }
    const dropped = () => {
      response.destroy();
      request.destroy();
      report({ phase: 'dropped', route: selectedRoute });
    };
    if (selected?.boundary === 'drop-before') {
      dropped();
      return;
    }
    function send() {
      if (request.destroyed || closed) return;
      const outgoing = forward(
        upstream,
        {
          method: request.method,
          path: request.url,
          headers: request.headers,
        },
        (incoming) => {
          const status = incoming.statusCode ?? 502;
          if (selected?.boundary === 'after' || selected?.boundary === 'drop-after') {
            const chunks: Buffer[] = [];
            incoming.on('data', (chunk: Buffer) => chunks.push(chunk));
            incoming.once('end', () => {
              report({ phase: 'application-completed', route: selectedRoute, status });
              if (selected.boundary === 'drop-after') {
                dropped();
                return;
              }
              if (response.destroyed || closed) return;
              const deliver = () => {
                if (response.destroyed) return;
                response.writeHead(status, incoming.headers);
                response.end(Buffer.concat(chunks));
              };
              held = { rule: selected, release: deliver, drop: dropped };
              report({ phase: 'held-after', route: selectedRoute, status });
            });
          } else {
            response.writeHead(status, incoming.headers);
            incoming.pipe(response);
          }
          incoming.on('error', () => response.destroy());
        },
      );
      outgoing.on('error', () => {
        if (closed || response.destroyed) return;
        report({ phase: 'upstream-unavailable', route: selectedRoute });
        if (!response.headersSent) response.writeHead(502).end();
        else response.destroy();
      });
      response.once('close', () => {
        if (!response.writableFinished) outgoing.destroy();
      });
      request.pipe(outgoing);
    }
    if (selected?.boundary === 'before') {
      held = { rule: selected, release: send, drop: dropped };
      report({ phase: 'held-before', route: selectedRoute });
    } else send();
  });
  server.on('connection', track);
  server.on('upgrade', (request, socket, head) => {
    if (request.headers.host !== publicUrl.host) {
      socket.end('HTTP/1.1 421 Misdirected Request\r\nConnection: close\r\n\r\n');
      return;
    }
    const destination = connect(
      Number(upstream.port || 80),
      upstream.hostname.replace(/[[\]]/g, ''),
    );
    track(destination);
    destination.once('connect', () => {
      const headers = request.rawHeaders.reduce(
        (all, value, index) => `${all}${index % 2 ? `${value}\r\n` : `${value}: `}`,
        '',
      );
      destination.write(
        `${request.method} ${request.url} HTTP/${request.httpVersion}\r\n${headers}\r\n`,
      );
      if (head.length) destination.write(head);
      socket.pipe(destination).pipe(socket);
    });
    socket.once('close', () => destination.destroy());
    destination.once('close', () => socket.destroy());
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No loopback address.');
  return {
    address: `http://127.0.0.1:${address.port}`,
    command(line: string) {
      const [action, routeName, extra] = line.trim().split(/\s+/);
      if (action === 'status') return { armed, active, held: held?.rule };
      if (action === 'release' || action === 'drop') {
        const current = held;
        held = undefined;
        if (!current) throw new Error('No held request or response.');
        if (action === 'release') current.release();
        else current.drop();
        report({ phase: action, route: current.rule.route });
        return {};
      }
      if (action === 'clear') {
        if (active) throw new Error('Release or drop the active delivery first.');
        armed = undefined;
        return {};
      }
      if (action !== 'arm' || extra || armed || active)
        throw new Error('Use arm ROUTE:BOUNDARY, status, release, drop or clear.');
      const [routeValue, boundaryValue, remainder] = (routeName ?? '').split(':');
      if (
        remainder ||
        !['stage', 'save', 'resolve', 'discard', 'read', 'recover'].includes(routeValue) ||
        !['before', 'after', 'drop-before', 'drop-after'].includes(boundaryValue)
      )
        throw new Error('Unknown route or delivery boundary.');
      armed = { route: routeValue as Route, boundary: boundaryValue as Boundary };
      return { armed };
    },
    async close() {
      closed = true;
      armed = undefined;
      active = undefined;
      held = undefined;
      for (const socket of sockets) socket.destroy();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    },
  };
}

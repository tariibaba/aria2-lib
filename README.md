# aria2-lib

JavaScript library for [Aria2](https://aria2.github.io/). Works in Node.js and the browser.

## Introduction

aria2-lib controls Aria2 via its [JSON-RPC interface](https://aria2.github.io/manual/en/html/aria2c.html#rpc-interface) and features

- Node.js and browser support
- multiple transports
  - [HTTP](https://aria2.github.io/manual/en/html/aria2c.html#rpc-interface)
  - [WebSocket](https://aria2.github.io/manual/en/html/aria2c.html#json-rpc-over-websocket)
- Promise API
- Full typing support (written in TypeScript)

See [Aria2 methods](https://aria2.github.io/manual/en/html/aria2c.html#methods) and [Aria2 notifications](https://aria2.github.io/manual/en/html/aria2c.html#notifications).

## Getting Started

Start Aria2 with RPC, for example:

`aria2c --enable-rpc --rpc-listen-all=true --rpc-allow-origin-all`

### Browser

```sh
npm install aria2-lib
```

```js
import Aria2 from 'aria2-lib';

const aria2 = new Aria2({ WebSocket: ws, fetch: nodefetch, ...options });
```

You can also use `node_modules/aria2-lib/browser/aria2-lib.js` directly in a `<script>` and access the `Aria2` class with `window.Aria2`.

### Node.js

```sh
npm install aria2-lib node-fetch ws
```

```js
import Aria2 from 'aria2-lib';
import ws from 'ws';
import nodefetch from 'node-fetch';

const aria2 = new Aria2({ WebSocket: ws, fetch: nodefetch, ...options });
```

## Usage

The default options match aria2c defaults and are

```javascript
{
  host: 'localhost',
  port: 6800,
  secure: false,
  secret: '',
  path: '/jsonrpc',
}
```

`secret` is optional and refers to [--rpc-secret](https://aria2.github.io/manual/en/html/aria2c.html#cmdoption--rpc-secret). If you define it, it will be added to every call for you.

If the web socket is open (via the [open method](#open)), aria2-lib will use the web socket transport, otherwise the HTTP transport.

The `'aria2.'` prefix can be omitted from both methods and notifications.

### open()

`aria2.open()` opens the WebSocket connection. All subsequent requests will use the WebSocket transport instead of HTTP.

```javascript
aria2
  .open()
  .then(() => console.log('open'))
  .catch((err) => console.log('error', err));
```

### close()

`aria2.close()` closes the WebSocket connection. All subsequent requests will use the HTTP transport instead of WebSocket.

```javascript
aria2
  .close()
  .then(() => console.log('closed'))
  .catch((err) => console.log('error', err));
```

### call()

`aria2.call()` calls a method. Parameters are provided as arguments.

Here's an example using [`addUri`](https://aria2.github.io/manual/en/html/aria2c.html#aria2.addUri) method to download from a magnet link.

```javascript
const magnet =
  'magnet:?xt=urn:btih:88594AAACBDE40EF3E2510C47374EC0AA396C08E&dn=bbb_sunflower_1080p_30fps_normal.mp4&tr=udp%3a%2f%2ftracker.openbittorrent.com%3a80%2fannounce&tr=udp%3a%2f%2ftracker.publicbt.com%3a80%2fannounce&ws=http%3a%2f%2fdistribution.bbb3d.renderfarming.net%2fvideo%2fmp4%2fbbb_sunflower_1080p_30fps_normal.mp4';
const [guid] = await aria2.call('addUri', [magnet], { dir: '/tmp' });
```

### multicall()

`aria2.multicall()` is a helper for [system.multicall](https://aria2.github.io/manual/en/html/aria2c.html#system.multicall). It returns an array of results or throws if any of the call failed.

```javascript
const multicall = [
  [methodA, param1, param2],
  [methodB, param1, param2],
];

const results = await aria2.multicall(multicall);
```

### batch()

`aria2.batch()` is a helper for [batch](https://aria2.github.io/manual/en/html/aria2c.html#system.multicall). It behaves like [multicall()](#multicall) except it returns an array of promises which gives more flexibility in handling errors.

```javascript
const batch = [
  [methodA, param1, param2],
  [methodB, param1, param2],
];

const promises = await aria2.batch(batch);
```

### listNotifications()

`aria2.listNotifications()` is a helper for [system.listNotifications](https://aria2.github.io/manual/en/html/aria2c.html#system.listNotifications). The difference with `aria2.call('listNotifications')` is that it removes the `'aria2.'` prefix from the results.

```javascript
const notifications = await aria2.listNotifications();
/*
[
  'onDownloadStart',
  'onDownloadPause',
  'onDownloadStop',
  'onDownloadComplete',
  'onDownloadError',
  'onBtDownloadComplete'
]
*/

// notifications logger example
notifications.forEach((notification) => {
  aria2.on(notification, (params) => {
    console.log('aria2', notification, params);
  });
});
```

### listMethods()

`aria2.listMethods()` is a helper for [system.listMethods](https://aria2.github.io/manual/en/html/aria2c.html#system.listMethods). The difference with `aria2.call('listMethods')` is that it removes the `'aria2.'` prefix for the results.

```javascript
const methods = await aria2.listMethods();
/*
[ 'addUri',
  [...]
  'system.listNotifications' ]

*/
```

### Events

```javascript
// emitted when the WebSocket is open.
aria2.on('open', () => {
  console.log('aria2 OPEN');
});

// emitted when the WebSocket is closed.
aria2.on('close', () => {
  console.log('aria2 CLOSE');
});

// emitted for every message sent.
aria2.on('output', (m) => {
  console.log('aria2 OUT', m);
});

// emitted for every message received.
aria2.on('input', (m) => {
  console.log('aria2 IN', m);
});
```

Additionally, every [Aria2 notification](https://aria2.github.io/manual/en/html/aria2c.html#notifications) received will be emitted as an event (with and without the `'aria2.'` prefix). This is only available when using a web socket connection, see [open](#open).

```javascript
aria2.on('onDownloadStart', ([guid]) => {
  console.log('aria2 onDownloadStart', guid);
});
```

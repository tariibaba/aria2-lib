import { EventEmitter } from 'events';

import Deferred from './Deferred';
import promiseEvent from './promiseEvent';
import JSONRPCError from './JSONRPCError';

class JSONRPCClient extends EventEmitter {
  deferreds: Record<string, Deferred<any>> = {};
  lastId: number;
  WebSocket: typeof global.WebSocket;
  defaultOptions: JSONRPCClientOptions;
  host: string;
  port: number;
  secure: boolean;
  secret: string;
  path: string;
  fetch: typeof global.fetch;
  socket: WebSocket & {
    send: (data: Parameters<WebSocket['send']>[0], callback: unknown) => void;
  };
  onrequest: (method: string, ...params: any[]) => void;

  constructor(
    options: JSONRPCClientOptions & {
      WebSocket: typeof global.WebSocket;
      fetch: typeof global.fetch;
    }
  ) {
    super();
    this.deferreds = {};
    this.lastId = 0;
    this.defaultOptions = this.constructor['defaultOptions'];

    Object.assign(
      this,
      { WebSocket: global?.WebSocket, fetch: global?.fetch?.bind(this) },
      this.defaultOptions,
      options
    );
  }

  id(): number {
    return this.lastId++;
  }

  url(protocol): string {
    return (
      protocol +
      (this.secure ? 's' : '') +
      '://' +
      this.host +
      ':' +
      this.port +
      this.path
    );
  }

  websocket(message) {
    return new Promise<void>((resolve, reject) => {
      const cb = (err?: unknown) => {
        if (err) reject(err);
        else resolve();
      };
      this.socket.send(JSON.stringify(message), cb);

      if (this.WebSocket && this.socket instanceof this.WebSocket) cb();
    });
  }

  async http(message) {
    const response = await this.fetch(this.url('http'), {
      method: 'POST',
      body: JSON.stringify(message),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    response
      .json()
      .then((msg) => this._onmessage(msg))
      .catch((err) => {
        this.emit('error', err);
      });

    return response;
  }

  _buildMessage(method: string, params: unknown[]) {
    if (typeof method !== 'string') {
      throw new TypeError(method + ' is not a string');
    }

    const message = {
      method,
      'json-rpc': '2.0',
      id: this.id(),
    };

    if (params) Object.assign(message, { params });
    return message;
  }

  async batch(calls: unknown[][]): Promise<Promise<unknown>[]> {
    const message = calls.map(([method, ...params]) => {
      return this._buildMessage(method as string, params);
    });

    await this._send(message);

    return message.map(({ id }) => {
      const { promise } = (this.deferreds[id] = new Deferred<unknown>());
      return promise;
    });
  }

  async call(method: string, parameters: unknown[]): Promise<unknown> {
    const message = this._buildMessage(method, parameters);
    await this._send(message);
    const { promise } = (this.deferreds[message.id] = new Deferred<unknown>());
    return promise;
  }

  async _send(message) {
    this.emit('output', message);
    const { socket } = this;
    return socket && socket.readyState === 1
      ? this.websocket(message)
      : this.http(message);
  }

  _onresponse({ id, error, result }) {
    const deferred = this.deferreds[id];
    if (!deferred) return;
    if (error) deferred.reject(new JSONRPCError(error));
    else deferred.resolve(result);
    delete this.deferreds[id];
  }

  _onrequest({ method, params }) {
    return this.onrequest(method, params);
  }

  _onnotification({ method, params }) {
    this.emit(method, params);
  }

  _onmessage(message) {
    this.emit('input', message);

    if (Array.isArray(message)) {
      for (const object of message) {
        this._onobject(object);
      }
    } else {
      this._onobject(message);
    }
  }

  _onobject(message) {
    if (message.method === undefined) this._onresponse(message);
    else if (message.id === undefined) this._onnotification(message);
    else this._onrequest(message);
  }

  async open() {
    const socket = (this.socket = new this.WebSocket(this.url('ws')));

    socket.onclose = (...args) => {
      this.emit('close', ...args);
    };
    socket.onmessage = (event) => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch (err) {
        this.emit('error', err);
        return;
      }
      this._onmessage(message);
    };
    socket.onopen = (...args) => {
      this.emit('open', ...args);
    };
    socket.onerror = (...args) => {
      this.emit('error', ...args);
    };

    return promiseEvent(this, 'open');
  }

  async close() {
    const { socket } = this;
    socket.close();
    return promiseEvent(this, 'close');
  }

  static defaultOptions: JSONRPCClientOptions = {
    secure: false,
    host: 'localhost',
    port: 80,
    secret: '',
    path: '/jsonrpc',
  };
}

export default JSONRPCClient;

export type JSONRPCClientOptions = {
  secure?: boolean;
  host?: string;
  port?: number;
  secret?: string;
  path?: string;
};

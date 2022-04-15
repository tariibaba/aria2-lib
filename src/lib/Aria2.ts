import JSONRPCClient from './JSONRPCClient';

function prefix(str: string): string {
  if (!str.startsWith('system.') && !str.startsWith('aria2.')) {
    str = 'aria2.' + str;
  }
  return str;
}

function unprefix(str: string): string {
  const suffix = str.split('aria2.')[1];
  return suffix || str;
}

class Aria2 extends JSONRPCClient {
  addSecret(parameters: unknown[]): unknown[] {
    let params = this.secret ? ['token:' + this.secret] : [];
    if (Array.isArray(parameters)) {
      params = params.concat(parameters);
    }
    return params;
  }

  _onnotification(notification) {
    const { method, params } = notification;
    const event = unprefix(method);
    if (event !== method) this.emit(event, params);
    return super._onnotification(notification);
  }

  async call(method, ...params: unknown[]) {
    return super.call(prefix(method), this.addSecret(params));
  }

  async multicall(calls): Promise<unknown> {
    const multi = [
      calls.map(([method, ...params]) => {
        return { methodName: prefix(method), params: this.addSecret(params) };
      }),
    ];
    return super.call('system.multicall', multi);
  }

  async batch(calls) {
    return super.batch(
      calls.map(([method, ...params]) => [
        prefix(method),
        this.addSecret(params),
      ])
    );
  }

  async listNotifications(): Promise<string[]> {
    const events = (await this.call('system.listNotifications')) as string[];
    return events.map((event) => unprefix(event));
  }

  async listMethods(): Promise<string[]> {
    const methods = (await this.call('system.listMethods')) as string[];
    return methods.map((method) => unprefix(method));
  }
}

Object.assign(Aria2, { prefix, unprefix });

Aria2.defaultOptions = Object.assign({}, JSONRPCClient.defaultOptions, {
  secure: false,
  host: 'localhost',
  port: 6800,
  secret: '',
  path: '/jsonrpc',
});

export default Aria2;

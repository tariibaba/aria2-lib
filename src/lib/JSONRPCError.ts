export default class JSONRPCError extends Error {
  code: unknown;
  data: unknown;

  constructor(options: JSONRPCErrorOptions) {
    const { message, code, data } = options;
    super(message);
    this.code = code;
    if (data) this.data = data;
    this.name = this.constructor.name;
  }
}

type JSONRPCErrorOptions = {
  message: string;
  code: unknown;
  data: unknown;
};

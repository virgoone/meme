declare module '*dist/server/server.js' {
  const server: {
    fetch(request: Request, env?: unknown, ctx?: ExecutionContext): Promise<Response>;
  };

  export default server;
}

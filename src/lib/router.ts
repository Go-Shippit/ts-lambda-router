import { Static, TSchema } from '@sinclair/typebox';
import { APIGatewayProxyEventV2, Context } from 'aws-lambda';

import { Request } from './types';

type HTTPRead = 'get' | 'head' | 'options';
type HTTPWrite = 'delete' | 'post' | 'put';
type HTTPMethod = HTTPRead | HTTPWrite;

interface RequestContext {
  context: Context;
  originalEvent: APIGatewayProxyEventV2;
}

interface RouteHandler {
  url: string;
  method: string;
  bodyOrQueryParamsSchema?: TSchema;
  handler: (
    req: {
      body: any;
      pathParams: any;
      queryParams: any;
      response: (statusCode: number, body: any, handlers?: Record<string, string>) => Promise<Response>;
    },
    requestContext: RequestContext
  ) => Promise<Response>;
}

export interface RouteHandlers {
  handlers: RouteHandler[];
}

type HttpMethod<M extends HTTPMethod> = <URL extends string, S extends TSchema = never>(
  url: URL,
  bodyOrQueryParamsConfig?: S
) => (
  handler: (
    req: Request<URL, M extends HTTPRead ? true : false, Static<S>>,
    requestContext: RequestContext
  ) => Promise<Response>
) => Router;

export type Router = RouteHandlers & {
  get: HttpMethod<'get'>;
  head: HttpMethod<'head'>;
  options: HttpMethod<'options'>;
  post: HttpMethod<'post'>;
  put: HttpMethod<'put'>;
  delete: HttpMethod<'delete'>;
};

export interface Response {
  statusCode: number;
  body: any;
  headers?: Record<string, string>;
}

export function router(handlers: RouteHandler[] = []): Router {
  const buildHandler =
    <M extends HTTPMethod>(method: M): HttpMethod<M> =>
    <B extends TSchema>(url: string, bodyOrQueryParamsSchema?: B) =>
    handler =>
      router([
        {
          url,
          method,
          bodyOrQueryParamsSchema,
          handler,
        },
        ...handlers,
      ]);

  return {
    handlers,
    get: buildHandler('get'),
    head: buildHandler('head'),
    options: buildHandler('options'),
    post: buildHandler('post'),
    put: buildHandler('put'),
    delete: buildHandler('delete'),
  };
}

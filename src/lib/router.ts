import { Static, TSchema } from '@sinclair/typebox';
import { APIGatewayProxyEventV2, Context } from 'aws-lambda';

import { Request } from './types';

interface Test {
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
    apiParams: Test
  ) => Promise<Response>;
}

export interface RouteHandlers {
  handlers: RouteHandler[];
}

type HttpMethod = <A extends string, B extends TSchema = never>(
  url: A,
  bodyOrQueryParamsConfig?: B
) => (handler: (req: Request<A, Static<B>>, apiParams: Test) => Promise<Response>) => Router;

export type Router = RouteHandlers & {
  get: HttpMethod;
  head: HttpMethod;
  options: HttpMethod;
  post: HttpMethod;
  put: HttpMethod;
  delete: HttpMethod;
};

export interface Response {
  statusCode: number;
  body: any;
  headers?: Record<string, string>;
}

export function router(handlers: RouteHandler[] = []): Router {
  const buildHandler =
    (method: 'delete' | 'get' | 'head' | 'options' | 'post' | 'put'): HttpMethod =>
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

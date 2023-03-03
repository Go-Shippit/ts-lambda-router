import { Static, TSchema } from '@sinclair/typebox';
import { APIGatewayProxyEventV2, Context } from 'aws-lambda';

import { Request } from './types';

interface RouteHandler {
  url: string;
  method: string;
  body?: TSchema;
  handler: (
    req: {
      body: any;
      pathParams: any;
      queryParams: any;
      response: (statusCode: number, body: any, handlers?: Record<string, string>) => Promise<Response>;
    },
    apiParams: {
      context: Context;
      originalEvent: APIGatewayProxyEventV2;
    }
  ) => Promise<Response>;
}

export interface RouteHandlers {
  handlers: readonly RouteHandler[];
}

type HttpMethod<R> = <A extends string, B extends TSchema = never>(
  path: A,
  bodyOrQueryParamsConfig?: B
) => (
  handler: (
    req: Request<A, Static<B>>,
    apiParams: { context: Context; originalEvent: APIGatewayProxyEventV2 }
  ) => Promise<Response>
) => Router<R>;

export type Router<R> = R & {
  get: HttpMethod<R>;
  head: HttpMethod<R>;
  options: HttpMethod<R>;
  post: HttpMethod<R>;
  put: HttpMethod<R>;
  delete: HttpMethod<R>;
};

export type Response = {
  statusCode: number;
  body: unknown;
  headers?: Record<string, string>;
};

export function router(handlers: RouteHandler[] = []): Router<RouteHandlers> {
  const buildHandler =
    (method: 'delete' | 'get' | 'head' | 'options' | 'post' | 'put'): HttpMethod<RouteHandlers> =>
    <B extends TSchema>(url: string, bodyOrQueryParamsSchema?: B) =>
    handler => {
      const isReadOnlyMethod = ['get', 'options', 'head'].includes(method);

      return router([
        {
          url,
          method,
          body: isReadOnlyMethod ? undefined : bodyOrQueryParamsSchema,
          handler,
        },
        ...handlers,
      ]);
    };

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

import { Static, TAny, TSchema, Type } from '@sinclair/typebox';
import { APIGatewayProxyEventV2, Context } from 'aws-lambda';

import { ExtractSchema, Request } from './types';

interface RouteConfig<R extends Responses> {
  responsesSchema?: R;
}

interface RouteHandler {
  url: string;
  method: string;
  body?: TSchema;
  responses: Responses;
  handler: (
    req: {
      body: any;
      pathParams: any;
      queryParams: any;
      response: (statusCode: number, body: any, handlers?: Record<string, string>) => Promise<Response<any, any>>;
    },
    apiParams: {
      context: Context;
      originalEvent: APIGatewayProxyEventV2;
    }
  ) => Promise<Response<any, any>>;
}

export interface RouteHandlers {
  handlers: readonly RouteHandler[];
}

type HttpMethod<R> = <
  A extends string,
  S extends number,
  B extends TSchema = never,
  Resp extends Responses = Record<number, TAny>
>(
  path: A,
  bodyOrQueryParamsConfig?: B,
  routeConfig?: RouteConfig<Resp>
) => (
  handler: (
    req: Request<A, Static<B>, Resp>,
    apiParams: { context: Context; originalEvent: APIGatewayProxyEventV2 }
  ) => Promise<Response<Resp, S>>
) => Router<R>;

export type Router<R> = R & {
  get: HttpMethod<R>;
  head: HttpMethod<R>;
  options: HttpMethod<R>;
  post: HttpMethod<R>;
  put: HttpMethod<R>;
  delete: HttpMethod<R>;
};

type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = {
  [K in Keys]-?: Partial<Pick<T, Exclude<Keys, K>>> & Required<Pick<T, K>>;
}[Keys] &
  Pick<T, Exclude<keyof T, Keys>>;
export type Responses = RequireAtLeastOne<{ [k in number]: TSchema }>;

export type Response<R extends Responses, Status extends number> = {
  statusCode: Status;
  body: Status extends keyof R ? ExtractSchema<R[Status]> : any;
  headers?: Record<string, string>;
};

export function router(handlers: readonly RouteHandler[] = []): Router<RouteHandlers> {
  const buildHandler =
    (method: 'delete' | 'get' | 'head' | 'options' | 'post' | 'put'): HttpMethod<RouteHandlers> =>
    <B extends TSchema, R extends Responses = Record<number, TAny>>(
      path: string,
      bodyOrQueryParamsSchema?: B,
      routeConfig?: RouteConfig<R>
    ) =>
    handler => {
      const isReadOnlyMethod = ['get', 'options', 'head'].includes(method);

      return router([
        {
          url: path,
          method,
          body: isReadOnlyMethod ? undefined : bodyOrQueryParamsSchema,
          handler,
          responses: routeConfig?.responsesSchema || {
            200: Type.Any({ message: 'OK' }),
          },
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

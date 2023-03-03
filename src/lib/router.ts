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

type HttpMethod<R, M extends HTTPMethod> = <
  A extends string,
  S extends StatusCode,
  B extends TSchema = never,
  Resp extends Responses = AnyType
>(
  path: A,
  bodyOrQueryParamsConfig?: B,
  routeConfig?: RouteConfig<Resp>
) => (
  handler: (
    req: Request<A, Static<B>, Resp>,
    originalEvent: { context: Context; originalEvent: APIGatewayProxyEventV2 }
  ) => Promise<Response<Resp, S>>
) => Router<R>;

export type Router<R> = R & {
  get: HttpMethod<R, 'get'>;
  head: HttpMethod<R, 'head'>;
  options: HttpMethod<R, 'options'>;
  post: HttpMethod<R, 'post'>;
  put: HttpMethod<R, 'put'>;
  delete: HttpMethod<R, 'delete'>;
};

type HTTPRead = 'get' | 'head' | 'options';
type HTTPWrite = 'delete' | 'post' | 'put';
type HTTPMethod = HTTPRead | HTTPWrite;

type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = {
  [K in Keys]-?: Partial<Pick<T, Exclude<Keys, K>>> & Required<Pick<T, K>>;
}[Keys] &
  Pick<T, Exclude<keyof T, Keys>>;
export type Responses = RequireAtLeastOne<{ [k in StatusCode]: TSchema }>;

export type Response<R extends Responses, Status extends StatusCode> = {
  statusCode: Status;
  headers?: {
    [header: string]: boolean | number | string;
  };
  body: Status extends keyof R ? ExtractSchema<R[Status]> : any;
};

const StatusCodes = [
  200, 201, 202, 203, 204, 205, 206, 207, 208, 226, 300, 301, 302, 303, 304, 305, 306, 307, 308, 400, 401, 402, 403,
  404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417, 418, 420, 422, 423, 424, 425, 426, 428, 429,
  431, 444, 449, 450, 451, 499, 500, 501, 502, 503, 504, 505, 506, 507, 508, 509, 510, 511, 598, 599,
] as const;
export type StatusCode = (typeof StatusCodes)[number] & number;
export type AnyType = Record<StatusCode, TAny>;
const DefaultResponses = {
  200: Type.Any({
    description: 'OK',
  }),
};

export function router(handlers: readonly RouteHandler[] = []): Router<RouteHandlers> {
  const buildHandler =
    <M extends HTTPMethod>(method: M): HttpMethod<RouteHandlers, M> =>
    <A extends string, B extends TSchema, S extends StatusCode, R extends Responses = AnyType>(
      path: A,
      bodyOrQueryParamsSchema?: B,
      routeConfig?: RouteConfig<R>
    ) =>
    (
      handler: (
        req: Request<A, Static<B>, R>,
        originalEvent: { context: Context; originalEvent: APIGatewayProxyEventV2 }
      ) => Promise<Response<R, S>>
    ) => {
      const isReadOnlyMethod = ['get', 'options', 'head'].includes(method);

      return router([
        {
          url: path,
          method,
          body: isReadOnlyMethod ? undefined : bodyOrQueryParamsSchema,
          handler,
          responses: routeConfig?.responsesSchema || DefaultResponses,
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

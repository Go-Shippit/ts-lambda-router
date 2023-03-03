/* eslint-disable @typescript-eslint/ban-types */

import { Static, TSchema } from '@sinclair/typebox';
import { APIGatewayProxyHandler, APIGatewayProxyHandlerV2 } from 'aws-lambda';

import { PathParamParser, PathParamParsers } from './path-param-parser';
import { Responses, Response, StatusCode } from './router';

export type Logger = {
  info: (msg: string, metadata?: object) => void;
};

export type CorsConfig = {
  allowCredentials: boolean;
  allowHeaders: string[] | '*';
  allowMethods: string[] | '*';
  allowOrigin: string[] | string;
};

export type RouterConfig = {
  corsConfig?: CorsConfig | true;
  defaultHeaders?: Record<string, string>;
  logger?: Logger;
  logConfig?: {
    logger?: Logger;
    ignoredHeaders?: string[];
    logRequestBody?: boolean;
    logRequests?: boolean;
    logResponseBody?: boolean;
    logResponses?: boolean;
  };
};

export type APIGatewayVersion = 'V1' | 'V2';

export type VersionedHandlerType<V extends APIGatewayVersion> = V extends 'V1'
  ? APIGatewayProxyHandler
  : APIGatewayProxyHandlerV2;

/* eslint-disable @typescript-eslint/no-unused-vars */
type _<T> = T;
export type Merge<T> = _<{ [k in keyof T]: T[k] }>;
export type Trim<T> = T extends `/${infer Rest}${'' | '/'}` ? Trim<Rest> : T;

type TypeOfParser<T> = T extends PathParamParser<infer A> ? A : never;
type ParserType<T extends keyof PathParamParsers> = TypeOfParser<PathParamParsers[T]>;

type PathParam<S extends string> = S extends `${infer Var}:${infer VarType}`
  ? VarType extends keyof PathParamParsers
    ? { readonly [key in Var]: ParserType<VarType> }
    : never
  : S extends `${infer Var}`
  ? { readonly [key in Var]: string }
  : never;

type PathParams<A extends string, Seed = {}> = A extends `{${infer AA}}${infer Tail}`
  ? Merge<PathParam<AA> & PathParams<Tail> & Seed>
  : A extends `${infer _}{${infer AA}}${infer Tail}`
  ? Merge<PathParam<AA> & PathParams<Tail> & Seed>
  : A extends `${infer _}{${infer AA}}`
  ? Merge<PathParam<AA> & Seed>
  : Seed;

type UrlParam<S extends string, P = string> = S extends `${infer Var}:${infer VarType}`
  ? VarType extends keyof PathParamParsers
    ? UrlParam<Var, ParserType<VarType>>
    : never
  : S extends `${infer Var}?`
  ? { readonly [key in Var]?: P }
  : S extends `${infer Var}`
  ? { readonly [key in Var]: P }
  : never;

type QueryParams<A extends string, Seed = {}> = A extends `{${infer AA}}${infer Tail}`
  ? Merge<QueryParams<Tail> & Seed & UrlParam<AA>>
  : Seed;

export type ExtractSchema<T> = T extends TSchema ? Static<T> : any;

export type Request<Url extends string, Body, R extends Responses> = {
  pathParams: Url extends `${infer P}?${infer _}` ? PathParams<P> : PathParams<Url>;
  queryParams: Url extends `${infer _}?${infer Q}` ? QueryParams<Q> : never;
  body: Body;
  response: <S extends StatusCode>(
    s: S,
    body: S extends keyof R ? ExtractSchema<R[S]> : any,
    headers?: Record<string, string>
  ) => Promise<Response<R, S>>;
};

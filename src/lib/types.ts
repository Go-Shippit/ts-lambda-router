/* eslint-disable @typescript-eslint/ban-types */

import { Static, TSchema } from '@sinclair/typebox';

import { PathParamParser, PathParamParsers } from './path-param-parser';
import { Responses, Response, StatusCode } from './router';

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

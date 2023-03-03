/* eslint-disable @typescript-eslint/ban-types, @typescript-eslint/no-unused-vars */

import { PathParamParser, PathParamParsers } from './path-param-parser';
import { Response } from './router';

type _<T> = T;
export type Merge<T> = _<{ [k in keyof T]: T[k] }>;

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

export type Request<Url extends string, IsReadOnlyHttpMethod extends boolean, Schema> = {
  body: IsReadOnlyHttpMethod extends false ? Schema : never;
  pathParams: Url extends `${infer P}?${infer _}` ? PathParams<P> : PathParams<Url>;
  queryParams: IsReadOnlyHttpMethod extends true ? Schema : never;
  response: (s: number, body: unknown, headers?: Record<string, string>) => Promise<Response>;
};

import { Type } from '@sinclair/typebox';
import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

import { LambdaRouter } from './lambda-router';

describe('ApiHandler', () => {
  const testHandler =
    (h: APIGatewayProxyHandlerV2) =>
    (event: Partial<APIGatewayProxyEventV2>): Promise<APIGatewayProxyStructuredResultV2> =>
      h(event as any as APIGatewayProxyEventV2, null as any, null as any) as any;

  it('handles the root route', async () => {
    const handler = LambdaRouter.build(r => r.get('/')(r => r.response(200, 'Ok')));

    const result = await testHandler(handler)({
      rawPath: '/',
      body: '',
      requestContext: {
        http: {
          method: 'get',
        },
      } as any,
    });

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body as string)).toBe('Ok');
  });

  it('returns a 404 for an unknown route', async () => {
    const handler = LambdaRouter.build(r => r.get('/')(r => r.response(200, 'OK')));

    const result = await testHandler(handler)({
      rawPath: '/hello',
      body: '',
      requestContext: {
        http: {
          method: 'get',
        },
      } as any,
    });

    expect(result.statusCode).toBe(404);
  });

  it('casts URL params for "GET" route', async () => {
    const handler = LambdaRouter.build(r => r.get('/name/{name}/age/{age:int}')(r => r.response(200, r.pathParams)));

    const result = await testHandler(handler)({
      rawPath: '/name/john/age/30',
      body: '',
      requestContext: {
        http: {
          method: 'get',
        },
      } as any,
    });

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body as string)).toStrictEqual({ name: 'john', age: 30 });
  });

  it('casts URL params for "POST" route', async () => {
    const handler = LambdaRouter.build(r =>
      r.post(
        '/name/{name}/age/{age:int}',
        Type.Object({
          creditCardNumber: Type.String(),
        })
      )(r => r.response(200, { ...r.pathParams, ...r.body }))
    );

    const result = await testHandler(handler)({
      rawPath: '/name/john/age/30',
      body: JSON.stringify({ creditCardNumber: '1234 5678 8765 4321' }),
      requestContext: {
        http: {
          method: 'post',
        },
      } as any,
    });

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body as string)).toStrictEqual({
      name: 'john',
      age: 30,
      creditCardNumber: '1234 5678 8765 4321',
    });
  });

  it('returns a 400 when invalid body', async () => {
    const handler = LambdaRouter.build(r =>
      r
        .get('/name/{name}/age/{age:int}')(r => r.response(200, r.pathParams))
        .post(
          '/name/{name}/age/{age:int}',
          Type.Object({
            creditCardNumber: Type.String(),
          })
        )(r => r.response(200, { ...r.pathParams, ...r.body }))
    );

    const result = await testHandler(handler)({
      rawPath: '/name/john/age/30',
      body: JSON.stringify({ creditCard: '1234 5678 8765 4321' }),
      requestContext: {
        http: {
          method: 'post',
        },
      } as any,
    });

    expect(result.statusCode).toBe(400);
  });

  it('returns a 400 for poorly formatted URL', async () => {
    const handler = LambdaRouter.build(r => r.get('/name/{name}/age/{age:int}')(r => r.response(200, r.pathParams)));

    const result = await testHandler(handler)({
      rawPath: '/name/john/age/afd',
      body: '',
      requestContext: {
        http: {
          method: 'get',
        },
      } as any,
    });

    expect(result.statusCode).toBe(400);
  });

  it('casts query parameters', async () => {
    const handler = LambdaRouter.build(routes =>
      routes.get(
        '/name/{name}/age/{age:int}',
        Type.Object({ gender: Type.String() })
      )(r => r.response(200, { ...r.pathParams, ...r.queryParams }))
    );

    const result = await testHandler(handler)({
      rawPath: '/name/john/age/30',
      body: '',
      rawQueryString: 'gender=male',
      requestContext: {
        http: {
          method: 'get',
        },
      } as any,
    });

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body as string)).toStrictEqual({
      name: 'john',
      age: 30,
      gender: 'male',
    });
  });

  it('ignores the optional query parameter if it is not provided', async () => {
    const handler = LambdaRouter.build(routes =>
      routes.get(
        '/name/{name}/age/{age:int}',
        Type.Object({ gender: Type.Optional(Type.String()) })
      )(r => r.response(200, { ...r.pathParams, ...r.queryParams, ...r.body }))
    );

    const result = await testHandler(handler)({
      rawPath: '/name/john/age/30',
      body: '',
      requestContext: {
        http: {
          method: 'get',
        },
      } as any,
    });

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body as string)).toStrictEqual({
      name: 'john',
      age: 30,
    });
  });

  it('ignores the optional query param when combined with required ones', async () => {
    const handler = LambdaRouter.build(routes =>
      routes.get(
        '/name/{name}/age/{age:int}',
        Type.Object({ gender: Type.String(), height: Type.Optional(Type.String()) })
      )(r => r.response(200, { ...r.pathParams, ...r.queryParams }))
    );

    const result = await testHandler(handler)({
      rawPath: '/name/john/age/30',
      body: '',
      rawQueryString: 'gender=male',
      requestContext: {
        http: {
          method: 'get',
        },
      } as any,
    });

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body as string)).toStrictEqual({
      name: 'john',
      age: 30,
      gender: 'male',
    });
  });

  it('returns a 400 when a required query parameter is not provided', async () => {
    const handler = LambdaRouter.build(routes =>
      routes.get(
        '/name/{name}/age/{age:int}',
        Type.Object({ gender: Type.String(), height: Type.Optional(Type.String()) })
      )(r => r.response(200, { ...r.pathParams, ...r.queryParams }))
    );

    const result = await testHandler(handler)({
      rawPath: '/name/john/age/30',
      body: '',
      rawQueryString: 'height=166',
      requestContext: {
        http: {
          method: 'get',
        },
      } as any,
    });

    expect(result.statusCode).toBe(400);
  });

  it('handles array-like values', async () => {
    const handler = LambdaRouter.build(routes =>
      routes.get('/people', Type.Object({ ids: Type.Array(Type.String()) }))(r => r.response(200, r.queryParams))
    );

    const result = await testHandler(handler)({
      rawPath: '/people',
      body: '',
      rawQueryString: 'ids[]=1&ids[]=2',
      requestContext: {
        http: {
          method: 'get',
        },
      } as any,
    });

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body as string)).toStrictEqual({
      ids: ['1', '2'],
    });
  });
});

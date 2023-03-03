import Ajv from 'ajv';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import * as FP from 'fp-ts';
import { isLeft } from 'fp-ts/lib/These';

import { parsePathParams, parseQueryParams, PathParamRegex } from './path-param-parser';
import { response } from './response';
import { RouteHandlers } from './router';

const ajv = new Ajv({ strict: false });

export const handler: (routes: RouteHandlers) => APIGatewayProxyHandlerV2 =
  ({ handlers }) =>
  (event, ctx) => {
    const route = handlers
      .filter(h => event.requestContext.http.method.toLowerCase() === h.method.toLowerCase())
      .filter(h => {
        const handlerSegments = h.url.split('?')[0].split('/');
        const routeSegments = event.rawPath.split('?')[0].split('/');

        return (
          handlerSegments.length === routeSegments.length &&
          handlerSegments.every((hs, ix) => hs === routeSegments[ix] || PathParamRegex.test(hs))
        );
      })[0];

    if (route) {
      const path = route.url.split('?')[0];
      const query = event.rawQueryString;
      const pathParams = parsePathParams(decodeURIComponent(event.rawPath), path);
      const queryParams = event.queryStringParameters
        ? parseQueryParams(event.queryStringParameters || {}, {}, query)
        : FP.either.right({});
      const bodyObj = event.body ? JSON.parse(event.body) : null;
      const isValidBody = route.body ? ajv.validate(route.body, bodyObj) : true;

      if (isValidBody) {
        const tupled = FP.function.pipe(
          pathParams,
          FP.either.chain(p =>
            FP.function.pipe(
              queryParams,
              FP.either.map(qp => [p, qp] as const)
            )
          )
        );
        if (FP.either.isRight(tupled)) {
          return route
            .handler(
              {
                pathParams: tupled.right[0],
                queryParams: tupled.right[1],
                body: bodyObj,
                response: (sc, bod, h) =>
                  Promise.resolve({
                    statusCode: sc,
                    body: bod,
                    headers: h,
                  }),
              },
              {
                originalEvent: event,
                context: ctx,
              }
            )
            .then(r => ({
              statusCode: r.statusCode,
              body: r.body ? JSON.stringify(r.body) : '',
              headers: {
                ...{ 'content-type': 'application/json' },
                ...r.headers,
              },
            }));
        }

        return Promise.resolve(
          response(isLeft(pathParams) || isLeft(queryParams) ? 400 : 404, {
            message: isLeft(pathParams) || isLeft(queryParams) ? 'Bad Request' : 'Not Found',
          })
        );
      }

      return Promise.resolve(response(422, { message: 'Schema Invalid.' }));
    }

    return Promise.resolve(response(404, { message: 'Not found' }));
  };

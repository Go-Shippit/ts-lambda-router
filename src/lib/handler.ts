import Ajv from 'ajv';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import qs from 'qs';

import { parsePathParams, PathParamRegex } from './path-param-parser';
import { RouteHandlers } from './router';
import { isReadOnlyMethod, response } from './utils';

const ajv = new Ajv({ strict: false });

export const handler: (routes: RouteHandlers) => APIGatewayProxyHandlerV2 =
  ({ handlers }) =>
  (event, context) => {
    const httpMethod = event.requestContext.http.method.toLowerCase();

    const route = handlers
      .filter(h => httpMethod === h.method.toLowerCase())
      .filter(h => {
        const handlerSegments = h.url.split('?')[0].split('/');
        const routeSegments = event.rawPath.split('?')[0].split('/');

        return (
          handlerSegments.length === routeSegments.length &&
          handlerSegments.every((hs, ix) => hs === routeSegments[ix] || PathParamRegex.test(hs))
        );
      })[0];

    if (!route) {
      return Promise.resolve(response(404, { message: 'Not found' }));
    }

    try {
      const body = event.body ? JSON.parse(event.body) : null;
      const pathParams = parsePathParams(decodeURIComponent(event.rawPath), route.url.split('?')[0]);
      const queryParams = qs.parse(event.rawQueryString);

      const isValidSchema = route.bodyOrQueryParamsSchema
        ? ajv.validate(route.bodyOrQueryParamsSchema, isReadOnlyMethod(httpMethod) ? queryParams : body)
        : true;

      if (!isValidSchema) {
        return Promise.resolve(response(400, { message: 'Bad Request.' }));
      }

      return route.handler(
        {
          pathParams,
          queryParams,
          body,
          response: (statusCode, body, headers) =>
            Promise.resolve({
              statusCode,
              body: JSON.stringify(body),
              headers: { 'content-type': 'application/json', ...headers },
            }),
        },
        {
          originalEvent: event,
          context,
        }
      );
    } catch {
      return Promise.resolve(response(400, { message: 'Bad Request.' }));
    }
  };

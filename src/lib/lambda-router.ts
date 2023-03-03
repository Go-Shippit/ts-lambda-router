import { APIGatewayProxyHandlerV2 } from 'aws-lambda';

import { handler } from './handler';
import { router, Router } from './router';

export const LambdaRouter = {
  build: (routes: (router: Router) => Router): APIGatewayProxyHandlerV2 => handler(routes(router())),
};

import { APIGatewayProxyHandlerV2 } from 'aws-lambda';

import { handler } from './handler';
import { router, Router } from './router';

export const LambdaRouter = {
  build: (routes: <R>(router: Router<R>) => Router<R>): APIGatewayProxyHandlerV2 => {
    const routeDef = routes(router());

    return handler(routeDef);
  },
};

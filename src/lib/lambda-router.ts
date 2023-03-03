import { APIEventHandler } from './handler-v1';
import { APIEventHandlerV2 } from './handler-v2';
import { Router } from './router';
import { RouterConfig, VersionedHandlerType } from './types';

export const LambdaRouter = {
  build: (routes: <R>(router: Router<R>) => Router<R>, config?: RouterConfig): VersionedHandlerType<'V1'> => {
    const routeDef = routes(Router());

    return APIEventHandler(routeDef, config);
  },
};

export const LambdaRouterV2 = {
  build: (routes: <R>(router: Router<R>) => Router<R>, config?: RouterConfig): VersionedHandlerType<'V2'> => {
    const routeDef = routes(Router());

    return APIEventHandlerV2(routeDef, config);
  },
};

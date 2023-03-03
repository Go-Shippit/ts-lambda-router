/* eslint-disable @typescript-eslint/explicit-member-accessibility */

export type PathParamParser<T> = {
  parse: (s: string[]) => T;
};

export class PathParamParsers {
  string: PathParamParser<string> = {
    parse: s => decodeURIComponent(s[0]),
  };
  int: PathParamParser<number> = {
    parse: s => {
      const result = parseInt(s[0]);

      if (isNaN(result)) {
        throw new Error(`Invalid int in path param: ${s}`);
      }

      return result;
    },
  };
}

export const PathParamRegex = /\{([^}/]+)\}/;

export function parsePathParams(url: string, pathSpec: string): Record<string, number | string> {
  const parsers = new PathParamParsers();

  const pathSegments = url.split('/');
  const pathSpecSegments = pathSpec.split('/');

  if (pathSegments.length !== pathSpecSegments.length) {
    throw new Error('Invalid URL.');
  }

  return pathSpecSegments.reduce((acc, v, i) => {
    const params = PathParamRegex.exec(v);

    if (!params) {
      return acc;
    }

    const param = params[1];
    const key = param.split(':')[0];

    const parser = parsers[(param.split(':')[1] || 'string') as keyof PathParamParsers];

    if (!parser) {
      throw new Error('Invalid parser.');
    }

    return {
      ...acc,
      [key]: parser.parse([pathSegments[i]]),
    };
  }, {});
}

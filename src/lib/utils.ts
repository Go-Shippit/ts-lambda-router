export function response(statusCode: number, body: Record<string, unknown>) {
  return {
    statusCode,
    body: JSON.stringify(body),
  };
}

export function isReadOnlyMethod(httpMethod: string) {
  return ['get', 'options', 'head'].includes(httpMethod);
}

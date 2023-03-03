export function response(statusCode: number, body: Record<string, unknown>) {
  return {
    statusCode,
    body: JSON.stringify(body),
  };
}

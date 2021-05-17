import { APIGatewayProxyHandler } from "aws-lambda";
import { LambdaRouter } from "../lib/lambda-router";
import * as Domain from "./domain";
import { Account } from "./models";

export const handler2: APIGatewayProxyHandler = LambdaRouter.build((routes) =>
  routes
    .head("/accounts/${username}")(async (r) => {
      const accountExists = await Domain.accountExists(r.pathParams.username);
      return {
        statusCode: accountExists ? 200 : 404,
        body: "",
      };
    })
    .get("/accounts/${username}")((r) =>
      Domain.getAccount(r.pathParams.username).then((a) => ({
        statusCode: a ? 200 : 404,
        body: JSON.stringify(a),
      }))
    )
    .post(
      "/accounts",
      Account
    )((r) =>
    Domain.saveAccount(r.body).then(() => ({
      statusCode: 201,
      body: "",
    }))
  )
);

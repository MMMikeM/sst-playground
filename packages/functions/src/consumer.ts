import { SQSEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { Table } from "sst/node/table";
import * as z from "zod";

const client = new DynamoDBClient();

const db = DynamoDBDocumentClient.from(client);

export const userSchema = z.object({
  name: z.string(),
  age: z.number(),
});

export const handler = async (event: SQSEvent) => {
  if (process.env.NODE_ENV === "test") {
    throw new Error("Test error");
  }

  console.log("Parsing event");
  const { body } = event.Records[0];

  const parsedBody = JSON.parse(body);

  const userShemaWithId = userSchema.extend({
    id: z.string(),
  });

  const parsed = userShemaWithId.safeParse(parsedBody?.detail);
  if (!parsed.success) {
    console.log("Invalid event body", parsedBody, parsed.error);
    throw new Error("Invalid event body");
  }

  console.log("Updating record");

  const put = new PutCommand({
    TableName: Table["test-table"].tableName,
    Item: parsed.data,
  });

  try {
    await db.send(put);
    console.log("Record updated");
  } catch (e) {
    console.log("Error updating record", e);
    throw e;
  }
};

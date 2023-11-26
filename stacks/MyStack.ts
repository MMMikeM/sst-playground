import { StackContext, Api, EventBus, Table, Queue } from "sst/constructs";
import { Duration } from "aws-cdk-lib";
import { DetailTypes, Sources } from "./constants";

export function API({ stack }: StackContext) {
  const table = new Table(stack, "test-table", {
    fields: {
      id: "string",
      name: "string",
      age: "number",
    },
    primaryIndex: {
      partitionKey: "id",
    },
  });

  const dlq = new Queue(stack, "test-dlq", {
    cdk: {
      queue: {
        fifo: true,
        contentBasedDeduplication: true,
        retentionPeriod: Duration.days(7),
      },
    },
  });

  const queue = new Queue(stack, "test-queue", {
    consumer: {
      function: {
        handler: "./packages/functions/src/consumer.handler",
        bind: [table],
      },
    },
    cdk: {
      queue: {
        visibilityTimeout: Duration.minutes(15),
        fifo: true,
        contentBasedDeduplication: true,
        deadLetterQueue: {
          maxReceiveCount: 2,
          queue: dlq.cdk.queue,
        },
      },
    },
  });

  const bus = new EventBus(stack, "test-bus", {
    defaults: {
      retries: 2,
    },
    rules: {
      "user.created": {
        pattern: {
          source: [Sources.user],
          detailType: [DetailTypes.user.created],
        },
        targets: {
          createUser: {
            type: "queue",
            queue: queue,
            cdk: {
              target: {
                messageGroupId: "user-created",
              },
            },
          },
        },
      },
    },
  });

  const api = new Api(stack, "api", {
    defaults: {
      function: {
        bind: [bus],
      },
    },
    routes: {
      "POST /user": "packages/functions/src/events/producer.handler",
    },
  });

  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}

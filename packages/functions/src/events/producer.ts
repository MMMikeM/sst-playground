import { EventBridge } from "@aws-sdk/client-eventbridge";
import { APIGatewayProxyEventV2 } from "aws-lambda";
import { userSchema } from "src/consumer";
import { EventBus } from "sst/node/event-bus";
import { createId } from "@paralleldrive/cuid2";
import { DetailTypes, Sources } from "../../../../stacks/constants";

const client = new EventBridge();

type User = {
  id: string;
  name: string;
  age: number;
};

export const handler = (event: APIGatewayProxyEventV2) => {
  console.log("Publishing event");

  const parsed = userSchema.safeParse(event);
  if (!parsed.success) {
    console.log("Invalid event body", event, parsed.error);
    return;
  }

  const user: User = { ...parsed.data, id: createId() };

  try {
    client.putEvents({
      Entries: [
        {
          EventBusName: EventBus["test-bus"].eventBusName,
          Source: Sources.user,
          DetailType: DetailTypes.user.created,
          Detail: JSON.stringify(user),
        },
      ],
    });
  } catch (e) {
    console.log("Error publishing event", e);
    throw e;
  }

  console.log("Event successfully published");
};

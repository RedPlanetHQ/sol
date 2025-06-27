import { IntegrationPayloadEventType } from '@redplanethq/sol-sdk';

export interface IntegrationEventPayload {
  event: IntegrationPayloadEventType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [x: string]: any;
}

export async function run(eventPayload: IntegrationEventPayload) {
  switch (eventPayload.event) {
    case IntegrationPayloadEventType.INTEGRATION_ACCOUNT_CREATED:
      return {};

    default:
      return {
        message: `The event payload type is ${eventPayload.event}`,
      };
  }
}

import { MessageEnvelope, MessageEnvelopeSchema } from "@/gen/messages/transport/v1/transport_pb"
import { bStore } from "@/hooks/useAppStore"
import { create, toBinary } from "@bufbuild/protobuf"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function buildEnvelope<T extends MessageEnvelope["messageBody"]>(
  dest: string, bodyCase: T["case"], body: T["value"]
) {
  const _clientId = bStore.getState().clientId;

  const envelope = create(MessageEnvelopeSchema, {
    senderId: _clientId,
    destId: dest,
    messageBody: {
      case: bodyCase,
      value: body
    } as T
  });

  console.log(envelope);

  return toBinary(MessageEnvelopeSchema, envelope);
}

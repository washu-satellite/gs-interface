import { MessageEnvelope } from '@/gen/messages/transport/v1/transport_pb';
import { Message } from '@bufbuild/protobuf';
import { Centrifuge, Subscription } from 'centrifuge/build/protobuf';
import { channel } from 'diagnostics_channel';
import { StateCreator, StoreApi, UseBoundStore } from 'zustand';
import { create } from 'zustand/react';
import { subscribeWithSelector } from 'zustand/middleware';
import { createAuthClient } from 'better-auth/react';

export type MessageDetails = {
  timestamp: Date,
  id: MessageEnvelope["messageBody"]["case"],
  data: Message<any>,
  group: string
};

// Contains all data for managing Centrifuge socket comms
type SocketStore = {
    client: Centrifuge | null;
    clientId: string;
    subscriptions: Map<string, Subscription>;
    messages: MessageDetails[];
    openChannels: string[];

    setClient: (c: Centrifuge) => void;
    setClientId: (id: string) => void;
    subscribe: (channel: string, sub: Subscription) => void;
    addMessage: (envelope: MessageEnvelope) => void;
    addChannel: (channel: string) => void;
    removeChannel: (channel: string) => void;
}

const createSocketStore: StateCreator<SocketStore, [], []> = (set) => ({
    client: null,
    clientId: "",
    subscriptions: new Map<string, Subscription>(),
    messages: [],
    openChannels: [],

    setClient: (c) => set(() => ({ client: c })),
    setClientId: (id) => set(() => ({ clientId: id })),
    subscribe: (channel, sub) => set(d => {
      d.subscriptions.set(channel, sub);
      return ({ subscriptions: d.subscriptions });
    }),
    addMessage: (envelope) => set((state) => {
      if (!envelope.messageBody.value)
        return {};

      // const id = envelope.messageBody.value.$typeName;

      const details: MessageDetails = {
        timestamp: new Date(),
        id: envelope.messageBody.case,
        group: "telemetry",
        data: envelope.messageBody.value
      };

      return ({ messages: [...state.messages, details] });
    }),
    addChannel: (channel) => set((state) => ({ openChannels: [...state.openChannels, channel] })),
    removeChannel: (channel) => set((state) => ({ openChannels: state.openChannels.filter(c => c !== channel) }))
});

type UserData = {
  email: string,
  username: string,
  avatar: string
}

export type ThemeOption = 'dark' | 'light';

// Contains all data for managing Centrifuge socket comms
type UserStore = {
  user: UserData | null;
  theme: ThemeOption;

  setUser: (user: UserData) => void;
  setTheme: (theme: ThemeOption) => void;
}

const createUserStore: StateCreator<UserStore, [], []> = (set) => ({
  user: null,
  theme: 'dark',

  setUser: (user) => set(() => ({ user })),
  setTheme: (theme) => set(() => ({ theme }))
});

// Put all the stores together
export const useBoundedStore = create<SocketStore & UserStore>()(
  // Add subscription middleware
  subscribeWithSelector((...a) => ({
      ...createSocketStore(...a),
      ...createUserStore(...a)
  }))
);

// Helpful Typescript selectors for Zustand
type WithSelectors<S> = S extends { getState: () => infer T }
  ? S & { use: { [K in keyof T]: () => T[K] } }
  : never

export const createSelectors = <S extends UseBoundStore<StoreApi<object>>>(
  _store: S,
) => {
  let store = _store as WithSelectors<typeof _store>
  store.use = {}
  for (let k of Object.keys(store.getState())) {
    ;(store.use as any)[k] = () => store((s) => s[k as keyof typeof s])
  }

  return store
};

export const bStore = createSelectors(useBoundedStore);
import { Centrifuge, Subscription } from 'centrifuge/build/protobuf';
import { StateCreator, StoreApi, UseBoundStore } from 'zustand';
import { create } from 'zustand/react';

// Contains all data for managing Centrifuge socket comms
type SocketStore = {
    client: Centrifuge | null;
    clientId: string;
    subscriptions: Map<string, Subscription>;

    setClient: (c: Centrifuge) => void;
    setClientId: (id: string) => void;
    subscribe: (channel: string, sub: Subscription) => void;
}

const createSocketStore: StateCreator<SocketStore, [], []> = (set) => ({
    client: null,
    clientId: "",
    subscriptions: new Map<string, Subscription>(),

    setClient: (c) => set(() => ({ client: c })),
    setClientId: (id) => set(() => ({ clientId: id })),
    subscribe: (channel, sub) => set(d => {
      d.subscriptions.set(channel, sub);
      return ({ subscriptions: d.subscriptions });
    })
})

// Put all the stores together
export const useBoundedStore = create<SocketStore>()((...a) => ({
    ...createSocketStore(...a),
}));

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
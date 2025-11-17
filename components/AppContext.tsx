"use client";
import { MessageEnvelopeSchema } from '@/gen/messages/transport/v1/transport_pb';
import { bStore } from '@/hooks/useAppStore';
import { authClient } from '@/lib/auth-client';
import { fromBinary } from '@bufbuild/protobuf';
import { Centrifuge, Subscription } from 'centrifuge/build/protobuf';
import { redirect } from 'next/navigation';
import React, { useEffect } from 'react';

interface AppContextState {
}

export interface AppContextProps {
}

const DefaultAppContext: AppContextProps = {
}

const AppContext = React.createContext<AppContextProps>(DefaultAppContext);

const AppContextProvider: React.FC<React.PropsWithChildren<{}>> = (props) => {
    const session = authClient.useSession();

    const _client = bStore.use.client();

    const _setClient = bStore.use.setClient();
    const _subscribe = bStore.use.subscribe();
    const _setUser = bStore.use.setUser();
    
    const _addMessage = bStore.use.addMessage();

    // establish user information, connect to the Centrifuge server, generate handlers
    const init = async () => {
        if (session.data) {
            const baUser = session.data.user;

            _setUser({
                username: baUser.name,
                email: baUser.email,
                avatar: "https://www.washusatellite.com/headshots/nate.jpg"
            });
        }

        const r = await fetch("/api/get-token");
        if (!r.ok) { console.error("Failed to retrieve JWT for socket"); return; }

        const { token } = await r.json();

        console.log(`Got the token: ${token}`);

        const c = new Centrifuge(`ws://localhost:8000/connection/websocket?format=protobuf`, {
            token: token
        });

        c.on('connected', ctx => {
            console.log("Connected to server");
        });

        c.on('publication', ctx => {
            console.log("Got a publication!");

            console.log(ctx.data);
        });

        c.on('message', ctx => {
            console.log("Got a message");

            const d = new Uint8Array(ctx.data);
            const envelope = fromBinary(MessageEnvelopeSchema, d);

            console.log(`Got envelope with src: ${envelope.senderId} and dest: ${envelope.destId}`);

            // note: always use bStore.getState() in handlers
            const channels = bStore.getState().openChannels;

            // TODO: add channels to bStore
            if (!channels.includes("telemetry"))
                return;

            _addMessage(envelope);
        });

        c.connect();

        const sub = new Subscription(c, "internal");
        sub.subscribe();

        _subscribe("internal", sub);
        
        _setClient(c);
        return c;
    }

    // app initialization
    useEffect(() => {
        // if the user's session has not been established,
        // delay connecting to the Centrifuge server and populating user information
        if (!session || session.isPending) {
            return;
        }

        init();
    }, [session]);

    return (
        <AppContext.Provider
            value={{
                ...DefaultAppContext
            }}
        >
            {props.children}
        </AppContext.Provider>
    );
}

export default AppContext;

export { AppContextProvider };
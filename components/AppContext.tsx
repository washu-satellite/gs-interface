"use client";
import { MessageEnvelopeSchema } from '@/gen/messages/transport/v1/transport_pb';
import { bStore } from '@/hooks/useAppStore';
import { fromBinary } from '@bufbuild/protobuf';
import { Centrifuge } from 'centrifuge/build/protobuf';
import React, { useEffect } from 'react';

interface AppContextState {
}

export interface AppContextProps {
}

const DefaultAppContext: AppContextProps = {
}

const AppContext = React.createContext<AppContextProps>(DefaultAppContext);

const AppContextProvider: React.FC<React.PropsWithChildren<{}>> = (props) => {
    const _client = bStore.use.client();

    const _setClient = bStore.use.setClient();

    const init = async () => {
        const r = await fetch("/api/get-token");
        if (!r.ok) { console.error("Failed to retrieve JWT for socket"); return; }

        const { token } = await r.json();

        console.log(`Got the token: ${token}`);

        const c = new Centrifuge(`ws://localhost:8000/connection/websocket`);

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

            switch (envelope.messageBody.case) {
                case 'airisBeacon':
                    console.log(`Got an AIRIS beacon. Battery current: ${envelope.messageBody.value.batCurrent}`);
                    break;
                case 'establishClient':
                    console.log("Got an establish client message");
                    break;
                default:
                    console.error(`No handler established for message type "${envelope.messageBody.case}" yet`);
            }
        });

        c.connect();
        
        _setClient(c);
        return c;
    }

    // App initialization
    useEffect(() => {
        init();
    }, []);

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
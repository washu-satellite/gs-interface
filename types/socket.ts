
import WebSocket from 'ws';
import * as net from 'net';
import { v7 as uuidv7 } from 'uuid';

export type TCPProps = {
    address: string,
    port: number,
    fullAddress: string,
    createdAt: Date
};

export type WSProps = {
    title: string,
    isAlive: boolean,
    // subscriptions: Map<string, boolean>,
    // closeTlm?: () => void,
    keepAlive?: boolean
};

export type SocketMap = {
    TCP: net.Socket,
    WS: WebSocket
};

export type PropMap = {
    TCP: TCPProps,
    WS: WSProps
};

export type Client<T extends EndpointType> = {
    uuid: string,
    socket: SocketMap[T],
    properties: PropMap[T]
}

export type TcpTlmSource = {
    readonly server: net.Server;
    getClient: ((id: string) => Client<EndpointType> | undefined) | undefined,
    setClient: ((id: string, client: Client<EndpointType>) => void) | undefined,
    wssOnMessage: undefined | ((client: Client<'TCP'>, data: Packet<PacketType>) => void);
    handleConnection: (socket: net.Socket) => void;
};

export type StatusReport = {
    time: string,
    managingEntity: number,
    transactionId: number,
    sourceEntityId: number,
    destinationEntityId: number,
    isDestination: boolean,
    lastConditionCode: string,
    lastFaultEntity: string,
    cfdpTransactionState: string,
    progress: number,
    totalFileSize: number,
    transmissionMode: string,
    lastReceivedPduTime: string,
    lastSentPduTime: string,
    realProgress: number
}

export type PacketType = keyof PacketBodies;

// export type PacketSpec<T extends PacketType> = PacketSpecs[T];

export type PacketBodies = {
    'prop.fuel': {
        val: number
    },
    'cfdp.initCfdpEntity': {
        entityId: number,
        mibPath: string,
        filestorePath: string,
        tcpPort: number,
        udpPort: number,
        udpOutput: boolean,
        simulatedErrorRate: number
    },
    'cfdp.sendFile': {
        sourceEntityId: number,
        destinationEntityId: number,
        sourceFileName: string,
        destinationFileName: string
    },
    'cfdp.requestStatusUpdate': {
        entityId: number,
        transactionId: number
    },
    'cfdp.fileSegmentRecvIndication': {
        transactionId: number,
        offset: number,
        length: number,
        recordContinuationState: number,
        segmentMetadataLength: number,
        segmentMetadata: string,
        statusReport: StatusReport
    },
    'cfdp.metadataRecvIndication': {
        transactionId: number,
        sourceEntityId: number,
        fileSize: number,
        sourceFileName: string,
        destinationFileName: string,
        messagesToUser: string,
        statusReport: StatusReport
    },
    'cfdp.transactionFinishedIndication': {
        transactionId: number,
        conditionCode: string,
        fileStatus: string,
        dataComplete: boolean,
        filestoreResponses: string,
        statusReport: StatusReport
    },

    // Establish a connection between a TCP/WS client and the TCP/WS server
    'con.est': {
        endpoint: 'TCP' | 'WS'
    },

    'con.err': {
        message: string
    }
    

    // Deprecated OpenMCT typing
    // 'inf.est': {
    //     uuid: string,
    //     payload: string
    // },
    // 'inf.sdrest':{
    //     payload: true
    // }
    // 'inf.close': {
    //     message: string
    // },
    // 'inf.error': {
    //     message: string
    // },
    // 'rsp.est':{
    //     message: string
    // },
    // 'tlm.gsdef': {
    //     message: string
    // },
    // 'cmd.rot':{
    //     val : number
    // },


    'cmd.ack': { // Acknowledgment that a command was received, returns unique identifier used to track status of individual commands
        commandId: number
        commandType: string
    },
    'cmd.error': { // Response received in case of protocol-level error before command execution. Should be presented to user.
        errorCode: number, // 1: Invalid command ID in request, 2: Unknown command name, 3: Invalid command arguments
        time: string,
        description: string
    }
    'cmd.begin': { // Indication that execution of command has begun
        commandId: number,
        time: string
    }
    'cmd.rqstatus': { // Request for status update on 
        commandId: number
    },
    'cmd.status': { // Generic status update, status object will point to command-specific data structure
        commandId: number,
        time: string,
        status: object
    },
    'cmd.complete': { // Indication of completion of command, both success and failure
        commandId: number,
        time: string,
        returnCode: number, // Simple integer return code for commands not requiring more complex error information
        result: object // Holder for generic return information, implemented per command
    },
    'rsp.rot':{
        executed : boolean,
        val : number | string,
        type: string,
        time: string
    }
    'tlm.attitude':{
        val : number
    },
    'tlm.subscribe': {
        domain: string
    },
    'tlm.unsubscribe': {
        domain: string
    },
    'prop.thrusters': {
        val: string
    },
    'comms.recd': {
        val: number
    },
    'comms.sent': {
        val: number
    },
    'pwr.temp': {
        val: number
    },
    'pwr.c': {
        val: number
    },
    'pwr.v': {
        val: number
    },
};

export type PacketHandler<T extends PacketType, K extends EndpointType> = (client: Client<K>, pkt: Packet<T>) => void;

export type PacketHandlers<K extends EndpointType> = {[T in keyof PacketBodies]?: PacketHandler<T, K>};

// export type ResponsePacketHandler<T extends PacketType> = (pkt: WebSocketPacket<T>) => void;

// export type ResponsePacketHanders = {[K in keyof PacketBodies]?: ResponsePacketHandler<K>};

// export type DbWebSocketPacketHandler<T extends PacketType> = (pkt: WebSocketPacket<T>) => void;

// export type DBResponsePacketHanders = {[K in keyof PacketBodies]?: ResponsePacketHandler<K>};

export type EndpointType = 'TCP' | 'WS';

export type GetSocketHandler = <T extends PacketType, K extends EndpointType>(endpoint: EndpointType, socketType: T) => PacketHandler<T, K> | undefined

// export type GetSocketHandler2 = <T extends PacketType>(socketType: T) => PacketHandler<T> | undefined

export type PacketBody<T extends PacketType> = PacketBodies[T];

export type Packet<T extends PacketType> = {
    // id?: string,
    conn: string,
    spec: T,
    src: string,
    dst: string,
    body: PacketBody<T>
};

// export const wsPacketCreate = <T extends PacketType>(spec: T, body: PacketBody<T>) : WebSocketPacket<T> => {
//     return {
//         id: uuidv7(),
//         spec,
//         body
//     }
// }
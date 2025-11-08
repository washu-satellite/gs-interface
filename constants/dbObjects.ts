/* 
    Object templates for interacting with GS database.
*/

export const enum CachePacketStatus {
    Active = "ACTIVE",
    Expired = "EXPIRED",
}


export type DbLogPacket = {
    readonly connection_id: string,
    readonly packet_id: string,
    spec: string,
    src: string,
    dst: string,
    created_at?: Date
}


export type DbCacheConnection = {
    readonly id: string,
    cmd: string,
    src: string,
    dst: string,
    created_at?: Date,
    status: string
}


export type DbReadPacket = {
    readonly id: string
}


export type DbConnectionPacket = {
    readonly connection_id: string
}
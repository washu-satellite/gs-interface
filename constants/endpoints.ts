/*
    Desc: file containing functionality relating to GS-1 endpoints.
*/

// List of server endpoints, currently used for specifying src modules for logging
export type Endpoints = "WsControl" | "LogApi" | "WsTelemetry"

type EndpointsEx = {
    readonly url: string,
    readonly uuid: string
}

export const EndpointMap: {[K in Endpoints]: EndpointsEx} = {
    WsControl: {
        url: "http://localhost:3000/wsTest", 
        uuid: "067df048-d77e-79ce-8000-fb0f33a777df"
    },
    WsTelemetry: {
        url: "ws://localhost:3000/api/telemetry",
        uuid: "067df096-b27e-7c58-8000-0a4b33974329"
    },
    LogApi: {
        url: "http://localhost:3000/api/log", 
        uuid: "067df04a-ee7e-7c60-8000-a6fe26e99811"
    }
}


export const uuid2url: {[uuid: string] : string} = {};

export const url2uuid: {[url: string] : string} = {};


/* 
    Populate uuid2url and url2uuid dynamically from EndpointMap.
    Negates need to manually edit EndpointMap and uuid2url/url2uuid if endpoint changes.
*/
for (const key in EndpointMap){
    if (EndpointMap.hasOwnProperty(key)){
        // console.log(`key in endpointmap: ${key}`);
        try{
            const endpoint = EndpointMap[key as Endpoints];
            url2uuid[endpoint.url] = endpoint.uuid;
            uuid2url[endpoint.uuid] = endpoint.url;
        }catch(error){
            console.log(`An error ${error} occurred while populating url2uuid or uuid2url`);
        }
    }
}
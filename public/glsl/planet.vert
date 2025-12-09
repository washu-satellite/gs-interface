varying vec3 pos;

// varying vec3 vUv;

// float2 pointOnSphereToUV(float3 p) {
//     p = normalize(p);

//     float longitude = atan2(p.x, -p.z);
//     float latitude = asin(p.y);

//     const float PI = 3.1415;
//     float u = (longitude / PI + 1) / 2;
//     float v = latitude / PI + 0.5;

//     return float2(u, v);
// }

void main() {
    pos = position;

    vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * modelViewPosition;
}
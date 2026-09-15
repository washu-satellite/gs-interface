varying vec2 vUv;
varying float aspect;
varying float slope;

// uniform vec4 modelViewMatrix;
// uniform vec3 position;
// uniform vec4 projectionMatrix;

float pattern(vec2 pos) {
    return (pos.x + pos.y);
    // return 5.0 * (sin(pos.x)/pos.x + sin(pos.y)/pos.y);
    // return 5.0 * (exp((-1.0 / 16.0) * (pos.x * pos.x + pos.y * pos.y)));
}

float PI = 3.1415926;
float HALF_PI = 1.570796;

void main() {
    vUv = uv;

    float val = pattern(position.xy);

    vec4 modelViewPosition = modelViewMatrix * vec4(position.xy, val, 1.0);
    gl_Position = projectionMatrix * modelViewPosition;
}
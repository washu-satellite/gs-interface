precision mediump float;

varying vec2 vUv;
varying vec3 vNormal;

float PI = 3.1415926;
float TWO_PI = 6.283185;
float HALF_PI = 1.570796;

float pattern(vec2 pos) {
    return (pos.x + pos.y);
    // return 5.0 * (sin(pos.x)/pos.x + sin(pos.y)/pos.y);
    // return 5.0 * (exp((-1.0 / 16.0) * (pos.x * pos.x + pos.y * pos.y)));
}

void main() {
    float xpos = pattern(vec2(vUv.x + 1.0, vUv.y));
    float xneg = pattern(vec2(vUv.x - 1.0, vUv.y));
    float ypos = pattern(vec2(vUv.x, vUv.y + 1.0));
    float yneg = pattern(vec2(vUv.x, vUv.y - 1.0));

    float dzdx = xpos - xneg;
    float dzdy = ypos - yneg;

    float slope = atan(sqrt(dzdx*dzdx + dzdy*dzdy));

    // float slope = dot(normalize(vNormal), vec3(1.0, 0.0, 0.0));

    float aspect = PI - atan(dzdy/dzdx) + HALF_PI * (dzdx/abs(dzdx));

    gl_FragColor = vec4(slope, 1.0, 1.0, 1.0);
}
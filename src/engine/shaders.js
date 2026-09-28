// GLSL ES 3.00 shaders (WebGL2). Balanced exposure: ACES tonemap + controlled fill.
const COMMON_FRAG = /* glsl */`
precision highp float;
uniform vec3 uSunDir; uniform vec3 uSunColor; uniform float uSunI;
uniform vec3 uSky; uniform vec3 uGround; uniform float uHemiI;
uniform vec3 uFillDir; uniform vec3 uFillColor;
uniform vec3 uPLPos; uniform vec3 uPLColor; uniform float uPLRange;
uniform vec3 uFogColor; uniform float uFogDensity; uniform float uFogStart;
uniform vec3 uCamPos; uniform float uExposure; uniform float uSaturation;
vec3 toLinear(vec3 c){ return pow(c, vec3(2.2)); }
vec3 aces(vec3 x){ const float a=2.51,b=0.03,c=2.43,d=0.59,e=0.14; return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.0,1.0); }
vec3 finalize(vec3 lin, vec3 wpos){
  float dist = length(wpos - uCamPos);
  float f = 1.0 - exp(-pow(max(dist-uFogStart,0.0)*uFogDensity, 1.6));
  lin = mix(lin, toLinear(uFogColor), clamp(f,0.0,1.0));
  vec3 c = aces(lin * uExposure);
  float l = dot(c, vec3(0.2126,0.7152,0.0722));
  c = mix(vec3(l), c, uSaturation);
  return pow(c, vec3(1.0/2.2));
}
float hash(vec3 p){ p = fract(p*0.3183099+0.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float vnoise(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z); }
`;

export const LIT_VS = /* glsl */`#version 300 es
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNrm; layout(location=2) in vec4 aCol;
uniform mat4 uModel; uniform mat4 uViewProj; uniform mat4 uShadowVP; uniform mat3 uNormalM;
out vec3 vWPos; out vec3 vNrm; out vec3 vLocal; out vec4 vCol; out vec4 vShadow;
void main(){
  vec4 w = uModel * vec4(aPos,1.0);
  vWPos = w.xyz; vLocal = aPos; vNrm = normalize(uNormalM * aNrm); vCol = aCol;
  vShadow = uShadowVP * w;
  gl_Position = uViewProj * w;
}`;

export const LIT_FS = /* glsl */`#version 300 es
${COMMON_FRAG}
in vec3 vWPos; in vec3 vNrm; in vec3 vLocal; in vec4 vCol; in vec4 vShadow;
uniform vec3 uColor; uniform vec3 uPatColor; uniform float uPatScale; uniform int uPattern; uniform int uPatSpace;
uniform float uRough; uniform float uEmissive; uniform float uOpacity; uniform float uConvey; uniform float uWrap; uniform float uRim;
uniform int uDetail; uniform float uTime;
uniform highp sampler2DShadow uShadowMap; uniform int uShadowOn; uniform float uShadowTexel; uniform int uPcf;
out vec4 outColor;

float shadowFactor(vec3 n){
  if(uShadowOn==0) return 1.0;
  vec3 p = vShadow.xyz / vShadow.w * 0.5 + 0.5;
  if(p.x<0.0||p.x>1.0||p.y<0.0||p.y>1.0||p.z>1.0) return 1.0;
  float bias = 0.0015 + 0.002*(1.0-abs(dot(n,uSunDir)));
  float s = 0.0, cnt = 0.0;
  int r = uPcf;
  for(int x=-2;x<=2;x++) for(int y=-2;y<=2;y++){
    if(abs(x)>r||abs(y)>r) continue;
    s += texture(uShadowMap, vec3(p.xy + vec2(x,y)*uShadowTexel, p.z-bias)); cnt += 1.0;
  }
  return mix(0.35, 1.0, s/cnt); // shadows never go pitch black (readability)
}

vec3 pattern(vec3 base){
  vec3 p = (uPatSpace==1 ? vLocal : vWPos) * uPatScale;
  float det = float(uDetail);
  if(uPattern==1){ // hazard stripes
    float s = step(0.5, fract((p.x+p.y+p.z)*0.5)); return mix(base, uPatColor, s);
  } else if(uPattern==2){ // wood planks
    float plank = floor(p.z*2.5 + p.y*2.5); float g = vnoise(vec3(p.x*1.5, plank*7.0, 0.0));
    float seam = smoothstep(0.03,0.0,abs(fract(p.z*2.5+p.y*2.5)-0.5)-0.46);
    vec3 c = base*(0.86+0.2*g + 0.06*hash(vec3(plank)));
    if(det>0.5) c *= 0.93 + 0.07*sin(p.x*40.0 + g*6.0);
    return mix(c, base*0.55, seam*0.6);
  } else if(uPattern==3){ // tiles/checker
    float c = mod(floor(p.x)+floor(p.z)+floor(p.y),2.0); return mix(base, uPatColor, c*0.5);
  } else if(uPattern==4){ // natural noise (sand/grass/rock)
    float n = vnoise(p*1.3)*0.6 + (det>0.5 ? vnoise(p*5.1)*0.4 : 0.2);
    return base*(0.82+0.3*n);
  } else if(uPattern==5){ // conveyor belt
    float r = fract((p.x - uConvey)*1.0);
    float ridge = smoothstep(0.0,0.08,r)*smoothstep(0.5,0.42,r);
    return mix(base*0.55, uPatColor, ridge);
  } else if(uPattern==6){ // fabric
    float w = det>0.5 ? 0.94 + 0.06*sin(p.x*220.0)*sin(p.y*220.0) : 1.0; return base*w;
  } else if(uPattern==7){ // skin
    float n = det>0.5 ? vnoise(p*40.0) : 0.5; return base*(0.97+0.06*n);
  } else if(uPattern==8){ // brick / stone blocks
    float row = floor(p.y*2.0); float off = mod(row,2.0)*0.5;
    vec2 q = vec2(fract(p.x+p.z*0.7+off), fract(p.y*2.0));
    float mortar = step(q.x,0.04)+step(q.y,0.08);
    float n = vnoise(vec3(floor(p.x+off),row,floor(p.z)));
    return mix(base*(0.85+0.3*n), base*0.5, clamp(mortar,0.0,1.0));
  } else if(uPattern==9){ // foliage
    float n = vnoise(p*2.2); return base*(0.75+0.45*n);
  } else if(uPattern==10){ // rings on balls (rotation readable)
    float s = step(0.5, fract(p.y*2.0)); return mix(base, uPatColor, s*0.85);
  }
  return base;
}

void main(){
  vec3 albedo = toLinear(pattern(uColor * vCol.rgb));
  vec3 N = normalize(vNrm);
  vec3 V = normalize(uCamPos - vWPos);
  if(dot(N,V) < -0.2) N = -N;
  float sh = shadowFactor(N);
  float ndl = dot(N, uSunDir);
  float diff = max((ndl + uWrap)/(1.0+uWrap), 0.0);
  float hemiT = N.y*0.5+0.5;
  vec3 hemi = mix(toLinear(uGround), toLinear(uSky), hemiT) * uHemiI;
  float ao = 0.72 + 0.28*hemiT;
  vec3 light = toLinear(uSunColor)*uSunI*diff*sh + hemi*ao;
  light += toLinear(uFillColor) * max(dot(N, uFillDir), 0.0);
  vec3 lp = uPLPos - vWPos; float ld = length(lp);
  light += toLinear(uPLColor) * max(dot(N, lp/ld),0.0) * clamp(1.0 - ld/uPLRange, 0.0, 1.0);
  vec3 H = normalize(uSunDir + V);
  float shin = mix(6.0, 90.0, 1.0-uRough);
  float spec = pow(max(dot(N,H),0.0), shin) * (1.0-uRough)*0.35 * sh;
  float rim = uRim * pow(1.0 - max(dot(N,V),0.0), 3.0);
  vec3 col = albedo*light + toLinear(uSunColor)*spec*uSunI*0.5 + rim*toLinear(uSky)*0.5 + albedo*(uEmissive + vCol.a)*1.2;
  outColor = vec4(finalize(col, vWPos), uOpacity);
}`;

export const DEPTH_VS = /* glsl */`#version 300 es
layout(location=0) in vec3 aPos;
uniform mat4 uModel; uniform mat4 uViewProj;
void main(){ gl_Position = uViewProj * uModel * vec4(aPos,1.0); }`;
export const DEPTH_FS = /* glsl */`#version 300 es
precision mediump float; out vec4 o; void main(){ o = vec4(1.0); }`;

export const SKY_VS = /* glsl */`#version 300 es
out vec2 vUv; void main(){ vec2 p = vec2((gl_VertexID<<1)&2, gl_VertexID&2); vUv = p; gl_Position = vec4(p*2.0-1.0, 0.9999, 1.0); }`;
export const SKY_FS = /* glsl */`#version 300 es
${COMMON_FRAG}
in vec2 vUv; uniform mat4 uInvVP; uniform vec3 uSkyTop; uniform vec3 uSkyHorizon; uniform int uClouds; uniform float uTime;
out vec4 outColor;
void main(){
  vec4 a = uInvVP * vec4(vUv*2.0-1.0, 1.0, 1.0); vec3 dir = normalize(a.xyz/a.w - uCamPos);
  float h = clamp(dir.y*1.6+0.12, 0.0, 1.0);
  vec3 c = mix(toLinear(uSkyHorizon), toLinear(uSkyTop), pow(h, 0.7));
  float sd = max(dot(dir, uSunDir), 0.0);
  c += toLinear(uSunColor) * (pow(sd, 400.0)*1.2 + pow(sd, 12.0)*0.12);
  if(uClouds==1 && dir.y>0.0){
    vec2 q = dir.xz/(dir.y+0.15)*1.4 + vec2(uTime*0.01,0.0);
    float n = vnoise(vec3(q,0.0))*0.6 + vnoise(vec3(q*2.3,1.0))*0.4;
    float cl = smoothstep(0.55,0.85,n)*smoothstep(0.0,0.25,dir.y);
    c = mix(c, toLinear(vec3(0.92,0.93,0.95))*0.9, cl*0.55);
  }
  vec3 t = aces(c*uExposure); float l = dot(t, vec3(0.2126,0.7152,0.0722)); t = mix(vec3(l), t, uSaturation);
  outColor = vec4(pow(t, vec3(1.0/2.2)),1.0);
}`;

export const WATER_VS = /* glsl */`#version 300 es
layout(location=0) in vec3 aPos;
uniform mat4 uModel; uniform mat4 uViewProj; uniform float uTime; uniform int uWaves;
out vec3 vWPos; out vec3 vN;
void main(){
  vec4 w = uModel * vec4(aPos,1.0);
  vec3 n = vec3(0,1,0);
  if(uWaves==1){
    float a1 = w.x*0.35 + uTime*1.1, a2 = w.z*0.5 + w.x*0.15 + uTime*0.8;
    w.y += sin(a1)*0.08 + sin(a2)*0.06;
    n = normalize(vec3(-cos(a1)*0.028 - cos(a2)*0.0045, 1.0, -cos(a2)*0.03));
  }
  vWPos = w.xyz; vN = n; gl_Position = uViewProj * w;
}`;
export const WATER_FS = /* glsl */`#version 300 es
${COMMON_FRAG}
in vec3 vWPos; in vec3 vN; uniform vec3 uDeep; uniform vec3 uShallow; uniform float uReflect; uniform float uTime; uniform int uDetail;
out vec4 outColor;
void main(){
  vec3 N = vN;
  if(uDetail>0){ float r = vnoise(vec3(vWPos.xz*1.7, uTime*0.6)); N = normalize(N + vec3(r-0.5,0.0,vnoise(vec3(vWPos.zx*1.9,uTime*0.5))-0.5)*0.18); }
  vec3 V = normalize(uCamPos - vWPos);
  float fres = pow(1.0 - max(dot(N,V),0.0), 4.0);
  float depthT = clamp((vWPos.z + 4.0)/10.0, 0.0, 1.0);
  vec3 base = mix(toLinear(uDeep), toLinear(uShallow), 0.35+0.4*depthT);
  vec3 light = toLinear(uSunColor)*uSunI*max(dot(N,uSunDir),0.0)*0.35 + mix(toLinear(uGround), toLinear(uSky), 0.8)*uHemiI*0.7;
  vec3 col = base*light;
  col = mix(col, toLinear(uSky)*0.8, clamp(fres*uReflect, 0.0, 0.45));
  vec3 H = normalize(uSunDir+V); col += toLinear(uSunColor) * min(pow(max(dot(N,H),0.0), 160.0)*0.6, 0.5) * uReflect;
  float foam = uDetail>0 ? smoothstep(0.78,0.95, vnoise(vec3(vWPos.xz*0.9, uTime*0.3))) * 0.08 : 0.0;
  col += foam;
  outColor = vec4(finalize(col, vWPos), 0.93);
}`;

export const PARTICLE_VS = /* glsl */`#version 300 es
layout(location=0) in vec3 aPos; layout(location=1) in vec4 aCol; layout(location=2) in float aSize;
uniform mat4 uViewProj; uniform float uScale; out vec4 vCol;
void main(){ vec4 p = uViewProj*vec4(aPos,1.0); gl_Position = p; gl_PointSize = clamp(aSize*uScale/max(p.w,0.1), 1.0, 96.0); vCol = aCol; }`;
export const PARTICLE_FS = /* glsl */`#version 300 es
precision mediump float; in vec4 vCol; out vec4 o;
void main(){ vec2 d = gl_PointCoord*2.0-1.0; float r = dot(d,d); if(r>1.0) discard; o = vec4(vCol.rgb, vCol.a*(1.0-r)); }`;

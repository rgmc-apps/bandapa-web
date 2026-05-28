"use client";

import { useEffect, useRef } from "react";

const VERT = `attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0.,1.);}`;

const FRAG = `
precision highp float;
uniform float u_t;
uniform vec2 u_mouse;
uniform vec2 u_res;

vec3 permute(vec3 x){return mod(((x*34.)+1.)*x,289.);}
float snoise(vec2 v){
  const vec4 C=vec4(.211324865,.366025404,-.577350269,.024390244);
  vec2 i=floor(v+dot(v,C.yy));
  vec2 x0=v-i+dot(i,C.xx);
  vec2 i1=x0.x>x0.y?vec2(1.,0.):vec2(0.,1.);
  vec4 x12=x0.xyxy+C.xxzz;
  x12.xy-=i1;
  i=mod(i,289.);
  vec3 p=permute(permute(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));
  vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);
  m=m*m*m*m;
  vec3 x=2.*fract(p*C.www)-1.;
  vec3 h=abs(x)-.5;
  vec3 a0=x-floor(x+.5);
  m*=1.79284291-.85373472*(a0*a0+h*h);
  vec3 g;
  g.x=a0.x*x0.x+h.x*x0.y;
  g.yz=a0.yz*x12.xz+h.yz*x12.yw;
  return 130.*dot(m,g);
}

void main(){
  vec2 uv=gl_FragCoord.xy/u_res;
  uv.y=1.-uv.y;
  vec2 m=u_mouse/u_res;
  if(m.x<0.||m.x>1.||m.y<0.||m.y>1.)m=vec2(.5,.5);

  float n0=snoise(uv*1.9+u_t*.055);
  float n1=snoise(uv*3.8-u_t*.038+vec2(n0*.18));
  float n2=snoise(uv*7.2+u_t*.025+vec2(n1*.1));
  float n=(n0*.52+n1*.31+n2*.17);

  float md=length(uv-m);
  float mg=smoothstep(.45,0.,md)*.20;
  n=clamp(n*.5+.5+mg,0.,1.);

  float vign=1.-smoothstep(.28,.75,length((uv-.5)*1.45));

  // Obsidian: #0F1509
  vec3 base=vec3(.059,.082,.035);
  // Dimmed chlorophyll glow: a very dark green
  vec3 hi=vec3(.11,.22,.125);

  float t=smoothstep(.48,.84,n);
  vec3 col=mix(base,hi,t*vign*.85);
  gl_FragColor=vec4(col,1.);
}
`;

function makeShader(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return s;
}

export default function WebGLNoise({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const gl = canvas.getContext("webgl", {
      antialias: false,
      alpha: false,
      powerPreference: "low-power",
    });
    if (!gl) return;

    const prog = gl.createProgram()!;
    gl.attachShader(prog, makeShader(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, makeShader(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );
    const aPos = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uT = gl.getUniformLocation(prog, "u_t");
    const uM = gl.getUniformLocation(prog, "u_mouse");
    const uR = gl.getUniformLocation(prog, "u_res");

    let W = 0, H = 0, mx = -1, my = -1, raf = 0;
    const t0 = performance.now();

    function resize() {
      W = canvas!.clientWidth;
      H = canvas!.clientHeight;
      // Half resolution — GPU does the upscale, cuts fill cost ~4×
      canvas!.width  = Math.round(W / 2);
      canvas!.height = Math.round(H / 2);
      gl!.viewport(0, 0, canvas!.width, canvas!.height);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    function onMove(e: MouseEvent) {
      const r = canvas!.getBoundingClientRect();
      // Scale mouse coords down to match half-res canvas
      mx = (e.clientX - r.left) / 2;
      my = (e.clientY - r.top) / 2;
    }
    window.addEventListener("mousemove", onMove, { passive: true });

    function draw() {
      raf = requestAnimationFrame(draw);
      gl!.uniform1f(uT, (performance.now() - t0) / 1000);
      gl!.uniform2f(uM, mx, my);
      gl!.uniform2f(uR, canvas!.width, canvas!.height);
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
    }
    draw();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("mousemove", onMove);
      gl.deleteProgram(prog);
      gl.deleteBuffer(buf);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className={className}
      style={{ imageRendering: "auto" }}
    />
  );
}

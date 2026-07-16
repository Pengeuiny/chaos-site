"use client";

import { useEffect, useRef } from "react";

/**
 * Persistent spotlight background — raw WebGL, no library.
 * Falls back to the CSS gradient (#stage-fallback) when WebGL is
 * unavailable or the visitor prefers reduced motion.
 * Ported from the reference prototype.
 */
export default function Stage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = (canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl || reduce) {
      canvas.style.display = "none";
      return;
    }

    const vs = `attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}`;
    const fs = `
    precision highp float;
    uniform vec2 u_res; uniform float u_time; uniform vec2 u_mouse;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);
      float a=hash(i),b=hash(i+vec2(1.,0.)),c=hash(i+vec2(0.,1.)),d=hash(i+vec2(1.,1.));
      vec2 u=f*f*(3.-2.*f);return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);}
    float beam(vec2 uv,vec2 src,vec2 dir,float spread){
      vec2 v=uv-src;float d=length(v);
      float ang=dot(normalize(v),dir);
      float cone=smoothstep(1.0-spread,1.0,ang);
      float atten=1.0/(1.0+d*d*2.6);
      return cone*atten;}
    void main(){
      vec2 uv=gl_FragCoord.xy/u_res.xy;
      float asp=u_res.x/u_res.y;
      vec2 p=vec2(uv.x*asp,uv.y);
      vec3 top=vec3(0.035,0.07,0.14), bot=vec3(0.006,0.014,0.035);
      vec3 col=mix(bot,top,pow(uv.y,1.35));
      float t=u_time*0.22;
      vec2 m=(u_mouse-0.5);
      vec2 s1=vec2((0.30+0.05*sin(t)+m.x*0.10)*asp,1.18);
      vec2 s2=vec2((0.72-0.05*sin(t*0.8)-m.x*0.10)*asp,1.18);
      vec2 d1=normalize(vec2(0.16*sin(t*0.7),-1.0));
      vec2 d2=normalize(vec2(-0.16*sin(t*0.9),-1.0));
      float b1=beam(p,s1,d1,0.055);
      float b2=beam(p,s2,d2,0.055);
      col+=vec3(1.0,0.78,0.35)*b1*1.5;
      col+=vec3(0.3,0.55,1.0)*b2*1.15;
      float dust=pow(noise(p*7.0+vec2(0.0,-u_time*0.25)),3.0);
      col+=(b1+b2)*dust*vec3(1.0,0.9,0.7)*0.7;
      col*=smoothstep(1.25,0.15,length(uv-0.5));
      col+=hash(uv+u_time)*0.015;
      gl_FragColor=vec4(col,1.0);
    }`;

    function sh(type: number, src: string) {
      const s = gl!.createShader(type)!;
      gl!.shaderSource(s, src);
      gl!.compileShader(s);
      if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) {
        console.warn(gl!.getShaderInfoLog(s));
        return null;
      }
      return s;
    }

    const prog = gl.createProgram()!;
    const v = sh(gl.VERTEX_SHADER, vs);
    const f = sh(gl.FRAGMENT_SHADER, fs);
    if (!v || !f) {
      canvas.style.display = "none";
      return;
    }
    gl.attachShader(prog, v);
    gl.attachShader(prog, f);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      canvas.style.display = "none";
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(prog, "u_res");
    const uTime = gl.getUniformLocation(prog, "u_time");
    const uMouse = gl.getUniformLocation(prog, "u_mouse");

    let mouse = [0.5, 0.5];
    const onMove = (e: PointerEvent) => {
      mouse = [e.clientX / innerWidth, 1 - e.clientY / innerHeight];
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 1.75);
      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
    };
    addEventListener("resize", resize);
    resize();

    const start = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, (now - start) / 1000);
      gl.uniform2f(uMouse, mouse[0], mouse[1]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      removeEventListener("resize", resize);
    };
  }, []);

  return (
    <>
      <div id="stage-fallback" />
      <canvas id="stage" ref={canvasRef} />
      <div className="grain" />
    </>
  );
}

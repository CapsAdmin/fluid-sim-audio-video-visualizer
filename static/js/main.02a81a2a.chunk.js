(this["webpackJsonpfluid-sim-video-music-visualizer"]=this["webpackJsonpfluid-sim-video-music-visualizer"]||[]).push([[0],{17:function(e){e.exports=JSON.parse('[{"source":"http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4","title":"Big Buck Bunny"},{"source":"http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4","title":"Elephant Dream"},{"source":"http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4","title":"Sintel"},{"source":"http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4","title":"Tears of Steel"}]')},22:function(e,t,n){},25:function(e,t,n){"use strict";n.r(t);var i=n(3),a=n.n(i),o=n(16),r=n.n(o),c=(n(22),n(14)),s=n(8),u=n(2),l=n.n(u),v=n(10),d=n(4),f=n(7),h=n(11),m=n(12),p=n(15),g=n(13),x=n(1),b=n(0),j=function(e){Object(p.a)(n,e);var t=Object(g.a)(n);function n(e){var i;return Object(h.a)(this,n),(i=t.call(this,e)).props=void 0,i.frame=0,i.rectangle=null,i.audio=null,i.buffers=null,i.simulationProgram=null,i.shadeProgram=null,i.fftTexture=null,i.videoTexture=null,i.uniforms={},i.mousePos={x:0,y:0,z:0},i.props=e,i}return Object(m.a)(n,[{key:"Start",value:function(e){e.canvas.width=document.documentElement.clientWidth,e.canvas.height=document.documentElement.clientHeight,this.rectangle=x.b(e,{position:[-1,-1,0,1,-1,0,-1,1,0,-1,1,0,1,-1,0,1,1,0]}),this.buffers=[];for(var t=0;t<2;t++)this.buffers[t]=x.c(e,[{format:e.RED,internalFormat:e.R16F,type:e.FLOAT,mag:e.LINEAR,min:e.LINEAR,wrap:e.REPEAT}],e.canvas.width,e.canvas.height);var n="\n      attribute vec4 position;\n      void main() {\n        gl_Position = position;\n      }\n    ",i="\n      precision highp float;\n      #define texture texture2D\n      \n      uniform float iTime;\n      uniform vec2 iResolution;\n      uniform sampler2D video_tex;\n      uniform sampler2D fft_tex;\n      uniform vec3 iMouse;\n    ";this.simulationProgram=x.d(e,[n,"".concat(i,"\n            uniform sampler2D iChannel0;\n            uniform int iFrame;\n            ").concat(this.props.simulation,"\n          ")],(function(e,t){if(e)throw new Error(e)})),this.shadeProgram=x.d(e,[n,"".concat(i,"\n            uniform sampler2D iChannel0;\n            ").concat(this.props.shade,"\n            ")],(function(e,t){if(e)throw new Error(e)})),this.videoTexture||(this.videoTexture=x.e(e,{min:e.LINEAR,mag:e.LINEAR,wrap:e.REPEAT}),this.uniforms.video_tex=this.videoTexture),this.fftTexture||(this.fftTexture=x.e(e,{min:e.LINEAR,wrap:e.REPEAT}),this.uniforms.fft_tex=this.fftTexture),this.SetupMouse(e),this.props.onLoad(this)}},{key:"UpdateTexture",value:function(e){var t=this.glContext;t.bindTexture(t.TEXTURE_2D,this.videoTexture),t.texImage2D(t.TEXTURE_2D,0,t.RGB,t.RGB,t.UNSIGNED_BYTE,e)}},{key:"UpdateFFT",value:function(e){var t=this.glContext;t.bindTexture(t.TEXTURE_2D,this.fftTexture),t.texImage2D(t.TEXTURE_2D,0,t.R32F,e.length,1,0,t.RED,t.FLOAT,e)}},{key:"SetupMouse",value:function(e){var t=this;this.mousePos={x:0,y:0,z:0};var n=function(e,t,n){var i=function(e,t,n){var i=n.getBoundingClientRect();return{x:e-i.left,y:e-i.top}}(e,0,n);return i.x=i.x*n.width/n.clientWidth,i.y=i.y*n.height/n.clientHeight,i},i=e.canvas;i.onmousemove=function(i){t.mousePos=Object(f.a)({z:i.buttons},n(i.clientX,i.clientY,e.canvas))},i.onmousedown=function(i){t.mousePos=Object(f.a)({z:i.buttons},n(i.clientX,i.clientY,e.canvas))},i.ontouchmove=function(i){var a=i.touches.item(0);a&&(t.mousePos=Object(f.a)({z:1},n(a.clientX,a.clientY,e.canvas)))},i.ontouchstart=function(i){var a=i.touches.item(0);a&&(t.mousePos=Object(f.a)({z:1},n(a.clientX,a.clientY,e.canvas)))},i.onmouseup=function(){t.mousePos.z=0},i.ontouchend=function(){t.mousePos.z=0},i.ontouchcancel=function(){t.mousePos.z=0}}},{key:"PreDraw",value:function(){}},{key:"Draw",value:function(e,t){var n=e.canvas;if(x.g(n))for(var i=0;i<2;i++)x.h(e,this.buffers[i]);this.PreDraw();var a=this.uniforms;a.iResolution=[e.canvas.width,e.canvas.height],a.iFrame=this.frame,a.iMouse=[this.mousePos.x,-this.mousePos.y+e.canvas.height,this.mousePos.z],a.iTime=.0015*t,a.iChannel0=this.buffers[1].attachments[0],e.bindFramebuffer(e.FRAMEBUFFER,this.buffers[0].framebuffer),e.viewport(0,0,e.canvas.width,e.canvas.height),e.useProgram(this.simulationProgram.program),x.i(e,this.simulationProgram,this.rectangle),x.j(this.simulationProgram,this.uniforms),x.f(e,this.rectangle),e.bindFramebuffer(e.FRAMEBUFFER,null);var o=[this.buffers[1],this.buffers[0]];this.buffers[0]=o[0],this.buffers[1]=o[1],this.frame=this.frame+1,a.iChannel0=this.buffers[1].attachments[0],e.viewport(0,0,e.canvas.width,e.canvas.height),e.useProgram(this.shadeProgram.program),x.i(e,this.shadeProgram,this.rectangle),x.j(this.shadeProgram,this.uniforms),x.f(e,this.rectangle)}}]),n}(function(e){Object(p.a)(n,e);var t=Object(g.a)(n);function n(){var e;Object(h.a)(this,n);for(var i=arguments.length,a=new Array(i),o=0;o<i;o++)a[o]=arguments[o];return(e=t.call.apply(t,[this].concat(a))).glContext=null,e}return Object(m.a)(n,[{key:"Start",value:function(e){}},{key:"Draw",value:function(e,t){}},{key:"componentDidMount",value:function(){var e=this;x.a(this.glContext);requestAnimationFrame((function t(n){e.glContext&&(e.Draw(e.glContext,n),requestAnimationFrame(t))})),this.Start(this.glContext),window.addEventListener("resize",(function(){e.glContext&&e.Start(e.glContext)}))}},{key:"componentWillUnmount",value:function(){this.glContext=null}},{key:"render",value:function(){var e=this;return Object(b.jsx)("canvas",{ref:function(t){if(t){var n=t.getContext("webgl2");if(!n)throw new Error("unable to get webgl2 rendering context from canvas");e.glContext=n}}})}}]),n}(a.a.Component)),y=n(17),O=null,w=null,k=null,E=function(){O||(O=new AudioContext({latencyHint:"interactive"}),(w=O.createAnalyser()).smoothingTimeConstant=0,w.fftSize=2048,k=new Float32Array(w.frequencyBinCount))},T=new Map,P="none",C=function(){var e=Object(d.a)(l.a.mark((function e(t){var n,i,a;return l.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:if(n=T.get(t)){e.next=3;break}return e.abrupt("return");case 3:i=Object(v.a)(n.mediaStream.getTracks());try{for(i.s();!(a=i.n()).done;)a.value.stop()}catch(o){i.e(o)}finally{i.f()}n.disconnect(),T.delete(t);case 7:case"end":return e.stop()}}),e)})));return function(t){return e.apply(this,arguments)}}(),F=function(){var e=Object(d.a)(l.a.mark((function e(t){var n,i;return l.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return e.next=2,navigator.mediaDevices.getUserMedia({video:!1,audio:{deviceId:t,echoCancellation:!1,noiseSuppression:!1,autoGainControl:!1,channelCount:2,latency:.02}});case 2:n=e.sent,(i=O.createMediaStreamSource(n)).connect(w),i.connect(O.destination),T.set(t,i),console.log("started listening to "+t);case 8:case"end":return e.stop()}}),e)})));return function(t){return e.apply(this,arguments)}}(),D=new WeakMap,I=function(){var e=document.getElementById("videoPlayer");if(e&&(E(),!D.get(e))){var t=O.createMediaElementSource(e);D.set(e,t),t.connect(w),t.connect(O.destination)}},R=null,S=function(){var e=Object(d.a)(l.a.mark((function e(t){var n,i,a,o,r,c;return l.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:if(n=document.getElementById("videoPlayer")){e.next=3;break}return e.abrupt("return");case 3:if(E(),R){i=Object(v.a)(R.getTracks());try{for(i.s();!(a=i.n()).done;)a.value.stop()}catch(u){i.e(u)}finally{i.f()}n.srcObject=null}if("desktop"!==t){e.next=15;break}return e.next=8,navigator.mediaDevices.getDisplayMedia({video:!0,audio:{echoCancellation:!1,noiseSuppression:!1,autoGainControl:!1,channelCount:2,latency:.02}});case 8:(o=e.sent).getAudioTracks().length>0&&((r=O.createMediaStreamSource(o)).connect(w),r.connect(O.destination)),R=o,c=new MediaStream(Object(s.a)(o.getVideoTracks())),n.srcObject=c,e.next=26;break;case 15:if("none"!==t){e.next=19;break}n.src="",e.next=26;break;case 19:if(!t.startsWith("http")){e.next=23;break}n.src=t,e.next=26;break;case 23:return e.next=25,navigator.mediaDevices.getUserMedia({video:{deviceId:t},audio:!1});case 25:n.srcObject=e.sent;case 26:P=t;case 27:case"end":return e.stop()}}),e)})));return function(t){return e.apply(this,arguments)}}();var z=function(){var e=Object(i.useRef)(null),t=Object(i.useState)([]),n=Object(c.a)(t,2),a=n[0],o=n[1],r=Object(i.useState)({}),s=Object(c.a)(r,2)[1];return Object(i.useEffect)((function(){Object(d.a)(l.a.mark((function e(){return l.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return e.t0=o,e.next=3,navigator.mediaDevices.enumerateDevices();case 3:e.t1=e.sent,(0,e.t0)(e.t1);case 5:case"end":return e.stop()}}),e)})))(),window.scrollTo(0,-99999)}),[]),Object(b.jsxs)("div",{className:"App",children:[Object(b.jsx)(j,{onLoad:function(t){e.current=t;var n=document.getElementById("videoPlayer");n&&(t.PreDraw=function(){w&&(w.getFloatTimeDomainData(k),t.UpdateFFT(k)),n.readyState>=2&&t.UpdateTexture(n)})},simulation:"\n                    #define FFT(f) texture(fft_tex, vec2(f, 0.0)).x\n                    #define PIXEL(x, y) texture(iChannel0, uv + vec2(x, y) / iResolution.xy).r\n\n                    void mainImage(out vec4 out_color, in vec2 coordinates)\n                    {    \n                        vec2 uv = coordinates.xy / iResolution.xy;                  \n                        \n                        float v = PIXEL(0.0, 0.0);\n                        v = PIXEL(\n                            sin(PIXEL(v, 0.0)  - PIXEL(-v, 0.0) + 3.1415) * v * 0.4, \n                            cos(PIXEL(0.0, -v) - PIXEL(0.0 , v) - 1.57) * v * 0.4\n                        );\n                        v += pow(FFT(pow(v*0.1, 1.5) * 0.25) * 1.5, 3.0);\n                        v -= pow(length(texture(video_tex, uv * vec2(1.0, -1.0))) + 0.05, 3.0) * 0.08;\n                        v *= 0.925 + FFT(v)*0.1;\n\n                        if (iMouse.z > 0.0) {\n                            v += smoothstep(100.0, 0.5, length(iMouse.xy - coordinates)) * 0.05;\n                        }\n                        \n                        out_color.r = v;\n                    }\n\n                    void main() { mainImage(gl_FragColor, gl_FragCoord.xy); }\n                    ",shade:"\n                    void mainImage( out vec4 out_color, in vec2 coordinates )\n                    {\n                        vec2 uv = coordinates.xy/iResolution.xy;\n                        float v = texture(iChannel0, uv).r * 1.5;\n                            \n                        vec3 color = pow(vec3(cos(v), tan(v), sin(v)) * 0.5 + 0.5, vec3(0.5));\n                        vec3 e = vec3(vec2(1.0) / iResolution.xy, 0.0);\n                        vec3 grad = normalize(vec3(\n                            texture(iChannel0, uv + e.xz).x - texture(iChannel0, uv - e.xz).x, \n                            texture(iChannel0, uv + e.zy).x - texture(iChannel0, uv - e.zy).x, 1.0));\n                        vec3 light = vec3(0.26, -0.32, 0.91);\n                        float diffuse = dot(grad, light);\n                        float spec = pow(max(0.0, -reflect(light, grad).z), 32.0);\n                        \n                        out_color.rgb = (color * diffuse) + spec;\n                        out_color.a = 1.0;\n                    }\n\n                    void main() { mainImage(gl_FragColor, gl_FragCoord.xy); }\n                    "}),Object(b.jsxs)("div",{style:{margin:30},children:[Object(b.jsx)("h2",{children:"audio and video input"}),Object(b.jsx)("ul",{children:Object(b.jsxs)("select",{value:P,onChange:function(){var e=Object(d.a)(l.a.mark((function e(t){return l.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return e.next=2,S(t.currentTarget.value);case 2:return e.next=4,I();case 4:s({});case 5:case"end":return e.stop()}}),e)})));return function(t){return e.apply(this,arguments)}}(),children:[Object(b.jsx)("option",{value:"none",children:"None"},"none"),Object(b.jsx)("option",{disabled:!0,children:"\u2500\u2500 input devices \u2500\u2500"}),Object(b.jsx)("option",{value:"desktop",children:"Desktop"},"desktop"),a.map((function(e){return"videoinput"===e.kind?Object(b.jsx)("option",{value:e.deviceId,children:e.label},e.deviceId):null})),Object(b.jsx)("option",{disabled:!0,children:"\u2500\u2500 sample videos \u2500\u2500"}),y.map((function(e){return Object(b.jsx)("option",{value:e.source,children:e.title},e.source)}))]})}),Object(b.jsx)("h2",{children:"extra audio input"}),Object(b.jsx)("ul",{children:a.map((function(e){return"audioinput"===e.kind?Object(b.jsxs)("li",{children:[Object(b.jsx)("input",{title:e.label,type:"checkbox",checked:T.has(e.deviceId),onChange:function(){var t=Object(d.a)(l.a.mark((function t(n){return l.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:if(E(),!T.has(e.deviceId)){t.next=6;break}return t.next=4,C(e.deviceId);case 4:t.next=8;break;case 6:return t.next=8,F(e.deviceId);case 8:s({});case 9:case"end":return t.stop()}}),t)})));return function(e){return t.apply(this,arguments)}}()}),Object(b.jsx)("span",{children:e.label})]},e.deviceId):null}))}),Object(b.jsx)("h2",{children:"video player"}),Object(b.jsx)("video",{id:"videoPlayer",style:{width:512},controls:!0,crossOrigin:"anonymous",src:"",autoPlay:!0},"videoplayer")]})]})},_=function(e){e&&e instanceof Function&&n.e(3).then(n.bind(null,26)).then((function(t){var n=t.getCLS,i=t.getFID,a=t.getFCP,o=t.getLCP,r=t.getTTFB;n(e),i(e),a(e),o(e),r(e)}))};r.a.render(Object(b.jsx)(a.a.StrictMode,{children:Object(b.jsx)(z,{})}),document.getElementById("root")),_()}},[[25,1,2]]]);
//# sourceMappingURL=main.02a81a2a.chunk.js.map
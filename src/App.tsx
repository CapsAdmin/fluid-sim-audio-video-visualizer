import { useRef } from "react"
import { Simulation } from "./Simulation"

function App() {
	const simRef = useRef<Simulation | null>(null)
	const videoRef = useRef<HTMLVideoElement | null>(null)
	return (
		<div className="App">
			<Simulation
				onLoad={(sim) => {
					simRef.current = sim
				}}
				simulation={`
                    #define FFT(f) texture(fft_tex, vec2(f, 0.0)).x
                    #define PIXEL(x, y) texture(iChannel0, uv + vec2(x, y) / iResolution.xy).r

                    void mainImage(out vec4 out_color, in vec2 coordinates)
                    {    
                        vec2 uv = coordinates.xy / iResolution.xy;

                        
                        
                        float v = PIXEL(0.0, 0.0);
                        v = PIXEL(
                            sin(PIXEL(v, 0.0)  - PIXEL(-v, 0.0) + 3.1415) * v * 0.4, 
                            cos(PIXEL(0.0, -v) - PIXEL(0.0 , v) - 1.57) * v * 0.4
                        );
                        v += pow(FFT(pow(v*0.1, 1.5) * 0.25) * 1.5, 3.0);
                        v -= pow(length(texture(video_tex, uv * vec2(1.0, -1.0))) + 0.05, 3.0) * 0.08;
                        v *= 0.925 + FFT(v)*0.1;

                        if (iMouse.z > 0.0) {
                                v += smoothstep(100.0, 0.5, length(iMouse.xy - coordinates)) * 0.05;
                            }
                        
                        out_color.r = v;
                    }

                    void main() { mainImage(gl_FragColor, gl_FragCoord.xy); }
                    `}
				shade={`
                    void mainImage( out vec4 out_color, in vec2 coordinates )
                    {
                        vec2 uv = coordinates.xy/iResolution.xy;
                        float v = texture(iChannel0, uv).r * 1.5;
                            
                        vec3 color = pow(vec3(cos(v), tan(v), sin(v)) * 0.5 + 0.5, vec3(0.5));
                        vec3 e = vec3(vec2(1.0) / iResolution.xy, 0.0);
                        vec3 grad = normalize(vec3(
                            texture(iChannel0, uv + e.xz).x - texture(iChannel0, uv - e.xz).x, 
                            texture(iChannel0, uv + e.zy).x - texture(iChannel0, uv - e.zy).x, 1.0));
                        vec3 light = vec3(0.26, -0.32, 0.91);
                        float diffuse = dot(grad, light);
                        float spec = pow(max(0.0, -reflect(light, grad).z), 32.0);
                        
                        out_color.rgb = (color * diffuse) + spec;
                        out_color.a = 1.0;
                    }

                    void main() { mainImage(gl_FragColor, gl_FragCoord.xy); }
                    `}
			></Simulation>

			<video controls src="https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/1080/Big_Buck_Bunny_1080_10s_30MB.mp4" ref={videoRef}></video>

			<button
				onClick={async () => {
					const video = videoRef.current
					if (!video) return

					const sim = simRef.current
					if (!sim) return

					const desktopStream = await (navigator.mediaDevices as MediaDevices & { getDisplayMedia: (opts: MediaStreamConstraints) => MediaStream }).getDisplayMedia({
						video: true,
						audio: {
							echoCancellation: false,
							noiseSuppression: false,
							autoGainControl: false,
							channelCount: 2,
							latency: 0.02,
						},
					})

					console.log(await navigator.mediaDevices.enumerateDevices())

					const videoStream = desktopStream
					/*				
                    const videoStream = await navigator.mediaDevices.getUserMedia({
                        video: true,
                        audio: false,
                    })
                    */
					const audioStream = await navigator.mediaDevices.getUserMedia({
						video: false,
						audio: {
							echoCancellation: false,
							noiseSuppression: false,
							autoGainControl: false,
							channelCount: 2,
							latency: 0.02,
						},
					})

					let context = new AudioContext({
						latencyHint: "interactive",
					})

					const desktopSource = context.createMediaStreamSource(videoStream)
					const voiceSource = context.createMediaStreamSource(audioStream)

					let analyser = context.createAnalyser()
					//analyser.minDecibels = -90
					//analyser.maxDecibels = -10
					analyser.smoothingTimeConstant = 0.0
					analyser.fftSize = 2048

					var bufferLength = analyser.frequencyBinCount
					const fftArray = new Float32Array(bufferLength)

					let gain = context.createGain()
					gain.gain.value = 1.25
					desktopSource.connect(gain)

					gain.connect(analyser)
					voiceSource.connect(analyser)

					desktopSource.connect(context.destination)
					voiceSource.connect(context.destination)

					const stream = new MediaStream([...videoStream.getVideoTracks()])

					video.srcObject = stream

					sim.PreDraw = () => {
						analyser.getFloatTimeDomainData(fftArray) // move me out

						sim.UpdateFFT(fftArray)

						if (video.readyState >= 2) {
							sim.UpdateTexture(video)
						}
					}
				}}
			>
				start capture
			</button>
		</div>
	)
}

export default App

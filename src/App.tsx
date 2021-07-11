import { useEffect, useRef, useState } from "react"
import { Simulation } from "./Simulation"
import exampleVideos from "./assets/videos.json"

let VIDEO_CONNECTED_TO_AUDIO = false

let audioContext = null as unknown as AudioContext
let audioAnalyser = null as unknown as AnalyserNode
let fftArray = null as unknown as Float32Array

const ensureAudioContext = () => {
	if (audioContext) return

	audioContext = new AudioContext({
		latencyHint: "interactive",
	})

	audioAnalyser = audioContext.createAnalyser()
	audioAnalyser.smoothingTimeConstant = 0.0
	audioAnalyser.fftSize = 2048

	fftArray = new Float32Array(audioAnalyser.frequencyBinCount)
}

const audioSources = new Map<string, MediaStreamAudioSourceNode>()
let currentVideoSource = exampleVideos[0].source

const removeAudioSource = async (deviceId: string) => {
	const source = audioSources.get(deviceId)
	if (!source) return

	for (const track of source.mediaStream.getTracks()) {
		track.stop()
	}
	source.disconnect()

	audioSources.delete(deviceId)
}

const addAudioSource = async (deviceId: string) => {
	const stream = await navigator.mediaDevices.getUserMedia({
		video: false,
		audio: {
			deviceId: deviceId,
			echoCancellation: false,
			noiseSuppression: false,
			autoGainControl: false,
			channelCount: 2,
			latency: 0.02,
		},
	})

	const source = audioContext.createMediaStreamSource(stream)

	source.connect(audioAnalyser)
	source.connect(audioContext.destination)

	audioSources.set(deviceId, source)

	console.log("started listening to " + deviceId)
}

const setVideoSource = async (source: string) => {
	const video = document.getElementById("videoPlayer") as HTMLVideoElement
	if (!video) return

	if (source.startsWith("http")) {
		video.src = source
	} else {
		video.srcObject = await navigator.mediaDevices.getUserMedia({
			video: {
				deviceId: source,
			},
			audio: false,
		})
	}

	currentVideoSource = source
}

const getVideoSource = async () => {
	return currentVideoSource
}

function App() {
	const simRef = useRef<Simulation | null>(null)
	const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
	const [, render] = useState({})

	useEffect(() => {
		;(async () => {
			setDevices(await navigator.mediaDevices.enumerateDevices())
		})()
	}, [])

	return (
		<div className="App">
			<Simulation
				onLoad={(sim) => {
					simRef.current = sim

					const video = document.getElementById("videoPlayer") as HTMLVideoElement
					if (!video) return

					sim.PreDraw = () => {
						audioAnalyser.getFloatTimeDomainData(fftArray) // move me out

						sim.UpdateFFT(fftArray)

						if (video.readyState >= 2) {
							sim.UpdateTexture(video)
						}
					}
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

			<div>
				<h2>audio inputs</h2>
				<ul>
					{devices.map((info) => {
						if (info.kind === "audioinput") {
							return (
								<li key={info.deviceId}>
									<input
										title={info.label}
										type="checkbox"
										checked={audioSources.has(info.deviceId)}
										onChange={async (e) => {
											ensureAudioContext()
											if (audioSources.has(info.deviceId)) {
												await removeAudioSource(info.deviceId)
											} else {
												await addAudioSource(info.deviceId)
											}
											render({})
										}}
									/>
									<span>{info.label}</span>
								</li>
							)
						}
						return null
					})}
				</ul>
			</div>

			<div>
				<h2>video input</h2>
				<ul>
					<select
						value={currentVideoSource}
						onChange={(e) => {
							ensureAudioContext()
							setVideoSource(e.currentTarget.value)
							render({})
						}}
					>
						{devices.map((info) => {
							if (info.kind === "videoinput") {
								return (
									<option key={info.deviceId} value={info.deviceId}>
										{info.label}
									</option>
								)
							}
							return null
						})}
						{exampleVideos.map((info) => {
							return (
								<option key={info.source} value={info.source}>
									{info.title}
								</option>
							)
						})}
					</select>
				</ul>
			</div>

			<button
				onClick={async () => {
					const video = document.getElementById("videoPlayer") as HTMLVideoElement
					if (!video) return
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

					const videoStream = desktopStream

					const desktopSource = audioContext.createMediaStreamSource(videoStream)
					desktopSource.connect(audioAnalyser)
					desktopSource.connect(audioContext.destination)

					const stream = new MediaStream([...videoStream.getVideoTracks()])

					video.srcObject = stream
				}}
			>
				Desktop
			</button>

			<div>
				<h2>video player</h2>
				<video
					key="videoplayer"
					ref={(e) => {
						if (!e) return
						setVideoSource(currentVideoSource)

						if (!VIDEO_CONNECTED_TO_AUDIO) {
							ensureAudioContext()
							const audioSource = audioContext.createMediaElementSource(e)

							audioSource.connect(audioAnalyser)
							audioSource.connect(audioContext.destination)
							VIDEO_CONNECTED_TO_AUDIO = true
						}
					}}
					id="videoPlayer"
					style={{ width: 512 }}
					controls
					crossOrigin="anonymous"
					src=""
				/>
			</div>
		</div>
	)
}

export default App

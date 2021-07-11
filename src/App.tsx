import { useEffect, useRef, useState } from "react"
import { Simulation } from "./Simulation"
import exampleVideos from "./assets/videos.json"

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
let currentVideoSource = "none"

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

let streamConnections = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>()

const connectVideoToAudio = () => {
	const video = document.getElementById("videoPlayer") as HTMLVideoElement
	if (!video) return
	ensureAudioContext()

	const prev = streamConnections.get(video)
	if (prev) {
		return
	}

	const audioSource = audioContext.createMediaElementSource(video)
	streamConnections.set(video, audioSource)

	audioSource.connect(audioAnalyser)
	audioSource.connect(audioContext.destination)
}

let streamSession: null | MediaStream = null

const setVideoSource = async (source: string) => {
	const video = document.getElementById("videoPlayer") as HTMLVideoElement
	if (!video) return

	ensureAudioContext()

	if (streamSession) {
		for (let track of streamSession.getTracks()) {
			track.stop()
		}
		video.srcObject = null
	}

	if (source === "desktop") {
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

		if (desktopStream.getAudioTracks().length > 0) {
			const desktopSource = audioContext.createMediaStreamSource(desktopStream)
			desktopSource.connect(audioAnalyser)
			desktopSource.connect(audioContext.destination)
		}

		streamSession = desktopStream

		const stream = new MediaStream([...desktopStream.getVideoTracks()])

		video.srcObject = stream
	} else if (source === "none") {
		video.src = ""
	} else if (source.startsWith("http")) {
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

function App() {
	const simRef = useRef<Simulation | null>(null)
	const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
	const [, render] = useState({})

	return (
		<div className="App">
			<Simulation
				onLoad={(sim) => {
					simRef.current = sim

					const video = document.getElementById("videoPlayer") as HTMLVideoElement
					if (!video) return

					sim.PreDraw = () => {
						if (audioAnalyser) {
							audioAnalyser.getFloatTimeDomainData(fftArray)
							sim.UpdateFFT(fftArray)
						}

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

			<div style={{ margin: 30 }}>
				<h2>audio and video input</h2>
				<ul>
					<select
						value={currentVideoSource}
						onChange={async (e) => {
							await setVideoSource(e.currentTarget.value)
							await connectVideoToAudio()
							render({})
						}}
					>
						<option key={"none"} value={"none"}>
							{"None"}
						</option>

						<option disabled>── input devices ──</option>
						<option key={"desktop"} value={"desktop"}>
							{"Desktop"}
						</option>
						{devices.map((info) => {
							if (info.kind === "videoinput") {
								return (
									<option key={info.deviceId} value={info.deviceId}>
										{info.label || "unknown device: " + info.deviceId}
									</option>
								)
							}
							return null
						})}
						<option disabled>── sample videos ──</option>

						{exampleVideos.map((info) => {
							return (
								<option key={info.source} value={info.source}>
									{info.title}
								</option>
							)
						})}
					</select>
				</ul>

				<h2>extra audio input</h2>
				<ul>
					{devices.length === 0 ? (
						<button
							onClick={async () => {
								try {
									await navigator.mediaDevices.getUserMedia({ audio: true })
								} catch (err) {}
								try {
									await navigator.mediaDevices.getUserMedia({ video: true })
								} catch (err) {}
								setDevices(await navigator.mediaDevices.enumerateDevices())
							}}
						>
							request access
						</button>
					) : null}

					{devices.map((info) => {
						if (info.kind === "audioinput") {
							return (
								<li key={info.deviceId}>
									<input
										title={info.label || "unknown device: " + info.deviceId}
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

				<h2>video player</h2>

				<video key="videoplayer" id="videoPlayer" style={{ width: 512 }} controls crossOrigin="anonymous" src="" autoPlay />
				<h2>extra audio player</h2>
				<input
					type="file"
					id="upload"
					onChange={(event) => {
						const files = event.target.files
						if (!files) return
						const audioPlayer = document.getElementById("audioplayer") as HTMLAudioElement
						if (!audioPlayer) return

						audioPlayer.src = URL.createObjectURL(files[0])
						ensureAudioContext()

						const audioSource = audioContext.createMediaElementSource(audioPlayer)
						streamConnections.set(audioPlayer, audioSource)

						audioSource.connect(audioAnalyser)
						audioSource.connect(audioContext.destination)
					}}
				/>

				<audio loop key="audioplayer" id="audioplayer" style={{ width: 512 }} controls crossOrigin="anonymous" src="" autoPlay />
			</div>
		</div>
	)
}

export default App

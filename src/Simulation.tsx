import React from "react"
import * as twgl from "twgl.js"
import noiseImage from "./assets/noise.png"

class GLRenderer extends React.Component {
	glContext: WebGL2RenderingContext = null as unknown as WebGL2RenderingContext

	public Start(gl: WebGL2RenderingContext) {}
	public Draw(gl: WebGL2RenderingContext, time: number) {}

	componentDidMount() {
		twgl.addExtensionsToContext(this.glContext)

		const render = (time: number) => {
			if (!this.glContext) return
			this.Draw(this.glContext, time)
			requestAnimationFrame(render)
		}

		requestAnimationFrame(render)

		this.Start(this.glContext)

		window.addEventListener("resize", () => {
			this.Start(this.glContext)
		})
	}

	componentWillUnmount() {
		this.glContext = null as unknown as WebGL2RenderingContext
	}

	render() {
		return (
			<canvas
				ref={(canvas) => {
					if (canvas) {
						const glContext = canvas.getContext("webgl2")
						if (!glContext) {
							throw new Error("unable to get webgl2 rendering context from canvas")
						}
						this.glContext = glContext
					}
				}}
			/>
		)
	}
}

export class Simulation extends GLRenderer {
	props: { simulation: string; shade: string; onLoad: (sim: Simulation) => void }

	frame = 0
	rectangle: twgl.BufferInfo = null as unknown as twgl.BufferInfo
	audio: HTMLAudioElement = null as unknown as HTMLAudioElement
	buffers: twgl.FramebufferInfo[] = null as unknown as twgl.FramebufferInfo[]
	simulationProgram: twgl.ProgramInfo = null as unknown as twgl.ProgramInfo
	shadeProgram: twgl.ProgramInfo = null as unknown as twgl.ProgramInfo
	noiseTexture: WebGLTexture = null as unknown as WebGLTexture
	fftTexture: WebGLTexture = null as unknown as WebGLTexture
	videoTexture: WebGLTexture = null as unknown as WebGLTexture
	audioContext: AudioContext = null as unknown as AudioContext
	fftArray: Float32Array = null as unknown as Float32Array
	audioAnalyser: AnalyserNode = null as unknown as AnalyserNode
	video: HTMLVideoElement = null as unknown as HTMLVideoElement
	uniforms: { [key: string]: any } = {}
	startCapture: any
	copyVideo = false
	mouse_pos = { x: 0, y: 0, z: 0 }

	constructor(props: { simulation: string; shade: string; onLoad: (sim: Simulation) => void }) {
		super(props)
		this.props = props
	}

	Start(gl: WebGL2RenderingContext) {
		gl.canvas.width = document.documentElement.clientWidth
		gl.canvas.height = document.documentElement.clientHeight

		this.rectangle = twgl.createBufferInfoFromArrays(gl, {
			position: [-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0],
		})

		// front and back buffers
		this.buffers = []
		for (let i = 0; i < 2; i++) {
			this.buffers[i] = twgl.createFramebufferInfo(
				gl,
				[
					{
						format: gl.RED,
						internalFormat: gl.R16F,
						type: gl.FLOAT,
						mag: gl.LINEAR,
						min: gl.LINEAR,
						wrap: gl.REPEAT,
					},
				],
				gl.canvas.width,
				gl.canvas.height,
			)
		}

		const vertexCode = `
      attribute vec4 position;
      void main() {
        gl_Position = position;
      }
    `

		const header = `
      precision highp float;
      #define texture texture2D
      
      uniform float iTime;
      uniform vec2 iResolution;
      uniform sampler2D noise_tex;
      uniform sampler2D video_tex;
      uniform sampler2D fft_tex;
      uniform vec3 iMouse;
    `

		this.simulationProgram = twgl.createProgramInfo(gl, [
			vertexCode,
			`${header}
            uniform sampler2D iChannel0;
            uniform int iFrame;
            ${this.props.simulation}
          `,
		])

		this.shadeProgram = twgl.createProgramInfo(gl, [
			vertexCode,
			`${header}
            uniform sampler2D iChannel0;
            ${this.props.shade}
            `,
		])

		this.noiseTexture = twgl.createTexture(gl, {
			src: noiseImage,
		})

		this.fftTexture = twgl.createTexture(gl, {
			min: gl.LINEAR,
			wrap: gl.REPEAT,
		})

		this.videoTexture = twgl.createTexture(gl, {
			min: gl.LINEAR,
			mag: gl.LINEAR,
			wrap: gl.REPEAT,
		})

		this.uniforms = {}

		this.SetupMouse(gl)

		if (!this.video) {
			let video = document.createElement("video")

			document.body.appendChild(video)

			//let source = this.audioContext.createMediaElementSource(video)
			//source.connect(this.audioAnalyser)
			//this.audioAnalyser.connect(this.audioContext.destination)

			var playing = false
			var timeupdate = false

			video.autoplay = true
			video.muted = false
			video.loop = true
			video.controls = true

			const checkReady = () => {
				if (playing && timeupdate) {
					this.copyVideo = true
				}
			}

			video.addEventListener(
				"playing",
				function () {
					playing = true
					checkReady()
				},
				true,
			)

			video.addEventListener(
				"timeupdate",
				function () {
					timeupdate = true
					checkReady()
				},
				true,
			)

			this.startCapture = async () => {
				const videoStream = await (navigator.mediaDevices as MediaDevices & { getDisplayMedia: (opts: MediaStreamConstraints) => MediaStream }).getDisplayMedia({
					video: true,
					audio: {
						echoCancellation: false,
						noiseSuppression: false,
						autoGainControl: false,
						channelCount: 2,
					},
				})

				const audioStream = await navigator.mediaDevices.getUserMedia({
					video: false,
					audio: {
						echoCancellation: false,
						noiseSuppression: false,
						autoGainControl: false,
						channelCount: 2,
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
				analyser.smoothingTimeConstant = 1.0
				analyser.fftSize = 2048

				var bufferLength = analyser.frequencyBinCount
				this.fftArray = new Float32Array(bufferLength)

				let gain = context.createGain()
				gain.gain.value = 0.85
				desktopSource.connect(gain)

				gain.connect(analyser)
				voiceSource.connect(analyser)

				desktopSource.connect(context.destination)
				voiceSource.connect(context.destination)

				const stream = new MediaStream([...videoStream.getVideoTracks()])

				this.audioAnalyser = analyser
				this.audioContext = context

				video.srcObject = stream
			}

			/*
			video.setAttribute("data-yt2html5", "https://www.youtube.com/watch?v=3KyKxu27OHU")
			const YouTubeToHtml5 = require("@thelevicole/youtube-to-html5-loader")
			;(globalThis as any).LOL = new YouTubeToHtml5({ withAudio: true })
            
			import("./assets/vhsintros.mp4").then((res) => {
                video.src = res.default
			})
            */
			video.volume = 1

			this.video = video
		}

		this.props.onLoad(this)
	}

	UpdateTexture() {
		if (!this.copyVideo) return

		const gl = this.glContext
		const level = 0
		const internalFormat = gl.RGBA
		const srcFormat = gl.RGBA
		const srcType = gl.UNSIGNED_BYTE
		gl.bindTexture(gl.TEXTURE_2D, this.videoTexture)
		gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, srcFormat, srcType, this.video)
	}

	UpdateFFT() {
		if (!this.audioAnalyser) return
		this.audioAnalyser.getFloatTimeDomainData(this.fftArray)
		const gl = this.glContext
		gl.bindTexture(gl.TEXTURE_2D, this.fftTexture)
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, this.fftArray.length, 1, 0, gl.RED, gl.FLOAT, this.fftArray)
	}

	SetupMouse(gl: WebGL2RenderingContext) {
		this.mouse_pos = { x: 0, y: 0, z: 0 }

		const getRelativeMousePosition = (x: number, y: number, target: HTMLCanvasElement) => {
			var rect = target.getBoundingClientRect()

			return {
				x: x - rect.left,
				y: x - rect.top,
			}
		}

		// assumes target or event.target is canvas
		const getNoPaddingNoBorderCanvasRelativeMousePosition = (x: number, y: number, element: HTMLCanvasElement) => {
			var pos = getRelativeMousePosition(x, y, element)

			pos.x = (pos.x * element.width) / element.clientWidth
			pos.y = (pos.y * element.height) / element.clientHeight

			return pos
		}

		const canvas = gl.canvas as HTMLCanvasElement

		canvas.onmousemove = (evt) => {
			this.mouse_pos = { z: evt.buttons, ...getNoPaddingNoBorderCanvasRelativeMousePosition(evt.clientX, evt.clientY, gl.canvas as HTMLCanvasElement) }
		}
		canvas.onmousedown = (evt) => {
			this.mouse_pos = { z: evt.buttons, ...getNoPaddingNoBorderCanvasRelativeMousePosition(evt.clientX, evt.clientY, gl.canvas as HTMLCanvasElement) }
		}
		canvas.ontouchmove = (evt) => {
			let touch = evt.touches.item(0)
			if (!touch) return

			this.mouse_pos = { z: 1, ...getNoPaddingNoBorderCanvasRelativeMousePosition(touch.clientX, touch.clientY, gl.canvas as HTMLCanvasElement) }
		}
		canvas.ontouchstart = (evt) => {
			let touch = evt.touches.item(0)
			if (!touch) return

			this.mouse_pos = { z: 1, ...getNoPaddingNoBorderCanvasRelativeMousePosition(touch.clientX, touch.clientY, gl.canvas as HTMLCanvasElement) }
		}

		canvas.onmouseup = () => {
			this.mouse_pos.z = 0
		}

		canvas.ontouchend = () => {
			this.mouse_pos.z = 0
		}

		canvas.ontouchcancel = () => {
			this.mouse_pos.z = 0
		}
	}

	Draw(gl: WebGL2RenderingContext, time: number) {
		const canvas = gl.canvas as HTMLCanvasElement

		if (twgl.resizeCanvasToDisplaySize(canvas)) {
			for (let i = 0; i < 2; i++) {
				twgl.resizeFramebufferInfo(gl, this.buffers[i])
			}
		}

		this.UpdateTexture()
		this.UpdateFFT()

		let u = this.uniforms

		u.iResolution = [gl.canvas.width, gl.canvas.height]

		u.iFrame = this.frame
		u.iMouse = [this.mouse_pos.x, -this.mouse_pos.y + gl.canvas.height, this.mouse_pos.z]
		u.iTime = time * 0.0015
		u.noise_tex = this.noiseTexture
		u.video_tex = this.videoTexture
		u.fft_tex = this.fftTexture

		u.iChannel0 = this.buffers[1].attachments[0]

		gl.bindFramebuffer(gl.FRAMEBUFFER, this.buffers[0].framebuffer)
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
		gl.useProgram(this.simulationProgram.program)
		twgl.setBuffersAndAttributes(gl, this.simulationProgram, this.rectangle)
		twgl.setUniforms(this.simulationProgram, this.uniforms)
		twgl.drawBufferInfo(gl, this.rectangle)

		gl.bindFramebuffer(gl.FRAMEBUFFER, null)
		;[this.buffers[0], this.buffers[1]] = [this.buffers[1], this.buffers[0]]

		this.frame = this.frame + 1

		u.iChannel0 = this.buffers[1].attachments[0]
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

		gl.useProgram(this.shadeProgram.program)
		twgl.setBuffersAndAttributes(gl, this.shadeProgram, this.rectangle)
		twgl.setUniforms(this.shadeProgram, this.uniforms)
		twgl.drawBufferInfo(gl, this.rectangle)
	}
}

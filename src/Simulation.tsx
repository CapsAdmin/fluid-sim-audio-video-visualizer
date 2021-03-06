import React, { ReactNode } from "react"
import * as twgl from "twgl.js"

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
			if (this.glContext) {
				this.Start(this.glContext)
			}
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

interface Props {
	simulation: string
	shade: string
	onLoad: (sim: Simulation) => void
}
export class Simulation extends GLRenderer {
	props: Props

	frame = 0
	rectangle: twgl.BufferInfo = null as unknown as twgl.BufferInfo
	audio: HTMLAudioElement = null as unknown as HTMLAudioElement
	buffers: twgl.FramebufferInfo[] = null as unknown as twgl.FramebufferInfo[]
	simulationProgram: twgl.ProgramInfo = null as unknown as twgl.ProgramInfo
	shadeProgram: twgl.ProgramInfo = null as unknown as twgl.ProgramInfo
	fftTexture: WebGLTexture = null as unknown as WebGLTexture
	videoTexture: WebGLTexture = null as unknown as WebGLTexture
	uniforms: { [key: string]: any } = {}
	mousePos = { x: 0, y: 0, z: 0 }

	constructor(props: Props) {
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
      uniform sampler2D video_tex;
      uniform sampler2D fft_tex;
      uniform vec3 iMouse;
    `

		this.simulationProgram = twgl.createProgramInfo(
			gl,
			[
				vertexCode,
				`${header}
            uniform sampler2D iChannel0;
            uniform int iFrame;
            ${this.props.simulation}
          `,
			],
			(msg, lineOffset) => {
				if (msg) {
					throw new Error(msg)
				}
			},
		)

		this.shadeProgram = twgl.createProgramInfo(
			gl,
			[
				vertexCode,
				`${header}
            uniform sampler2D iChannel0;
            ${this.props.shade}
            `,
			],
			(msg, lineOffset) => {
				if (msg) {
					throw new Error(msg)
				}
			},
		)

		if (!this.videoTexture) {
			this.videoTexture = twgl.createTexture(gl, {
				min: gl.LINEAR,
				mag: gl.LINEAR,
				wrap: gl.REPEAT,
			})
			this.uniforms.video_tex = this.videoTexture
		}

		if (!this.fftTexture) {
			this.fftTexture = twgl.createTexture(gl, {
				min: gl.LINEAR,
				wrap: gl.REPEAT,
			})
			this.uniforms.fft_tex = this.fftTexture
		}

		this.SetupMouse(gl)
		this.props.onLoad(this)
	}

	UpdateTexture(video: HTMLVideoElement) {
		const gl = this.glContext

		gl.bindTexture(gl.TEXTURE_2D, this.videoTexture)
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video)
	}

	UpdateFFT(array: Float32Array) {
		const gl = this.glContext

		gl.bindTexture(gl.TEXTURE_2D, this.fftTexture)
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, array.length, 1, 0, gl.RED, gl.FLOAT, array)
	}

	SetupMouse(gl: WebGL2RenderingContext) {
		this.mousePos = { x: 0, y: 0, z: 0 }

		const getRelativeMousePosition = (x: number, y: number, target: HTMLCanvasElement) => {
			var rect = target.getBoundingClientRect()

			return {
				x: x - rect.left,
				y: y - rect.top,
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
			this.mousePos = { z: evt.buttons, ...getNoPaddingNoBorderCanvasRelativeMousePosition(evt.clientX, evt.clientY, gl.canvas as HTMLCanvasElement) }
		}
		canvas.onmousedown = (evt) => {
			this.mousePos = { z: evt.buttons, ...getNoPaddingNoBorderCanvasRelativeMousePosition(evt.clientX, evt.clientY, gl.canvas as HTMLCanvasElement) }
		}
		canvas.ontouchmove = (evt) => {
			let touch = evt.touches.item(0)
			if (!touch) return

			this.mousePos = { z: 1, ...getNoPaddingNoBorderCanvasRelativeMousePosition(touch.clientX, touch.clientY, gl.canvas as HTMLCanvasElement) }
		}
		canvas.ontouchstart = (evt) => {
			let touch = evt.touches.item(0)
			if (!touch) return

			this.mousePos = { z: 1, ...getNoPaddingNoBorderCanvasRelativeMousePosition(touch.clientX, touch.clientY, gl.canvas as HTMLCanvasElement) }
		}

		canvas.onmouseup = () => {
			this.mousePos.z = 0
		}

		canvas.ontouchend = () => {
			this.mousePos.z = 0
		}

		canvas.ontouchcancel = () => {
			this.mousePos.z = 0
		}
	}

	PreDraw() {}

	Draw(gl: WebGL2RenderingContext, time: number) {
		const canvas = gl.canvas as HTMLCanvasElement

		if (twgl.resizeCanvasToDisplaySize(canvas)) {
			for (let i = 0; i < 2; i++) {
				twgl.resizeFramebufferInfo(gl, this.buffers[i])
			}
		}

		this.PreDraw()

		let u = this.uniforms

		u.iResolution = [gl.canvas.width, gl.canvas.height]

		u.iFrame = this.frame
		u.iMouse = [this.mousePos.x, -this.mousePos.y + gl.canvas.height, this.mousePos.z]
		u.iTime = time * 0.0015

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

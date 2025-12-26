import { useEffect, useRef } from 'react'
import styles from './AuroraBackground.module.css'

export function AuroraBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    let animationId: number
    let time = 0

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resize()
    window.addEventListener('resize', resize)

    // Aurora colors - графит/серебро палитра проекта
    // Используем цвета из CSS переменных проекта
    const colors = [
      { r: 192, g: 192, b: 192 },   // silver - var(--color-accent)
      { r: 165, g: 170, b: 181 },   // soft graphite - var(--color-text-muted)
      { r: 200, g: 200, b: 210 },   // light silver
      { r: 140, g: 145, b: 155 },   // medium graphite
      { r: 210, g: 210, b: 220 },   // bright silver
      { r: 120, g: 125, b: 135 },   // dark graphite
    ]

    const blobs = colors.map((color, i) => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      baseRadius: 150 + Math.random() * 200,
      color,
      speedX: (Math.random() - 0.5) * 2.5,
      speedY: (Math.random() - 0.5) * 2.5,
      phase: i * Math.PI * 0.4,
      pulseSpeed: 0.8 + Math.random() * 0.8,
      waveFreq: 0.5 + Math.random() * 0.6,
    }))

    const animate = () => {
      time += 0.018

      // Clear with base color (используем цвет фона проекта)
      ctx.fillStyle = '#0a0a0a' // var(--color-bg)
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw blobs with enhanced wave and pulse effects
      blobs.forEach((blob, i) => {
        // Complex wave movement
        const waveX = Math.sin(time * blob.waveFreq + blob.phase) * 3
        const waveY = Math.cos(time * blob.waveFreq * 0.8 + blob.phase) * 3
        const secondaryWave = Math.sin(time * 0.5 + i * 0.7) * 1.5
        
        blob.x += (waveX + secondaryWave) * blob.speedX
        blob.y += (waveY + secondaryWave) * blob.speedY

        // Wrap around edges
        if (blob.x < -blob.baseRadius) blob.x = canvas.width + blob.baseRadius
        if (blob.x > canvas.width + blob.baseRadius) blob.x = -blob.baseRadius
        if (blob.y < -blob.baseRadius) blob.y = canvas.height + blob.baseRadius
        if (blob.y > canvas.height + blob.baseRadius) blob.y = -blob.baseRadius

        // Pulsating radius
        const pulse = Math.sin(time * blob.pulseSpeed + blob.phase) * 80
        const breathe = Math.sin(time * 0.3) * 40
        const dynamicRadius = blob.baseRadius + pulse + breathe

        // Create radial gradient
        const gradient = ctx.createRadialGradient(
          blob.x, blob.y, 0,
          blob.x, blob.y, dynamicRadius
        )

        // Pulsating alpha
        const baseAlpha = 0.4 + Math.sin(time * blob.pulseSpeed + i) * 0.15
        gradient.addColorStop(0, `rgba(${blob.color.r}, ${blob.color.g}, ${blob.color.b}, ${baseAlpha})`)
        gradient.addColorStop(0.4, `rgba(${blob.color.r}, ${blob.color.g}, ${blob.color.b}, ${baseAlpha * 0.6})`)
        gradient.addColorStop(0.7, `rgba(${blob.color.r}, ${blob.color.g}, ${blob.color.b}, ${baseAlpha * 0.3})`)
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')

        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      })

      // Add subtle noise texture
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 8
        data[i] += noise
        data[i + 1] += noise
        data[i + 2] += noise
      }
      ctx.putImageData(imageData, 0, 0)

      animationId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={styles.auroraCanvas}
      aria-hidden="true"
    />
  )
}


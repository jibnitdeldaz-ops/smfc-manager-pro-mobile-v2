import * as THREE from 'three'

// Helper to create a placeholder texture with initials/text
export function createPlaceholderTexture(text: string, color: string = '#1a1a1a') {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 768 // Card ratio
    const ctx = canvas.getContext('2d')!

    // Background
    ctx.fillStyle = color
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Gradient Overlay
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)')
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Text
    ctx.font = 'bold 300px Inter, sans-serif'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text.substring(0, 2).toUpperCase(), canvas.width / 2, canvas.height / 2)

    // Border
    ctx.strokeStyle = '#F97316'
    ctx.lineWidth = 20
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20)

    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    return texture
}

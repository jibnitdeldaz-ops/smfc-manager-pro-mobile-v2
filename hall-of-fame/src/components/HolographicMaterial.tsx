import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'
import * as THREE from 'three'

const HolographicMaterial = shaderMaterial(
    {
        time: 0,
        color: new THREE.Color('#ffffff'),
        hover: 0,
        map: null,
    },
    // Vertex Shader
    `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
    // Fragment Shader
    `
    uniform float time;
    uniform float hover;
    uniform vec3 color;
    uniform sampler2D map;
    
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      // Basic Texture
      vec4 texColor = texture2D(map, vUv);
      
      // Fresnel Effect (Rim Light)
      vec3 viewDir = normalize(cameraPosition - vPosition);
      float fresnel = pow(1.0 - dot(viewDir, vNormal), 3.0);
      
      // Holographic Rainbow Foil
      float foil = sin(vPosition.y * 10.0 + time * 2.0) * 0.5 + 0.5;
      vec3 holographic = vec3(
        sin(vPosition.x * 10.0 + time), 
        sin(vPosition.y * 5.0 + time + 2.0), 
        sin(vPosition.z * 10.0 + time + 4.0)
      ) * 0.5 + 0.5;

      // Combine
      vec3 finalColor = texColor.rgb;
      finalColor += holographic * fresnel * hover * 0.5; // Only show heavy foil on hover
      finalColor += vec3(fresnel) * 0.2; // Always show subtle rim

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
)

extend({ HolographicMaterial })

export { HolographicMaterial }

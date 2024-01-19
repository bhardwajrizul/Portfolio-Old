const images = {
  img1: require('../public/img1_.jpg'),
  img2: require('../public/img2_.jpg'),
  img3: require('../public/img3_.jpg'),
  img4: require('../public/img4_.jpg'),
  img5: require('../public/img5_.jpg'),
  img6: require('../public/img6_.jpg'),
  img7: require('../public/img7_.jpg'),
  img8: require('../public/img8_.jpg'),
};

const work = require('../public/work_.png')

import * as THREE from 'three'
import { useRef, useState, useEffect } from 'react'
import { Canvas, extend, useFrame } from '@react-three/fiber'
import { Image, Environment, ScrollControls, useScroll, useTexture } from '@react-three/drei'
import { easing } from 'maath'

export const App = () => (
  <Canvas camera={{ position: [0, 0, 100], fov: .9 }}>
    <fog attach="fog" args={['#a79', 8.5, 1]} />
    {/* <ScrollControls pages={4} infinite> */}
    <Scene position={[0, 0, 0]} rotation={[0, 0, 0]} />
    <Banner position={[0, -0.15, 0]} />
    {/* </ScrollControls> */}
    {/* <Environment preset="dawn" background blur={0.5} /> */}
  </Canvas>
)

function Scene({ children, radius = 1.4, ...props }) {
  const ref = useRef();
  const [scrollY, setScrollY] = useState(0);
  const rotationVelocity = useRef(0);
  const prevScrollY = useRef(window.scrollY); // Initialize with the current scroll position
  const [hovered, setHovered] = useState(null); // Renamed hover to setHovered for clarity

  // Define the easing factor here
  const easingFactor = 0.9;

  useEffect(() => {
    const handleScroll = () => {
      const newScrollY = window.scrollY;
      setScrollY(newScrollY);
    };

    window.addEventListener('scroll', handleScroll);

    // Remove the event listener when the component unmounts
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useFrame((state, delta) => {
    // Calculate the scroll difference since the last frame
    const scrollDiff = scrollY - prevScrollY.current;
    prevScrollY.current = scrollY; // Update the previous scroll position

    // Update the rotation velocity based on the scroll difference
    rotationVelocity.current += scrollDiff * 0.01; // The 0.01 factor can be adjusted

    // Apply the easing to the rotation velocity
    rotationVelocity.current *= easingFactor;

    // Update the rotation based on the rotation velocity
    if (ref.current) {
      ref.current.rotation.y += rotationVelocity.current * delta;
    }

    // If the rotation velocity is below a small threshold, stop the rotation
    if (Math.abs(rotationVelocity.current) < 0.0001) {
      rotationVelocity.current = 0;
    }

    // Keep the camera looking at the center of the scene
    state.camera.lookAt(0, 0, 0);
  });

  // Render the cards with the correct hovered state
  return (
    <group ref={ref} {...props}>
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        return (
          <Card
            key={angle}
            onPointerOver={(e) => (e.stopPropagation(), setHovered(i))}
            onPointerOut={() => setHovered(null)}
            position={[Math.sin(angle) * radius, 0, Math.cos(angle) * radius]}
            rotation={[0, Math.PI + angle, 0]}
            active={hovered !== null}
            hovered={hovered === i}
            url={images[`img${Math.floor(i % 10) + 1}`]}
          />
        );
      })}
    </group>
  );
}


function Banner(props) {
  const ref = useRef()
  const texture = useTexture(work)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.anisotropy = 16
  texture.repeat.set(30, 1)
  useFrame((state, delta) => (ref.current.material.map.offset.x += delta / 3))
  return (
    <mesh ref={ref} {...props}>
      <cylinderGeometry args={[1.6, 1.6, 0.14, 128, 18, true]} />
      <meshSineMaterial map={texture} side={THREE.DoubleSide} toneMapped={false} />
    </mesh>
  )
}

function Card({ url, active, hovered, ...props }) {
  const ref = useRef()
  useFrame((state, delta) => {
    easing.damp3(ref.current.scale, hovered ? 1.15 : 1, 0.1, delta)
    easing.damp(ref.current.material, 'radius', hovered ? 0.25 : 0.1, 0.2, delta)
    easing.damp(ref.current.material, 'zoom', hovered ? 1 : 1.5, 0.2, delta)
  })
  return (
    <Image transparent radius={0.2} ref={ref} url={url} side={THREE.DoubleSide} {...props}>
      <bentPlaneGeometry args={[1, 1, 20, 20]} />
    </Image>
  )
}

// Paul West @prisoner849 https://discourse.threejs.org/u/prisoner849
// https://discourse.threejs.org/t/simple-curved-plane/26647/10
class BentPlaneGeometry extends THREE.PlaneGeometry {
  constructor(...args) {
    super(...args)
    const z = 0.1
    let p = this.parameters
    let hw = p.width * 0.5
    let a = new THREE.Vector2(-hw, 0)
    let b = new THREE.Vector2(0, z)
    let c = new THREE.Vector2(hw, 0)
    let ab = new THREE.Vector2().subVectors(a, b)
    let bc = new THREE.Vector2().subVectors(b, c)
    let ac = new THREE.Vector2().subVectors(a, c)
    let r = (ab.length() * bc.length() * ac.length()) / (2 * Math.abs(ab.cross(ac)))
    let center = new THREE.Vector2(0, z - r)
    let baseV = new THREE.Vector2().subVectors(a, center)
    let baseAngle = baseV.angle() - Math.PI * 0.5
    let arc = baseAngle * 2
    let uv = this.attributes.uv
    let pos = this.attributes.position
    let mainV = new THREE.Vector2()
    for (let i = 0; i < uv.count; i++) {
      let uvRatio = 1 - uv.getX(i)
      let y = pos.getY(i)
      mainV.copy(c).rotateAround(center, arc * uvRatio)
      pos.setXYZ(i, mainV.x, y, -mainV.y)
    }
    pos.needsUpdate = true
  }
}

class MeshSineMaterial extends THREE.MeshBasicMaterial {
  constructor(parameters = {}) {
    super(parameters)
    this.setValues(parameters)
  }
  onBeforeCompile(shader) {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      ` float noise = sin(uv.x * PI * 4.0) / 4.0;
        vec3 transformed = vec3(position.x, position.y + noise, position.z);`
    )
  }
}

extend({ MeshSineMaterial, BentPlaneGeometry })

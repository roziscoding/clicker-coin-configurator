<script lang="ts">
  import * as THREE from 'three'
  import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
  import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
  import { PALETTE } from './parts'
  import type { SlotId } from './parts'

  interface Props {
    selection: Record<string, string>
    visible: Record<string, boolean>
    spin?: boolean
    exploded?: boolean
  }
  let { selection, visible, spin = false, exploded = false }: Props = $props()

  let container: HTMLDivElement
  let scene: THREE.Scene
  let camera: THREE.PerspectiveCamera
  let renderer: THREE.WebGLRenderer
  let controls: OrbitControls
  let group: THREE.Group
  let clock: THREE.Clock | undefined
  let guideLine: THREE.Line | undefined
  const loader = new STLLoader()
  const geometryCache = new Map<string, THREE.BufferGeometry>()
  const meshes: Record<string, THREE.Mesh> = {} // slotId -> THREE.Mesh
  let loadToken = 0

  // How far each part is offset along the assembly axis in the exploded view.
  const EXPLODE: Record<string, number> = {
    bottom: 0,
    clicker: 8,
    wheel: 16,
    top: 25,
  }
  const LIFT = 24 // how high the tipped assembly floats above the ground plane
  let explodeT = 0 // animated 0 (assembled) → 1 (exploded)

  // Default camera framing + scratch vectors for the smooth camera moves.
  const DEFAULT_OFFSET = new THREE.Vector3(55, 46.5, 70) // camera relative to target
  const _localCenter = new THREE.Vector3()
  const _desired = new THREE.Vector3()
  const _delta = new THREE.Vector3()
  const _resetFrom = new THREE.Vector3()
  const _resetTo = new THREE.Vector3()
  const _resetTargetFrom = new THREE.Vector3()
  const _resetTargetTo = new THREE.Vector3()
  let resetting = false
  let resetT = 0

  // World-space center of the assembly for the current explode amount.
  function assemblyCenter(out: THREE.Vector3): THREE.Vector3 {
    _localCenter.set(0, 2 + 12 * explodeT, 0)
    out.copy(_localCenter)
    group.localToWorld(out)
    return out
  }

  // Plain (non-reactive) mirrors of props, read inside the rAF loop.
  let spinning = false
  let explodedFlag = false
  $effect(() => {
    spinning = spin
  })
  $effect(() => {
    explodedFlag = exploded
  })

  function loadGeometry(file: string): Promise<THREE.BufferGeometry> {
    const cached = geometryCache.get(file)
    if (cached) return Promise.resolve(cached)
    return new Promise((resolve, reject) => {
      loader.load(
        `${import.meta.env.BASE_URL}models/${file}`,
        (geo) => {
          geo.computeVertexNormals()
          geometryCache.set(file, geo)
          resolve(geo)
        },
        undefined,
        reject,
      )
    })
  }

  // The press-fit parts overlap by a fraction of a mm, so coincident faces
  // z-fight. Bias each part's depth by its place in the stack (cap pulled
  // forward, inner parts pushed back) so there's always a clear winner.
  const DEPTH_BIAS: Record<string, number> = {
    top: -1,
    wheel: 0,
    clicker: 1,
    bottom: 2,
  }

  function makeMaterial(slotId: string) {
    const bias = DEPTH_BIAS[slotId] ?? 0
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(PALETTE[slotId as SlotId]),
      metalness: 0.35,
      roughness: 0.45,
      envMapIntensity: 0.95,
      polygonOffset: bias !== 0,
      polygonOffsetFactor: bias,
      polygonOffsetUnits: bias,
    })
  }

  async function syncSlot(slotId: string) {
    const token = loadToken
    const file = selection[slotId]
    const existing = meshes[slotId]

    if (!file) {
      if (existing) {
        group.remove(existing)
        delete meshes[slotId]
      }
      return
    }

    const geo = await loadGeometry(file)
    if (token !== loadToken) return // selection changed mid-load

    if (existing) {
      existing.geometry = geo
    } else {
      const mesh = new THREE.Mesh(geo, makeMaterial(slotId))
      mesh.castShadow = true
      mesh.receiveShadow = true
      group.add(mesh)
      meshes[slotId] = mesh
    }
    meshes[slotId].visible = visible[slotId]
    render()
  }

  async function syncAll() {
    loadToken++
    await Promise.all(Object.keys(selection).map(syncSlot))
  }

  function applyVisibility() {
    for (const id of Object.keys(meshes)) {
      if (meshes[id]) meshes[id].visible = visible[id]
    }
    render()
  }

  function render() {
    if (renderer) renderer.render(scene, camera)
  }

  function init() {
    const w = container.clientWidth
    const h = container.clientHeight

    scene = new THREE.Scene()
    scene.background = new THREE.Color('#0a0c10')

    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(w, h)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    container.appendChild(renderer.domElement)

    // PBR environment for soft reflections on the metal-ish parts.
    const pmrem = new THREE.PMREMGenerator(renderer)
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture

    camera = new THREE.PerspectiveCamera(40, w / h, 0.5, 1000)
    camera.position.set(55, 48, 70)

    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.target.set(0, 1.5, 0)
    controls.minDistance = 25
    controls.maxDistance = 300
    controls.addEventListener('change', render)

    // Model space has Y up and parts roughly centered on X/Z at origin.
    group = new THREE.Group()
    scene.add(group)

    // Lighting
    const hemi = new THREE.HemisphereLight(0xcfe0ff, 0x202838, 0.6)
    scene.add(hemi)

    const key = new THREE.DirectionalLight(0xffffff, 2.2)
    key.position.set(40, 70, 35)
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    key.shadow.camera.near = 1
    key.shadow.camera.far = 250
    const s = 50
    key.shadow.camera.left = -s
    key.shadow.camera.right = s
    key.shadow.camera.top = s
    key.shadow.camera.bottom = -s
    key.shadow.bias = -0.0004
    scene.add(key)

    const fill = new THREE.DirectionalLight(0x88aaff, 0.6)
    fill.position.set(-50, 20, -30)
    scene.add(fill)

    // Ground shadow catcher, placed at the bottom of the assembly (Y ~ -2).
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      new THREE.ShadowMaterial({ opacity: 0.35 }),
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -2
    ground.receiveShadow = true
    scene.add(ground)

    // Subtle grid for ground reference
    const grid = new THREE.GridHelper(300, 60, 0x3a3320, 0x191b22)
    grid.position.y = -2
    scene.add(grid)

    // Dashed assembly axis — fades in for the exploded blueprint view.
    const guideGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -2, 0),
      new THREE.Vector3(0, 32, 0),
    ])
    guideLine = new THREE.Line(
      guideGeo,
      new THREE.LineDashedMaterial({
        color: 0x6cc6ff,
        transparent: true,
        opacity: 0,
        dashSize: 1.6,
        gapSize: 1.1,
      }),
    )
    guideLine.computeLineDistances()
    guideLine.visible = false
    group.add(guideLine) // lives in the group so it tips with the parts

    clock = new THREE.Clock()
    window.addEventListener('resize', onResize)
    animate()
  }

  function onResize() {
    if (!container || !renderer) return
    const w = container.clientWidth
    const h = container.clientHeight
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
    render()
  }

  let raf: number
  function animate() {
    raf = requestAnimationFrame(animate)
    const dt = clock ? clock.getDelta() : 0

    // Wheel keeps spinning regardless of assembled/exploded state.
    if (spinning && meshes.wheel) meshes.wheel.rotation.y -= dt * 1.1

    // Ease the explode amount toward its target (frame-rate independent).
    const eTarget = explodedFlag ? 1 : 0
    explodeT += (eTarget - explodeT) * (1 - Math.exp(-dt * 6))
    if (Math.abs(eTarget - explodeT) < 0.0008) explodeT = eTarget
    for (const id of Object.keys(meshes)) {
      if (meshes[id]) meshes[id].position.y = (EXPLODE[id] ?? 0) * explodeT
    }
    // Tip the assembly onto its side and float it above the ground as it pulls
    // apart, so the layers fan out horizontally like an exploded-parts diagram.
    group.rotation.z = explodeT * (-Math.PI / 2)
    group.position.y = LIFT * explodeT
    group.updateMatrixWorld()
    if (guideLine) {
      guideLine.visible = explodeT > 0.01
      ;(guideLine.material as THREE.LineDashedMaterial).opacity =
        explodeT * 0.55
    }

    // While the assembly is moving between states, pan the camera + target
    // together so its center stays in the middle of the view.
    if (explodeT !== eTarget && !resetting) {
      assemblyCenter(_desired)
      _delta.copy(_desired).sub(controls.target)
      controls.target.add(_delta)
      camera.position.add(_delta)
    }

    // Smooth one-shot camera reset.
    if (resetting) {
      resetT = Math.min(1, resetT + dt / 0.7)
      const e = 1 - Math.pow(1 - resetT, 3) // easeOutCubic
      camera.position.lerpVectors(_resetFrom, _resetTo, e)
      controls.target.lerpVectors(_resetTargetFrom, _resetTargetTo, e)
      if (resetT >= 1) resetting = false
    }

    controls.update()
    renderer.render(scene, camera)
  }

  // One-time setup. Must NOT read any reactive ($state) value, or Svelte would
  // re-run this effect — tearing down and rebuilding the renderer — on every
  // part swap, which orphans the cached meshes from the live scene.
  $effect(() => {
    init()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      controls?.dispose()
      renderer?.dispose()
      renderer?.domElement?.remove()
      for (const id of Object.keys(meshes)) delete meshes[id]
    }
  })

  // React to selection changes (also runs once on mount, after init above).
  $effect(() => {
    // touch every value so Svelte tracks them
    void Object.values(selection).join('|')
    if (scene) syncAll()
  })

  // React to visibility changes
  $effect(() => {
    void Object.values(visible).join('|')
    if (scene) applyVisibility()
  })

  // Animate back to the default angle/zoom, recentered on the assembly's
  // current center (works whether assembled or exploded).
  export function resetView() {
    if (!controls || !group) return
    group.updateMatrixWorld()
    _resetTargetFrom.copy(controls.target)
    assemblyCenter(_resetTargetTo)
    _resetFrom.copy(camera.position)
    _resetTo.copy(_resetTargetTo).add(DEFAULT_OFFSET)
    resetT = 0
    resetting = true
  }
</script>

<div class="viewer" bind:this={container}></div>

<style>
  .viewer {
    width: 100%;
    height: 100%;
    position: relative;
  }
  .viewer :global(canvas) {
    display: block;
  }
</style>

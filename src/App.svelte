<script lang="ts">
  import Viewer from './lib/Viewer.svelte'
  import { SLOTS, PALETTE, PRINTABLES } from './lib/parts'
  import type { Slot, SlotId, PartOption } from './lib/parts'

  const clickerSlot = SLOTS.find((s) => s.id === 'clicker')!

  // Default file for a slot — the clicker resolves from its shape/resistance.
  function defaultFile(slot: Slot): string {
    if (slot.kind === 'clicker') return slot.files!.hollow.regular
    return slot.options![0].file
  }

  // selection: slotId -> filename ; default to each slot's first option
  let selection = $state<Record<string, string>>(
    Object.fromEntries(SLOTS.map((s) => [s.id, defaultFile(s)])),
  )
  let visible = $state<Record<string, boolean>>(
    Object.fromEntries(SLOTS.map((s) => [s.id, true])),
  )

  // The clicker is a shape (hollow/solid/hex) plus a resistance toggle.
  let clickerShape = $state('hollow')
  let clickerHR = $state(false)
  let clickerShapeLabel = $derived(
    clickerSlot.shapes!.find((s) => s.id === clickerShape)?.label,
  )
  // Keep selection.clicker resolved from shape + resistance.
  $effect(() => {
    selection.clicker =
      clickerSlot.files![clickerShape][clickerHR ? 'hr' : 'regular']
  })

  let viewer: { resetView: () => void } | undefined = $state()
  let spinWheel = $state(false)
  let exploded = $state(false)
  let showDownload = $state(false)

  const MODEL_URL =
    'https://www.printables.com/model/1614520-fidget-toy-clicker-coin-v2'
  const FILES_URL = `${MODEL_URL}/files`
  const FOLDER_ORDER = ['Base Model', 'Extra Modifications']

  interface BuildFile {
    id: SlotId
    title: string
  }
  interface BuildGroup {
    folder: string
    files: BuildFile[]
  }

  // The selected parts grouped by their Printables folder, each with the file's
  // display title as shown on the Files tab.
  let buildGroups = $derived.by<BuildGroup[]>(() => {
    const groups: Record<string, BuildFile[]> = {}
    for (const s of SLOTS) {
      const file = selection[s.id]
      const meta = PRINTABLES[file]
      if (!meta) continue
      ;(groups[meta.folder] ??= []).push({ id: s.id, title: meta.title })
    }
    return FOLDER_ORDER.filter((f) => groups[f]).map((f) => ({
      folder: f,
      files: groups[f],
    }))
  })
  let buildCount = $derived(buildGroups.reduce((n, g) => n + g.files.length, 0))

  // Top + bottom are the two halves of the case and share the same variants
  // (standard / vented / duo). Linked by default so they change as a set; the
  // toggle below unlinks them for mixing.
  let linked = $state(true)

  const SLOT_CODE: Record<SlotId, string> = {
    bottom: 'BTM',
    clicker: 'CLK',
    wheel: 'WHL',
    top: 'TOP',
  }
  const isCase = (id: SlotId) => id === 'top' || id === 'bottom'

  function selOpt(slot: Slot): PartOption | undefined {
    return slot.options?.find((o) => o.file === selection[slot.id])
  }

  function optById(
    slotId: SlotId,
    optId: string | undefined,
  ): PartOption | undefined {
    const slot = SLOTS.find((s) => s.id === slotId)
    return slot?.options?.find((o) => o.id === optId)
  }

  // Choose a variant; when linked, mirror the choice across the case halves.
  function pick(slot: Slot, opt: PartOption) {
    selection[slot.id] = opt.file
    if (linked && isCase(slot.id)) {
      const otherId: SlotId = slot.id === 'top' ? 'bottom' : 'top'
      const twin = optById(otherId, opt.id)
      if (twin) selection[otherId] = twin.file
    }
  }

  function toggleLink() {
    linked = !linked
    if (linked) {
      // Re-linking: align the bottom to whatever the top currently is.
      const topId = selOpt(SLOTS.find((s) => s.id === 'top')!)?.id
      const twin = optById('bottom', topId)
      if (twin) selection.bottom = twin.file
    }
  }

  let visibleCount = $derived(SLOTS.filter((s) => visible[s.id]).length)

  const randItem = <T,>(arr: T[]): T =>
    arr[Math.floor(Math.random() * arr.length)]

  function randomize() {
    for (const s of SLOTS) {
      if (s.kind === 'clicker') {
        clickerShape = randItem(s.shapes!).id
        clickerHR = Math.random() < 0.5
      } else {
        selection[s.id] = randItem(s.options!).file
      }
    }
    // Respect the case link: mirror the bottom to the (random) top.
    if (linked) {
      const topId = selOpt(SLOTS.find((s) => s.id === 'top')!)?.id
      const twin = optById('bottom', topId)
      if (twin) selection.bottom = twin.file
    }
  }

  function reset() {
    for (const s of SLOTS) {
      if (s.kind !== 'clicker') selection[s.id] = s.options![0].file
      visible[s.id] = true
    }
    clickerShape = 'hollow'
    clickerHR = false
    linked = true
  }
</script>

<main>
  <aside class="console">
    <div class="grain"></div>

    <header class="head">
      <span class="brk tl"></span><span class="brk tr"></span>
      <span class="brk bl"></span><span class="brk br"></span>
      <div class="head-top">
        <span class="reticle">+</span>
        <span class="head-tag">MODEL&nbsp;NO. FTC-V2</span>
      </div>
      <h1>CLICKER<span>·</span>COIN</h1>
      <p class="sub">Modular assembly configurator</p>
      <div class="readout">
        <span><b>04</b> modules</span>
        <span class="sep">/</span>
        <span><b>18</b> parts</span>
        <span class="sep">/</span>
        <span><b>{visibleCount}</b>·4 shown</span>
      </div>
      <button
        class="link-toggle"
        class:on={linked}
        onclick={toggleLink}
        title="Change top &amp; bottom as a matched set"
      >
        <span class="lt-sw"><span class="lt-knob"></span></span>
        <span class="lt-text">LINK&nbsp;CASE</span>
        <span class="lt-state">{linked ? 'TOP ⇄ BTM' : 'INDEPENDENT'}</span>
      </button>
    </header>

    <div class="modules">
      {#each SLOTS as slot, i}
        <section class="module" style="animation-delay:{i * 70}ms">
          <div class="bar">
            <span class="idx">{String(i + 1).padStart(2, '0')}</span>
            <span class="tick" style="--c:{PALETTE[slot.id]}"></span>
            <h2>{slot.label}</h2>
            {#if linked && isCase(slot.id)}
              <span class="linkbadge" title="Linked to the other case half"
                >⇄</span
              >
            {/if}
            <button
              class="vis"
              class:off={!visible[slot.id]}
              title={visible[slot.id] ? 'Hide module' : 'Show module'}
              onclick={() => (visible[slot.id] = !visible[slot.id])}
            >
              <span class="led"></span>
              {visible[slot.id] ? 'VIS' : 'OFF'}
            </button>
          </div>
          <p class="blurb">{slot.blurb}</p>
          {#if slot.kind === 'clicker'}
            <div class="chips">
              {#each slot.shapes as shape}
                <button
                  class="chip"
                  class:active={clickerShape === shape.id}
                  style="--c:{PALETTE.clicker}"
                  onclick={() => (clickerShape = shape.id)}
                >
                  {shape.label}{#if shape.tag}<span class="chip-tag"
                      >{shape.tag}</span
                    >{/if}
                </button>
              {/each}
            </div>
            <button
              class="link-toggle hr-toggle"
              class:on={clickerHR}
              onclick={() => (clickerHR = !clickerHR)}
              title="Switch the selected clicker between regular and high-resistance"
            >
              <span class="lt-sw"><span class="lt-knob"></span></span>
              <span class="lt-text">HIGH&nbsp;RESISTANCE</span>
              <span class="lt-state">{clickerHR ? 'FIRM' : 'STANDARD'}</span>
            </button>
          {:else}
            <div class="chips">
              {#each slot.options as opt}
                <button
                  class="chip"
                  class:active={selOpt(slot)?.id === opt.id}
                  style="--c:{PALETTE[slot.id]}"
                  onclick={() => pick(slot, opt)}
                >
                  {opt.label}{#if opt.tag}<span class="chip-tag">{opt.tag}</span
                    >{/if}
                </button>
              {/each}
            </div>
          {/if}
        </section>
      {/each}
    </div>

    <section class="credit">
      <div class="credit-top">
        <span class="credit-eyebrow">3D model designed by</span>
        <a
          class="credit-author"
          href="https://www.printables.com/@Tranch"
          target="_blank"
          rel="noopener noreferrer"
        >
          Tranch
        </a>
      </div>
      <a
        class="credit-cta"
        href="https://www.printables.com/model/1614520-fidget-toy-clicker-coin-v2"
        target="_blank"
        rel="noopener noreferrer"
      >
        View on Printables <span class="credit-arrow">↗</span>
      </a>
    </section>

    <footer class="foot">
      <button class="key primary" onclick={() => (showDownload = true)}>
        <span>⤓</span> DOWNLOAD&nbsp;BUILD
      </button>
      <button class="key" onclick={randomize}>
        <span>⚄</span> RANDOMIZE&nbsp;BUILD
      </button>
      <div class="foot-row">
        <button class="key" onclick={() => viewer?.resetView()}>
          <span>⟲</span> RESET&nbsp;VIEW
        </button>
        <button class="key" onclick={reset}>
          <span>⌫</span> RESET&nbsp;BUILD
        </button>
      </div>
    </footer>
  </aside>

  <div class="stage">
    <Viewer
      bind:this={viewer}
      {selection}
      {visible}
      spin={spinWheel}
      {exploded}
    />

    <span class="cb cb-tl"></span><span class="cb cb-tr"></span>
    <span class="cb cb-bl"></span><span class="cb cb-br"></span>

    <div class="tag tag-tl">ISO · PERSPECTIVE</div>
    <div class="tag tag-tr">STL · {visibleCount} ACTIVE</div>

    <button
      class="spin-toggle"
      class:on={spinWheel}
      onclick={() => (spinWheel = !spinWheel)}
      title="Spin the wheel"
    >
      <span class="spin-ico" style="color:{spinWheel ? '#ff5630' : '#3ddc84'}">
        {spinWheel ? '■' : '▶'}
      </span>
      {spinWheel ? 'SPINNING' : 'SPIN WHEEL'}
    </button>

    <div class="build">
      <div class="build-label">CURRENT BUILD</div>
      <div class="build-rows">
        {#each SLOTS as slot}
          <div class="build-row" class:dim={!visible[slot.id]}>
            <span class="bc" style="--c:{PALETTE[slot.id]}"></span>
            <span class="bk">{SLOT_CODE[slot.id]}</span>
            <span class="bv">
              {#if slot.id === 'clicker'}
                {clickerShapeLabel + (clickerHR ? ' · Firm' : '')}
              {:else}
                {selOpt(slot)?.label}
              {/if}
            </span>
            {#if !visible[slot.id]}<span class="bh">hidden</span>{/if}
          </div>
        {/each}
      </div>
    </div>

    <button
      class="explode-toggle"
      class:on={exploded}
      onclick={() => (exploded = !exploded)}
      title="Toggle exploded view"
    >
      <span class="explode-ico">{exploded ? '⇣' : '⇡'}</span>
      {exploded ? 'ASSEMBLE' : 'DISASSEMBLE'}
    </button>

    <div class="hint">DRAG orbit · SCROLL zoom · RMB pan</div>
  </div>

  {#if showDownload}
    <div
      class="modal-overlay"
      onclick={() => (showDownload = false)}
      role="presentation"
    >
      <div
        class="modal"
        onclick={(e) => e.stopPropagation()}
        role="presentation"
      >
        <span class="brk tl"></span><span class="brk tr"></span>
        <span class="brk bl"></span><span class="brk br"></span>
        <button
          class="modal-close"
          onclick={() => (showDownload = false)}
          title="Close">×</button
        >

        <span class="modal-eyebrow">GET THE STL FILES</span>
        <h2 class="modal-title">Download this build</h2>
        <p class="modal-intro">
          These parts are designed by <strong>Tranch</strong> and hosted on
          Printables. Download them from there — and please
          <span class="heart">❤</span>
          the model to support the maker.
        </p>

        <div class="file-list">
          {#each buildGroups as group}
            <div class="folder">
              <div class="folder-head">
                <span class="folder-ico"></span>
                {group.folder}
                <span class="folder-count">{group.files.length}</span>
              </div>
              {#each group.files as f}
                <div class="file-row">
                  <span class="file-tick" style="--c:{PALETTE[f.id]}"></span>
                  <span class="file-name">{f.title}</span>
                  <span class="file-stl">STL</span>
                </div>
              {/each}
            </div>
          {/each}
        </div>

        <p class="modal-note">
          Open the <strong>Files</strong> tab on Printables and download these
          {buildCount} parts from the folders shown above.
        </p>

        <div class="modal-actions">
          <a
            class="modal-btn primary"
            href={FILES_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Files on Printables <span>↗</span>
          </a>
          <a
            class="modal-btn"
            href={MODEL_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span class="heart">❤</span> Like the model <span>↗</span>
          </a>
        </div>
      </div>
    </div>
  {/if}
</main>

<svelte:window
  onkeydown={(e) => e.key === 'Escape' && (showDownload = false)}
/>

<style>
  main {
    display: grid;
    grid-template-columns: 384px 1fr;
    height: 100vh;
    width: 100vw;
  }

  /* ---------- CONSOLE PANEL ---------- */
  .console {
    position: relative;
    display: flex;
    flex-direction: column;
    background:
      linear-gradient(180deg, var(--panel-2), var(--panel) 140px), var(--panel);
    border-right: 1px solid var(--line-bright);
    overflow: hidden;
  }
  /* faint scanline texture */
  .grain {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image: repeating-linear-gradient(
      0deg,
      rgba(255, 255, 255, 0.015) 0,
      rgba(255, 255, 255, 0.015) 1px,
      transparent 1px,
      transparent 3px
    );
    z-index: 5;
    mix-blend-mode: overlay;
  }

  .head {
    position: relative;
    padding: 24px 24px 18px;
    border-bottom: 1px solid var(--line);
    background: radial-gradient(
      120% 80% at 0% 0%,
      rgba(255, 176, 32, 0.08),
      transparent 60%
    );
  }
  .brk {
    position: absolute;
    width: 9px;
    height: 9px;
    border-color: var(--amber);
    border-style: solid;
    opacity: 0.8;
  }
  .brk.tl {
    top: 8px;
    left: 8px;
    border-width: 1px 0 0 1px;
  }
  .brk.tr {
    top: 8px;
    right: 8px;
    border-width: 1px 1px 0 0;
  }
  .brk.bl {
    bottom: 8px;
    left: 8px;
    border-width: 0 0 1px 1px;
  }
  .brk.br {
    bottom: 8px;
    right: 8px;
    border-width: 0 1px 1px 0;
  }

  .head-top {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }
  .reticle {
    color: var(--amber);
    font-weight: 600;
    line-height: 1;
  }
  .head-tag {
    font-size: 10.5px;
    letter-spacing: 0.18em;
    color: var(--muted);
  }

  h1 {
    font-family: 'Chakra Petch', sans-serif;
    margin: 0;
    font-size: 30px;
    font-weight: 700;
    letter-spacing: 0.04em;
    line-height: 1;
    color: var(--ink);
    text-shadow: 0 0 28px rgba(255, 176, 32, 0.12);
  }
  h1 span {
    color: var(--amber);
    margin: 0 1px;
  }
  .sub {
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--ink-dim);
    margin: 8px 0 0;
  }
  .readout {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 14px;
    font-size: 11px;
    letter-spacing: 0.1em;
    color: var(--muted);
    text-transform: uppercase;
  }
  .readout b {
    color: var(--amber-bright);
    font-weight: 600;
  }
  .readout .sep {
    color: var(--line-bright);
  }

  /* link top/bottom toggle */
  .link-toggle {
    display: flex;
    align-items: center;
    gap: 9px;
    width: 100%;
    margin-top: 14px;
    padding: 8px 10px;
    font-family: inherit;
    font-size: 10px;
    letter-spacing: 0.14em;
    color: var(--ink-dim);
    background: var(--panel-2);
    border: 1px solid var(--line-bright);
    border-radius: 5px;
    cursor: pointer;
    transition:
      border-color 0.16s ease,
      background 0.16s ease;
  }
  .link-toggle:hover {
    border-color: var(--amber-deep);
  }
  .link-toggle.on {
    border-color: rgba(255, 176, 32, 0.4);
    background: rgba(255, 176, 32, 0.06);
  }
  .lt-sw {
    position: relative;
    width: 30px;
    height: 16px;
    border-radius: 9px;
    background: #050608;
    border: 1px solid var(--line-bright);
    flex: none;
    transition: border-color 0.16s ease;
  }
  .link-toggle.on .lt-sw {
    border-color: var(--amber-deep);
    background: rgba(255, 176, 32, 0.16);
  }
  .lt-knob {
    position: absolute;
    top: 1px;
    left: 1px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--muted);
    transition:
      transform 0.18s cubic-bezier(0.3, 0.7, 0.2, 1),
      background 0.16s ease;
  }
  .link-toggle.on .lt-knob {
    transform: translateX(14px);
    background: var(--amber);
    box-shadow: 0 0 8px var(--amber);
  }
  .lt-text {
    color: var(--ink);
    font-weight: 500;
  }
  .lt-state {
    margin-left: auto;
    color: var(--muted);
  }
  .link-toggle.on .lt-state {
    color: var(--amber-bright);
  }

  .linkbadge {
    font-size: 11px;
    color: var(--amber);
    opacity: 0.85;
    margin-right: 2px;
    line-height: 1;
  }

  /* ---------- MODULES ---------- */
  .modules {
    flex: 1;
    overflow-y: auto;
    padding: 6px 0 10px;
  }
  .modules::-webkit-scrollbar {
    width: 10px;
  }
  .modules::-webkit-scrollbar-track {
    background: transparent;
  }
  .modules::-webkit-scrollbar-thumb {
    background: var(--line-bright);
    border: 3px solid var(--panel);
    border-radius: 10px;
  }

  .module {
    position: relative;
    padding: 16px 24px 18px;
    border-bottom: 1px solid var(--line);
    opacity: 0;
    transform: translateY(8px);
    animation: rise 0.5s cubic-bezier(0.2, 0.7, 0.2, 1) forwards;
  }
  @keyframes rise {
    to {
      opacity: 1;
      transform: none;
    }
  }

  .bar {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .idx {
    font-size: 11px;
    font-weight: 600;
    color: var(--amber);
    background: rgba(255, 176, 32, 0.08);
    border: 1px solid rgba(255, 176, 32, 0.25);
    padding: 2px 6px;
    border-radius: 3px;
    letter-spacing: 0.05em;
  }
  .tick {
    width: 8px;
    height: 8px;
    background: var(--c);
    box-shadow: 0 0 9px var(--c);
    border-radius: 2px;
  }
  .bar h2 {
    font-family: 'Chakra Petch', sans-serif;
    margin: 0;
    flex: 1;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ink);
  }
  .vis {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: inherit;
    font-size: 10px;
    letter-spacing: 0.12em;
    color: var(--ink-dim);
    background: var(--panel-2);
    border: 1px solid var(--line-bright);
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.14s ease;
  }
  .vis .led {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--amber);
    box-shadow: 0 0 7px var(--amber);
  }
  .vis:hover {
    border-color: var(--amber-deep);
  }
  .vis.off {
    color: var(--muted);
  }
  .vis.off .led {
    background: var(--line-bright);
    box-shadow: none;
  }

  .blurb {
    margin: 9px 0 13px 2px;
    font-size: 11.5px;
    line-height: 1.5;
    color: var(--muted);
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .chip {
    position: relative;
    font-family: inherit;
    font-size: 11.5px;
    letter-spacing: 0.02em;
    color: var(--ink-dim);
    background: var(--panel-2);
    border: 1px solid var(--line-bright);
    padding: 7px 11px;
    border-radius: 4px;
    cursor: pointer;
    transition:
      border-color 0.14s ease,
      color 0.14s ease,
      background 0.14s ease,
      transform 0.06s ease;
  }
  .chip:hover {
    color: var(--ink);
    border-color: var(--muted);
    background: #141922;
  }
  .chip:active {
    transform: translateY(1px);
  }
  .chip.active {
    color: #0b0d12;
    font-weight: 600;
    background: linear-gradient(
      180deg,
      var(--c),
      color-mix(in srgb, var(--c) 78%, #000)
    );
    border-color: color-mix(in srgb, var(--c) 60%, #fff);
    box-shadow:
      0 0 0 1px color-mix(in srgb, var(--c) 40%, transparent),
      0 4px 14px -4px var(--c);
  }
  .chip-tag {
    font-size: 8.5px;
    letter-spacing: 0.1em;
    opacity: 0.65;
    margin-left: 6px;
    vertical-align: 1px;
  }

  /* high-resistance toggle reuses the link-toggle styling, tighter spacing */
  .hr-toggle {
    margin-top: 8px;
  }

  /* ---------- ATTRIBUTION ---------- */
  .credit {
    padding: 14px 16px;
    border-top: 1px solid var(--line);
    background:
      radial-gradient(
        120% 100% at 100% 0%,
        rgba(255, 176, 32, 0.06),
        transparent 60%
      ),
      var(--panel-2);
  }
  .credit-top {
    display: flex;
    align-items: baseline;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 10px;
  }
  .credit-eyebrow {
    font-size: 10px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .credit-author {
    font-family: 'Chakra Petch', sans-serif;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 0.03em;
    color: var(--amber-bright);
    text-decoration: none;
    border-bottom: 1px solid transparent;
    transition:
      border-color 0.14s ease,
      color 0.14s ease;
  }
  .credit-author:hover {
    color: #ffd27a;
    border-bottom-color: currentColor;
  }
  .credit-cta {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    text-decoration: none;
    font-size: 11.5px;
    letter-spacing: 0.1em;
    color: var(--ink);
    background: var(--panel);
    border: 1px solid var(--line-bright);
    border-radius: 6px;
    padding: 9px;
    transition: all 0.14s ease;
  }
  .credit-cta:hover {
    color: #0b0d12;
    background: linear-gradient(180deg, var(--amber-bright), var(--amber));
    border-color: var(--amber-deep);
  }
  .credit-arrow {
    font-size: 13px;
  }

  /* ---------- FOOTER ---------- */
  .foot {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 14px;
    border-top: 1px solid var(--line);
    background: var(--panel-2);
  }
  .foot-row {
    display: flex;
    gap: 8px;
  }
  .key.primary {
    color: #0b0d12;
    font-weight: 600;
    background: linear-gradient(180deg, var(--amber-bright), var(--amber));
    border-color: var(--amber-deep);
    box-shadow: 0 4px 16px -6px var(--amber);
  }
  .key.primary span {
    color: #0b0d12;
  }
  .key.primary:hover {
    color: #0b0d12;
    background: linear-gradient(180deg, #ffd27a, var(--amber-bright));
    border-color: var(--amber-deep);
  }
  .key {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-family: inherit;
    font-size: 11px;
    letter-spacing: 0.12em;
    color: var(--ink-dim);
    background: var(--panel);
    border: 1px solid var(--line-bright);
    border-bottom-width: 2px;
    padding: 10px;
    border-radius: 5px;
    cursor: pointer;
    transition: all 0.14s ease;
  }
  .key span {
    color: var(--amber);
    font-size: 13px;
  }
  .key:hover {
    color: var(--ink);
    border-color: var(--amber-deep);
    background: #12161e;
  }
  .key:active {
    transform: translateY(1px);
    border-bottom-width: 1px;
  }

  /* ---------- STAGE / HUD ---------- */
  .stage {
    position: relative;
    overflow: hidden;
    background: radial-gradient(110% 90% at 50% 25%, #131722 0%, var(--bg) 72%);
  }

  /* corner crosshair brackets */
  .cb {
    position: absolute;
    width: 22px;
    height: 22px;
    border: 1px solid var(--line-bright);
    pointer-events: none;
    z-index: 3;
  }
  .cb-tl {
    top: 18px;
    left: 18px;
    border-width: 1px 0 0 1px;
  }
  .cb-tr {
    top: 18px;
    right: 18px;
    border-width: 1px 1px 0 0;
  }
  .cb-bl {
    bottom: 18px;
    left: 18px;
    border-width: 0 0 1px 1px;
  }
  .cb-br {
    bottom: 18px;
    right: 18px;
    border-width: 0 1px 1px 0;
  }

  .tag {
    position: absolute;
    top: 24px;
    font-size: 10px;
    letter-spacing: 0.18em;
    color: var(--muted);
    z-index: 3;
    pointer-events: none;
  }
  .tag-tl {
    left: 50px;
  }
  .tag-tr {
    right: 50px;
    color: var(--amber-deep);
  }

  .spin-toggle {
    position: absolute;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 4;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-family: inherit;
    font-size: 10.5px;
    letter-spacing: 0.16em;
    color: var(--ink-dim);
    background: rgba(10, 12, 16, 0.6);
    backdrop-filter: blur(6px);
    border: 1px solid var(--line-bright);
    padding: 7px 14px;
    border-radius: 20px;
    cursor: pointer;
    transition: all 0.16s ease;
  }
  .spin-toggle:hover {
    color: var(--ink);
    border-color: var(--amber-deep);
  }
  .spin-toggle.on {
    color: var(--ink);
    border-color: color-mix(in srgb, #ff5630 55%, var(--line-bright));
    box-shadow: 0 0 16px -4px #ff5630;
  }
  .spin-ico {
    display: inline-block;
    font-size: 10px;
    line-height: 1;
  }

  .explode-toggle {
    position: absolute;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 4;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-family: inherit;
    font-size: 10.5px;
    letter-spacing: 0.16em;
    color: var(--ink-dim);
    background: rgba(10, 12, 16, 0.6);
    backdrop-filter: blur(6px);
    border: 1px solid var(--line-bright);
    padding: 8px 16px;
    border-radius: 20px;
    cursor: pointer;
    transition: all 0.16s ease;
  }
  .explode-toggle:hover {
    color: var(--ink);
    border-color: #3a6f8c;
  }
  .explode-toggle.on {
    color: #cdeeff;
    border-color: color-mix(in srgb, #6cc6ff 55%, var(--line-bright));
    box-shadow: 0 0 18px -3px #6cc6ff;
  }
  .explode-ico {
    font-size: 13px;
    line-height: 1;
    color: var(--amber);
  }
  .explode-toggle.on .explode-ico {
    color: #6cc6ff;
  }

  .build {
    position: absolute;
    left: 34px;
    bottom: 30px;
    z-index: 3;
    background: rgba(10, 12, 16, 0.55);
    backdrop-filter: blur(6px);
    border: 1px solid var(--line);
    border-left: 2px solid var(--amber);
    border-radius: 4px;
    padding: 11px 14px 12px;
    min-width: 196px;
  }
  .build-label {
    font-size: 9.5px;
    letter-spacing: 0.22em;
    color: var(--muted);
    margin-bottom: 9px;
  }
  .build-rows {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .build-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    letter-spacing: 0.04em;
    transition: opacity 0.2s ease;
  }
  .build-row.dim {
    opacity: 0.4;
  }
  .bc {
    width: 7px;
    height: 7px;
    border-radius: 2px;
    background: var(--c);
    box-shadow: 0 0 6px var(--c);
    flex: none;
  }
  .bk {
    color: var(--muted);
    width: 30px;
  }
  .bv {
    color: var(--ink);
  }
  .bh {
    color: var(--amber-deep);
    font-size: 9px;
    letter-spacing: 0.12em;
    margin-left: auto;
    padding-left: 8px;
  }

  .hint {
    position: absolute;
    bottom: 30px;
    right: 34px;
    z-index: 3;
    font-size: 10px;
    letter-spacing: 0.14em;
    color: var(--muted);
    pointer-events: none;
  }

  /* ---------- DOWNLOAD MODAL ---------- */
  .modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: rgba(5, 7, 11, 0.7);
    backdrop-filter: blur(4px);
    animation: fade 0.16s ease;
  }
  @keyframes fade {
    from {
      opacity: 0;
    }
  }
  .modal {
    position: relative;
    width: 100%;
    max-width: 460px;
    background: linear-gradient(180deg, var(--panel-2), var(--panel) 160px);
    border: 1px solid var(--line-bright);
    border-radius: 10px;
    padding: 26px 26px 22px;
    box-shadow: 0 24px 70px -20px #000;
    animation: pop 0.18s cubic-bezier(0.2, 0.7, 0.2, 1);
  }
  @keyframes pop {
    from {
      opacity: 0;
      transform: translateY(10px) scale(0.98);
    }
  }
  .modal-close {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    font-size: 18px;
    line-height: 1;
    color: var(--ink-dim);
    background: transparent;
    border: 1px solid var(--line-bright);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.14s ease;
  }
  .modal-close:hover {
    color: var(--ink);
    border-color: var(--amber-deep);
  }

  .modal-eyebrow {
    font-size: 10px;
    letter-spacing: 0.2em;
    color: var(--amber);
  }
  .modal-title {
    font-family: 'Chakra Petch', sans-serif;
    font-size: 23px;
    font-weight: 700;
    letter-spacing: 0.02em;
    margin: 8px 0 0;
  }
  .modal-intro {
    font-size: 12.5px;
    line-height: 1.6;
    color: var(--ink-dim);
    margin: 12px 0 18px;
  }
  .modal-intro strong {
    color: var(--ink);
  }
  .heart {
    color: #ff5630;
  }

  .file-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
    border-top: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
    padding: 16px 0;
  }
  .folder-head {
    display: flex;
    align-items: center;
    gap: 9px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.06em;
    color: var(--ink);
    margin-bottom: 9px;
  }
  .folder-ico {
    width: 15px;
    height: 12px;
    flex: none;
    border: 1.5px solid var(--amber);
    border-radius: 2px;
    border-top-left-radius: 0;
    position: relative;
  }
  .folder-ico::before {
    content: '';
    position: absolute;
    top: -4px;
    left: -1.5px;
    width: 7px;
    height: 4px;
    border: 1.5px solid var(--amber);
    border-bottom: none;
    border-top-left-radius: 2px;
    border-top-right-radius: 3px;
  }
  .folder-count {
    margin-left: auto;
    font-size: 10px;
    color: var(--muted);
    background: var(--panel);
    border: 1px solid var(--line-bright);
    border-radius: 10px;
    padding: 1px 8px;
  }
  .file-row {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 5px 0 5px 6px;
    margin-left: 6px;
    border-left: 1px solid var(--line-bright);
  }
  .file-tick {
    width: 9px;
    height: 9px;
    border-radius: 2px;
    background: var(--c);
    box-shadow: 0 0 8px var(--c);
    flex: none;
    margin-left: 6px;
  }
  .file-name {
    flex: 1;
    min-width: 0;
    font-size: 13px;
    color: var(--ink);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .file-stl {
    flex: none;
    font-size: 9px;
    letter-spacing: 0.1em;
    color: var(--muted);
    background: var(--panel);
    border: 1px solid var(--line-bright);
    border-radius: 3px;
    padding: 2px 5px;
  }

  .modal-note {
    font-size: 11.5px;
    line-height: 1.55;
    color: var(--muted);
    margin: 14px 0 18px;
  }
  .modal-note strong {
    color: var(--ink-dim);
  }

  .modal-actions {
    display: flex;
    flex-direction: column;
    gap: 9px;
  }
  .modal-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    text-decoration: none;
    font-size: 12.5px;
    letter-spacing: 0.06em;
    color: var(--ink);
    background: var(--panel);
    border: 1px solid var(--line-bright);
    border-radius: 7px;
    padding: 11px;
    transition: all 0.14s ease;
  }
  .modal-btn:hover {
    border-color: var(--muted);
    background: #141922;
  }
  .modal-btn.primary {
    color: #0b0d12;
    font-weight: 600;
    background: linear-gradient(180deg, var(--amber-bright), var(--amber));
    border-color: var(--amber-deep);
  }
  .modal-btn.primary:hover {
    background: linear-gradient(180deg, #ffd27a, var(--amber-bright));
  }

  @media (max-width: 760px) {
    main {
      grid-template-columns: 1fr;
      grid-template-rows: 48% 52%;
    }
    .build {
      left: 22px;
      bottom: 22px;
    }
    .hint {
      display: none;
    }
  }
</style>

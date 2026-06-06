// Each slot is one swappable layer of the assembly. All STLs share a single
// coordinate frame and are already positioned to assemble, so a selected part
// just needs to be loaded at its native coordinates.
//
// Vertical (Y) stack in model space:
//   bottom  ~ Y[-2.0, 4.66]   (the housing/base everything sits in)
//   clicker ~ Y[ 0.0, 3.25]   (the button, nested inside the wheel)
//   wheel   ~ Y[ 0.0, 3.00]   (the spinning ring)
//   top     ~ Y[ 3.0, 5.00]   (the cap)

export type SlotId = 'top' | 'wheel' | 'clicker' | 'bottom'

export interface PrintablesEntry {
  folder: string
  title: string
}

export interface PartOption {
  id: string
  label: string
  tag?: string
  file: string
}

export interface ClickerShape {
  id: string
  label: string
  tag?: string
}

export type ClickerFiles = Record<string, { regular: string; hr: string }>

export interface Slot {
  id: SlotId
  label: string
  blurb: string
  /** Present only on the clicker, which is a shape × resistance matrix. */
  kind?: 'clicker'
  options?: PartOption[]
  shapes?: ClickerShape[]
  files?: ClickerFiles
}

// File → { folder, title } exactly as the parts appear on the Printables
// "Files" tab, so the download modal can mirror that nested structure.
export const PRINTABLES: Record<string, PrintablesEntry> = {
  'top.stl': { folder: 'Base Model', title: 'Top' },
  'clicker.stl': { folder: 'Base Model', title: 'Clicker' },
  'wheel.stl': { folder: 'Base Model', title: 'Wheel' },
  'bottom.stl': { folder: 'Base Model', title: 'Bottom' },
  'top-duo.stl': { folder: 'Extra Modifications', title: 'Top - Duo' },
  'bottom-duo.stl': { folder: 'Extra Modifications', title: 'Bottom - Duo' },
  'bottom-vented.stl': {
    folder: 'Extra Modifications',
    title: 'Bottom - Vented',
  },
  'top-vented.stl': { folder: 'Extra Modifications', title: 'Top - Vented' },
  'clicker-high-resistance-hollow.stl': {
    folder: 'Extra Modifications',
    title: 'Clicker - High Resistance (Hollow)',
  },
  'clicker-high-resistance-solid.stl': {
    folder: 'Extra Modifications',
    title: 'Clicker - High Resistance (Solid)',
  },
  'clicker-high-resistance-solid-hex.stl': {
    folder: 'Extra Modifications',
    title: 'Clicker - High Resistance (Solid Hex)',
  },
  'clicker-solid.stl': {
    folder: 'Extra Modifications',
    title: 'Clicker - Solid',
  },
  'clicker-solid-hex.stl': {
    folder: 'Extra Modifications',
    title: 'Clicker - Solid (Hex)',
  },
  'wheel-2-star.stl': {
    folder: 'Extra Modifications',
    title: 'Wheel 2 - Star',
  },
  'wheel-3-squared.stl': {
    folder: 'Extra Modifications',
    title: 'Wheel 3 - Squared',
  },
  'wheel-4-sprocket.stl': {
    folder: 'Extra Modifications',
    title: 'Wheel 4 - Sprocket',
  },
  'wheel-5-orbit.stl': {
    folder: 'Extra Modifications',
    title: 'Wheel 5 - Orbit',
  },
  'wheel-6-cog.stl': { folder: 'Extra Modifications', title: 'Wheel 6 - Cog' },
}

// "Hazard" — industrial signage palette: amber + cream + warning-red on a dark
// slate base. Bold contrast that still lives in the amber/charcoal console.
export const PALETTE: Record<SlotId, string> = {
  top: '#3d4754', // dark slate (case)
  wheel: '#e8e4d8', // cream / bone
  clicker: '#ff5630', // warning red
  bottom: '#3d4754', // dark slate (case) — twins with top
}

// Ordered top-to-bottom to match the physical stack: cap, ring, button, base.
export const SLOTS: Slot[] = [
  {
    id: 'top',
    label: 'Top',
    blurb: 'The cap. Hide it to see inside.',
    options: [
      { id: 'standard', label: 'Solid', tag: 'STD', file: 'top.stl' },
      { id: 'vented', label: 'Vented', file: 'top-vented.stl' },
      { id: 'duo', label: 'Duo (double)', file: 'top-duo.stl' },
    ],
  },
  {
    id: 'wheel',
    label: 'Wheel',
    blurb: 'The spinning ring — picks the shape.',
    options: [
      { id: 'standard', label: 'Wavy', tag: 'STD', file: 'wheel.stl' },
      { id: 'star', label: 'Star', file: 'wheel-2-star.stl' },
      { id: 'squared', label: 'Squared', file: 'wheel-3-squared.stl' },
      { id: 'sprocket', label: 'Sprocket', file: 'wheel-4-sprocket.stl' },
      { id: 'orbit', label: 'Orbit', file: 'wheel-5-orbit.stl' },
      { id: 'cog', label: 'Cog', file: 'wheel-6-cog.stl' },
    ],
  },
  {
    id: 'clicker',
    label: 'Clicker',
    blurb: 'The button. Pick a core, then dial the resistance.',
    // The clicker is a 3×2 matrix: each shape comes in a regular and a
    // high-resistance (firmer click) version, toggled separately.
    kind: 'clicker',
    shapes: [
      { id: 'hollow', label: 'Hollow', tag: 'STD' },
      { id: 'solid', label: 'Solid' },
      { id: 'hex', label: 'Hex' },
    ],
    files: {
      hollow: {
        regular: 'clicker.stl',
        hr: 'clicker-high-resistance-hollow.stl',
      },
      solid: {
        regular: 'clicker-solid.stl',
        hr: 'clicker-high-resistance-solid.stl',
      },
      hex: {
        regular: 'clicker-solid-hex.stl',
        hr: 'clicker-high-resistance-solid-hex.stl',
      },
    },
  },
  {
    id: 'bottom',
    label: 'Bottom',
    blurb: 'The housing the rest sits in.',
    options: [
      { id: 'standard', label: 'Solid', tag: 'STD', file: 'bottom.stl' },
      { id: 'vented', label: 'Vented', file: 'bottom-vented.stl' },
      { id: 'duo', label: 'Duo (double)', file: 'bottom-duo.stl' },
    ],
  },
]

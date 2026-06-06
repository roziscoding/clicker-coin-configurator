import { describe, it, expect } from 'vitest'
import { SLOTS, PALETTE, PRINTABLES } from './parts'

// These guard the data integrity the UI and download modal rely on: every
// selectable STL must have a Printables entry, and every slot must have a color.

describe('parts data', () => {
  it('every list-slot option maps to a Printables file', () => {
    for (const slot of SLOTS) {
      if (slot.kind === 'clicker') continue
      for (const opt of slot.options ?? []) {
        expect(
          PRINTABLES[opt.file],
          `missing PRINTABLES entry: ${opt.file}`,
        ).toBeTruthy()
      }
    }
  })

  it('every clicker matrix file (shape × resistance) maps to a Printables file', () => {
    const clicker = SLOTS.find((s) => s.id === 'clicker')!
    for (const shape of clicker.shapes ?? []) {
      for (const res of ['regular', 'hr'] as const) {
        const file = clicker.files![shape.id][res]
        expect(file, `missing clicker file: ${shape.id}/${res}`).toBeTruthy()
        expect(
          PRINTABLES[file],
          `missing PRINTABLES entry: ${file}`,
        ).toBeTruthy()
      }
    }
  })

  it('has a palette color for every slot', () => {
    for (const slot of SLOTS) {
      expect(PALETTE[slot.id], `missing palette color: ${slot.id}`).toBeTruthy()
    }
  })

  it('every Printables entry has a folder and a title', () => {
    for (const [file, meta] of Object.entries(PRINTABLES)) {
      expect(meta.folder, `${file} missing folder`).toBeTruthy()
      expect(meta.title, `${file} missing title`).toBeTruthy()
    }
  })
})

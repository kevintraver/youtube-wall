import { describe, expect, it } from 'vitest'
import { parseLink } from '../parseLink'

const ID = 'dQw4w9WgXcQ'
const UC = 'UC4R8DWoMoI7CAwX8_LjQHig'

describe('parseLink', () => {
  it.each([
    [ID],
    [`https://www.youtube.com/watch?v=${ID}`],
    [`https://youtube.com/watch?v=${ID}&t=42s`],
    [`youtube.com/watch?v=${ID}`],
    [`https://m.youtube.com/watch?v=${ID}`],
    [`https://youtu.be/${ID}?si=abc`],
    [`https://www.youtube.com/live/${ID}?feature=share`],
    [`https://www.youtube.com/shorts/${ID}`],
    [`https://www.youtube.com/embed/${ID}`],
    [`https://www.youtube-nocookie.com/embed/${ID}`],
    [`  https://www.youtube.com/watch?v=${ID}  `],
  ])('video: %s', (input) => {
    expect(parseLink(input)).toEqual({ ok: true, source: { kind: 'video', id: ID } })
  })

  it.each([
    [UC],
    [`https://www.youtube.com/channel/${UC}`],
    [`https://www.youtube.com/channel/${UC}/live`],
    [`https://www.youtube.com/embed/live_stream?channel=${UC}`],
  ])('channel: %s', (input) => {
    expect(parseLink(input)).toEqual({ ok: true, source: { kind: 'channel', id: UC } })
  })

  it.each([
    ['@LofiGirl', 'lofigirl'],
    ['https://www.youtube.com/@LofiGirl', 'lofigirl'],
    ['https://www.youtube.com/@LofiGirl/live', 'lofigirl'],
    ['youtube.com/@nasa/streams', 'nasa'],
  ])('handle: %s', (input, handle) => {
    expect(parseLink(input)).toEqual({ ok: true, source: { kind: 'handle', handle } })
  })

  it.each([
    [''],
    ['hello world'],
    ['https://vimeo.com/123456'],
    ['https://www.youtube.com/'],
    ['https://www.youtube.com/watch?v=short'],
    ['https://youtu.be/'],
    ['https://www.youtube.com/channel/notachannel'],
  ])('rejects: %s', (input) => {
    expect(parseLink(input).ok).toBe(false)
  })
})

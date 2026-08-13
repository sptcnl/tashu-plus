import type { LatLng } from '../types'

const EARTH_RADIUS_M = 6_371_000

/** 두 좌표 사이 거리(미터). 지도를 얼마나 옮겼는지 판단하는 용도. */
export function distanceM(a: LatLng, b: LatLng): number {
  const p1 = (a.lat * Math.PI) / 180
  const p2 = (b.lat * Math.PI) / 180
  const dp = p2 - p1
  const dl = ((b.lng - a.lng) * Math.PI) / 180
  const h =
    Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}

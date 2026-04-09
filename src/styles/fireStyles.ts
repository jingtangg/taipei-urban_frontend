/**
 * 消防設施圖層樣式定義
 *
 * 職責:
 * - 集中管理消防栓與消防局的 OL Style 物件
 * - 與圖層邏輯解耦，修改美工只需改這一個檔案
 */

import { Style, Circle as CircleStyle, Fill, Stroke, RegularShape } from 'ol/style'
import type { FeatureLike } from 'ol/Feature'

/**
 * 消防栓樣式（依 hydrant_type 動態切換顏色）
 * - aboveground（地上式）：青綠色 + 菱形實心
 * - underground（地下式）：水藍色 + 菱形空心
 */
export function hydrantStyle(feature: FeatureLike): Style[] {
  const hydrantType = feature.get('hydrant_type')
  const accentColor = hydrantType === 'aboveground'
    ? 'rgba(74, 255, 220, 0.95)'
    : 'rgba(94, 231, 255, 0.95)'

  return [
    new Style({
      image: new CircleStyle({
        radius: 8,
        fill:   new Fill({ color: 'rgba(74, 255, 220, 0.08)' }),
        stroke: new Stroke({ color: 'rgba(74, 255, 220, 0.22)', width: 1 }),
      }),
    }),
    new Style({
      image: new CircleStyle({
        radius: 4.5,
        fill:   new Fill({ color: 'rgba(6, 12, 11, 0.88)' }),
        stroke: new Stroke({ color: accentColor, width: 1.2 }),
      }),
    }),
    new Style({
      image: new RegularShape({
        points:  4,
        radius:  hydrantType === 'aboveground' ? 2.2 : 2.8,
        radius2: hydrantType === 'aboveground' ? 0.8 : undefined,
        angle:   Math.PI / 4,
        fill:    new Fill({
          color: hydrantType === 'aboveground' ? accentColor : 'rgba(6, 12, 11, 0.92)',
        }),
        stroke: hydrantType === 'aboveground'
          ? undefined
          : new Stroke({ color: accentColor, width: 1 }),
      }),
    }),
  ]
}

/**
 * 消防局樣式（靜態，所有消防局外觀一致）
 * 三層疊加：外發光圈 → 菱形框 → 中心圓點
 */
export const stationStyle: Style[] = [
  new Style({
    image: new CircleStyle({
      radius: 12,
      fill:   new Fill({ color: 'rgba(255, 116, 160, 0.10)' }),
      stroke: new Stroke({ color: 'rgba(255, 116, 160, 0.20)', width: 1.2 }),
    }),
  }),
  new Style({
    image: new RegularShape({
      points: 4,
      radius: 8.5,
      angle:  Math.PI / 4,
      fill:   new Fill({ color: 'rgba(8, 9, 11, 0.92)' }),
      stroke: new Stroke({ color: 'rgba(255, 116, 160, 0.95)', width: 1.4 }),
    }),
  }),
  new Style({
    image: new CircleStyle({
      radius: 3.2,
      fill:   new Fill({ color: 'rgba(255, 231, 238, 0.96)' }),
      stroke: new Stroke({ color: 'rgba(255, 116, 160, 0.9)', width: 1 }),
    }),
  }),
]

import { describe, expect, it } from 'vitest';
import {
  alignNodes,
  distributeNodes,
  snapToGrid,
  type AlignableNode,
} from './alignment';

describe('Alignment Domain Functions (F014)', () => {
  describe('snapToGrid', () => {
    it('snaps to the nearest 20px grid point by default', () => {
      expect(snapToGrid({ x: 12, y: 8 })).toEqual({ x: 20, y: 0 });
      expect(snapToGrid({ x: 9, y: 11 })).toEqual({ x: 0, y: 20 });
    });

    it('respects a custom grid size', () => {
      expect(snapToGrid({ x: 37, y: 63 }, 25)).toEqual({ x: 25, y: 75 });
    });

    it('is idempotent on already-snapped positions', () => {
      expect(snapToGrid({ x: 40, y: 100 })).toEqual({ x: 40, y: 100 });
    });
  });

  describe('alignNodes', () => {
    const nodes: AlignableNode[] = [
      { id: 'a', position: { x: 0, y: 0 }, width: 100, height: 50 },
      { id: 'b', position: { x: 50, y: 200 }, width: 50, height: 100 },
      { id: 'c', position: { x: 300, y: 40 }, width: 20, height: 20 },
    ];

    it('returns an empty array for empty input', () => {
      expect(alignNodes([], 'left')).toEqual([]);
    });

    it('aligns left to the minimum leading edge', () => {
      expect(alignNodes(nodes, 'left')).toEqual([
        { x: 0, y: 0 },
        { x: 0, y: 200 },
        { x: 0, y: 40 },
      ]);
    });

    it('aligns right to the maximum trailing edge', () => {
      // right edges: a=100, b=100, c=320 -> target = 320
      expect(alignNodes(nodes, 'right')).toEqual([
        { x: 220, y: 0 },
        { x: 270, y: 200 },
        { x: 300, y: 40 },
      ]);
    });

    it('aligns top to the minimum top edge', () => {
      expect(alignNodes(nodes, 'top')).toEqual([
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 300, y: 0 },
      ]);
    });

    it('aligns bottom to the maximum bottom edge', () => {
      // bottom edges: a=50, b=300, c=60 -> target = 300
      expect(alignNodes(nodes, 'bottom')).toEqual([
        { x: 0, y: 250 },
        { x: 50, y: 200 },
        { x: 300, y: 280 },
      ]);
    });

    it('centers horizontally on the average horizontal center', () => {
      // centers: a=50, b=75, c=310 -> avg = 145
      expect(alignNodes(nodes, 'centerH')).toEqual([
        { x: 95, y: 0 },
        { x: 120, y: 200 },
        { x: 135, y: 40 },
      ]);
    });

    it('centers vertically on the average vertical center', () => {
      // centers: a=25, b=250, c=50 -> avg = 108.33...
      const result = alignNodes(nodes, 'centerV');
      expect(result[0]!.y).toBeCloseTo(83.3333, 3);
      expect(result[1]!.y).toBeCloseTo(58.3333, 3);
      expect(result[2]!.y).toBeCloseTo(98.3333, 3);
      // x positions untouched
      expect(result.map((p) => p.x)).toEqual([0, 50, 300]);
    });

    it('does not throw on very large selections (avoids Math.min/max argument-spread limits)', () => {
      // Spreading >~65536 args into Math.min/Math.max throws a RangeError in
      // most JS engines; alignNodes must reduce instead of spreading.
      const big: AlignableNode[] = Array.from({ length: 70_000 }, (_, i) => ({
        id: `n${i}`,
        position: { x: i, y: 0 },
        width: 10,
      }));
      expect(() => alignNodes(big, 'right')).not.toThrow();
      expect(() => alignNodes(big, 'left')).not.toThrow();
    });

    it('treats missing width/height as zero-dimension', () => {
      const noDims: AlignableNode[] = [
        { id: 'a', position: { x: 0, y: 0 } },
        { id: 'b', position: { x: 40, y: 40 } },
      ];
      expect(alignNodes(noDims, 'right')).toEqual([
        { x: 40, y: 0 },
        { x: 40, y: 40 },
      ]);
    });
  });

  describe('distributeNodes', () => {
    it('leaves nodes unchanged when fewer than 3 are given', () => {
      const nodes: AlignableNode[] = [
        { id: 'a', position: { x: 0, y: 0 } },
        { id: 'b', position: { x: 500, y: 0 } },
      ];
      expect(distributeNodes(nodes, 'horizontal')).toEqual([
        { x: 0, y: 0 },
        { x: 500, y: 0 },
      ]);
    });

    it('distributes horizontally with equal gaps, preserving input order', () => {
      const nodes: AlignableNode[] = [
        { id: 'c', position: { x: 300, y: 0 }, width: 20 }, // right=320
        { id: 'a', position: { x: 0, y: 0 }, width: 100 }, // left=0
        { id: 'b', position: { x: 150, y: 0 }, width: 50 }, // right=200
      ];
      // sorted by left: a(0,100) b(150,50->right 200) c(300,20->right 320)
      // span = 320 - 0 = 320; totalWidth = 100+50+20=170; gap=(320-170)/2=75
      // a: x=0 -> cursor=0+100+75=175
      // b: x=175 -> cursor=175+50+75=300
      // c: x=300
      const result = distributeNodes(nodes, 'horizontal');
      expect(result).toEqual([
        { x: 300, y: 0 }, // c (original input order)
        { x: 0, y: 0 }, // a
        { x: 175, y: 0 }, // b
      ]);
    });

    it('distributes vertically with equal gaps, preserving input order', () => {
      const nodes: AlignableNode[] = [
        { id: 'a', position: { x: 0, y: 0 }, height: 100 }, // top=0, bottom=100
        { id: 'b', position: { x: 0, y: 400 }, height: 50 }, // bottom=450
        { id: 'c', position: { x: 0, y: 200 }, height: 50 }, // bottom=250
      ];
      // sorted by top: a(0,100) c(200,50->250) b(400,50->450)
      // span=450-0=450; totalHeight=100+50+50=200; gap=(450-200)/2=125
      // a: y=0 -> cursor=0+100+125=225
      // c: y=225 -> cursor=225+50+125=400
      // b: y=400
      const result = distributeNodes(nodes, 'vertical');
      expect(result).toEqual([
        { x: 0, y: 0 }, // a
        { x: 0, y: 400 }, // b
        { x: 0, y: 225 }, // c
      ]);
    });
  });
});

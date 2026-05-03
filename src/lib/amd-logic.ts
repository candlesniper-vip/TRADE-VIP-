export type ZoneType = 'Accumulation' | 'Manipulation' | 'Distribution' | 'None';

export interface Zone {
  type: ZoneType;
  minPrice: number;
  maxPrice: number;
  color: string;
}

export interface SRLevel {
  price: number;
  type: 'Support' | 'Resistance';
  color: string;
}

export function detectAMD(data: { high: number; low: number; close: number }[], lookback = 30): Zone[] {
  if (data.length < lookback * 2) return [];

  // Very simplified algorithmic AMD detection
  // 1. Accumulation: finding the most concentrated price area in the lookback window
  let recentData = data.slice(-lookback);
  let maxH = Math.max(...recentData.map(d => d.high));
  let minL = Math.min(...recentData.map(d => d.low));
  
  // Define accumulation as the inner 50% of the recent range
  const range = maxH - minL;
  const accMin = minL + range * 0.25;
  const accMax = maxH - range * 0.25;

  // Manipulation: A sudden grab of liquidity outside the accumulation zone
  // We'll define two manipulation zones (above and below the accumulation)
  const manUpMin = accMax;
  const manUpMax = maxH;
  
  const manDownMin = minL;
  const manDownMax = accMin;

  // Distribution: The trend away from accumulation. We will create projection zones.
  const distUpMin = maxH;
  const distUpMax = maxH + range;

  const distDownMin = minL - range;
  const distDownMax = minL;

  return [
    { type: 'Accumulation', minPrice: accMin, maxPrice: accMax, color: '#FFD700' }, // Yellow
    { type: 'Manipulation', minPrice: manUpMin, maxPrice: manUpMax, color: '#FF4444' }, // Red (Up)
    { type: 'Manipulation', minPrice: manDownMin, maxPrice: manDownMax, color: '#FF4444' }, // Red (Down)
    { type: 'Distribution', minPrice: distUpMin, maxPrice: distUpMax, color: '#00C851' }, // Green (Up)
    { type: 'Distribution', minPrice: distDownMin, maxPrice: distDownMax, color: '#00C851' }, // Green (Down)
  ];
}

export function detectSR(data: { high: number; low: number; close: number }[]): SRLevel[] {
  const levels: SRLevel[] = [];
  const pivotWindow = 20;

  if (data.length < pivotWindow * 2 + 1) {
    // Fallback if not enough data
    let maxH = Math.max(...data.map(d => d.high));
    let minL = Math.min(...data.map(d => d.low));
    if (data.length > 0) {
      return [
        { price: maxH, type: 'Resistance', color: '#FFD700' },
        { price: minL, type: 'Support', color: '#FFD700' }
      ];
    }
    return levels;
  }

  let resistances: number[] = [];
  let supports: number[] = [];

  for (let i = pivotWindow; i < data.length - pivotWindow; i++) {
    let isResistance = true;
    let isSupport = true;
    for (let j = 1; j <= pivotWindow; j++) {
      if (data[i - j].high > data[i].high || data[i + j].high > data[i].high) {
        isResistance = false;
      }
      if (data[i - j].low < data[i].low || data[i + j].low < data[i].low) {
        isSupport = false;
      }
    }
    
    if (isResistance) resistances.push(data[i].high);
    if (isSupport) supports.push(data[i].low);
  }

  // Get the most recent 2 resistances and 2 supports
  resistances = resistances.slice(-2);
  supports = supports.slice(-2);

  // If no pivots found with window, fallback to highest/lowest
  if (resistances.length === 0) resistances.push(Math.max(...data.map(d => d.high)));
  if (supports.length === 0) supports.push(Math.min(...data.map(d => d.low)));

  resistances.forEach(r => levels.push({ price: r, type: 'Resistance', color: '#FFD700' }));
  supports.forEach(s => levels.push({ price: s, type: 'Support', color: '#FFD700' }));

  return levels;
}

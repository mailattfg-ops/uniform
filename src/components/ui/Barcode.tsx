'use client';

import React from 'react';

interface BarcodeProps {
  value: string;
  height?: number;
  barWidth?: number;
  wideRatio?: number;
  showText?: boolean;
  className?: string;
}

const CODE39_PATTERNS: Record<string, string> = {
  '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000',
  '4': '000110001', '5': '100110000', '6': '001110000', '7': '000100101',
  '8': '100100100', '9': '001100100',
  'A': '100001001', 'B': '001001001', 'C': '101001000', 'D': '000011001',
  'E': '100011000', 'F': '001011000', 'G': '000001101', 'H': '100001100',
  'I': '001001100', 'J': '000011100', 'K': '100000011', 'L': '001000011',
  'M': '101000010', 'N': '000010011', 'O': '100010010', 'P': '001010010',
  'Q': '000000111', 'R': '100000110', 'S': '001000110', 'T': '000010110',
  'U': '110000001', 'V': '011000001', 'W': '111000000', 'X': '010010001',
  'Y': '110010000', 'Z': '011010000',
  '-': '010000101', '.': '110000100', ' ': '011000100',
  '$': '010101000', '/': '010100010', '+': '010001010', '%': '000101010',
  '*': '010010100'
};

export const Barcode: React.FC<BarcodeProps> = ({
  value,
  height = 70,
  barWidth = 2,
  wideRatio = 2.5,
  showText = true,
  className = ''
}) => {
  if (!value) return null;

  // Clean value for standard Code 39
  // Allow A-Z, 0-9, and -, ., $, /, +, %, space
  let cleanValue = value.toUpperCase();
  
  // Format with start/stop asterisk indicators if they are not already there
  let barcodeValue = cleanValue;
  if (!barcodeValue.startsWith('*')) barcodeValue = '*' + barcodeValue;
  if (!barcodeValue.endsWith('*')) barcodeValue = barcodeValue + '*';

  const narrowWidth = barWidth;
  const wideWidth = barWidth * wideRatio;

  // Calculate paths and elements
  const rects: React.ReactNode[] = [];
  let xOffset = 10; // Left margin padding inside SVG

  for (let c = 0; c < barcodeValue.length; c++) {
    const char = barcodeValue[c];
    const pattern = CODE39_PATTERNS[char];

    if (!pattern) {
      // If we encounter an invalid character, skip or draw a small narrow space
      xOffset += narrowWidth;
      continue;
    }

    // A Code 39 character pattern is 9 elements: 5 bars (even indices) and 4 spaces (odd indices)
    for (let i = 0; i < 9; i++) {
      const isBar = i % 2 === 0;
      const isWide = pattern[i] === '1';
      const width = isWide ? wideWidth : narrowWidth;

      if (isBar) {
        rects.push(
          <rect
            key={`char-${c}-elem-${i}`}
            x={xOffset}
            y={5}
            width={width}
            height={height}
            fill="#000000"
          />
        );
      }

      xOffset += width;
    }

    // Draw standard inter-character gap (always narrow space)
    xOffset += narrowWidth;
  }

  const svgWidth = xOffset + 10; // Right margin padding inside SVG
  const svgHeight = height + (showText ? 30 : 10);

  return (
    <div className={`flex flex-col items-center justify-center bg-white p-2 rounded-lg ${className}`}>
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        width="100%"
        height="100%"
        style={{ maxWidth: `${svgWidth}px` }}
        className="block"
      >
        {rects}
        {showText && (
          <text
            x={svgWidth / 2}
            y={height + 22}
            textAnchor="middle"
            fill="#1a1d21"
            className="text-xs font-mono font-bold tracking-[0.25em]"
          >
            {cleanValue}
          </text>
        )}
      </svg>
    </div>
  );
};

export default Barcode;

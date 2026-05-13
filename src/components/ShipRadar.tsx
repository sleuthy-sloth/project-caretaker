import React, { useEffect, useRef } from 'react';
import { ShipState } from '../lib/types';

interface ShipRadarProps {
  shipState: ShipState | null;
}

export function ShipRadar({ shipState }: ShipRadarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let angle = 0;

    // A slightly more complex wedge shape for the ship
    const vertices = [
      { x: 0, y: 0, z: 2 }, // 0: nose
      { x: 0.5, y: 0.2, z: 1 }, // 1: top right front
      { x: -0.5, y: 0.2, z: 1 }, // 2: top left front
      { x: 0.5, y: -0.2, z: 1 }, // 3: bottom right front
      { x: -0.5, y: -0.2, z: 1 }, // 4: bottom left front
      { x: 1.5, y: 0, z: -0.5 }, // 5: right wing tip
      { x: -1.5, y: 0, z: -0.5 }, // 6: left wing tip
      { x: 0.5, y: 0.2, z: -1 }, // 7: top right back
      { x: -0.5, y: 0.2, z: -1 }, // 8: top left back
      { x: 0.5, y: -0.2, z: -1 }, // 9: bottom right back
      { x: -0.5, y: -0.2, z: -1 }, // 10: bottom left back
    ];

    const edges = [
      // Nose connections
      [0, 1], [0, 2], [0, 3], [0, 4],
      // Front face
      [1, 2], [3, 4], [1, 3], [2, 4],
      // Body length connections
      [1, 7], [2, 8], [3, 9], [4, 10],
      // Back face
      [7, 8], [9, 10], [7, 9], [8, 10],
      // Right wing
      [1, 5], [7, 5], [3, 5], [9, 5],
      // Left wing
      [2, 6], [8, 6], [4, 6], [10, 6]
    ];

    const draw = () => {
      // Setup canvas scaling for crisp lines
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Radar rings
      const centerX = width / 2;
      const centerY = height / 2;
      const maxRadius = Math.min(width, height) / 2 - 10;

      ctx.strokeStyle = 'rgba(0, 230, 27, 0.3)'; // Dim green for grid
      ctx.lineWidth = 1;

      // Draw concentric circles
      for (let i = 1; i <= 4; i++) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, (maxRadius / 4) * i, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw crosshairs
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - maxRadius);
      ctx.lineTo(centerX, centerY + maxRadius);
      ctx.moveTo(centerX - maxRadius, centerY);
      ctx.lineTo(centerX + maxRadius, centerY);
      ctx.stroke();

      // Draw blips (fake data for immersion)
      ctx.fillStyle = '#00e61b';
      const blipAngle1 = angle * 0.5 + Math.PI / 4;
      const blipAngle2 = -angle * 0.3 + Math.PI;
      
      ctx.beginPath();
      ctx.arc(centerX + Math.cos(blipAngle1) * maxRadius * 0.6, centerY + Math.sin(blipAngle1) * maxRadius * 0.6, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(centerX + Math.cos(blipAngle2) * maxRadius * 0.3, centerY + Math.sin(blipAngle2) * maxRadius * 0.3, 2, 0, Math.PI * 2);
      ctx.fill();

      // 3D Ship wireframe rendering
      ctx.strokeStyle = '#00e61b'; // Bright green for ship
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 4;
      ctx.shadowColor = '#00e61b';

      const scale = maxRadius * 0.35; // Scale ship relative to radar
      
      // Rotation matrices (slowly rotating on Y and slightly on X axis for 3D effect)
      const rotY = angle * 0.5; // rotate around Y
      const rotX = Math.PI / 8; // slight tilt forward to see top

      const projected = vertices.map(v => {
        // Rotate around Y
        const x1 = v.x * Math.cos(rotY) - v.z * Math.sin(rotY);
        const z1 = v.x * Math.sin(rotY) + v.z * Math.cos(rotY);
        
        // Rotate around X
        const y1 = v.y * Math.cos(rotX) - z1 * Math.sin(rotX);
        const z2 = v.y * Math.sin(rotX) + z1 * Math.cos(rotX);

        // Simple orthographic projection
        return {
          x: x1 * scale + centerX,
          y: y1 * scale + centerY
        };
      });

      // Draw edges
      ctx.beginPath();
      edges.forEach(edge => {
        const start = projected[edge[0]];
        const end = projected[edge[1]];
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
      });
      ctx.stroke();
      
      // Reset shadow for next frame
      ctx.shadowBlur = 0;

      angle += 0.01;
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative w-full aspect-square max-w-sm mx-auto bg-black border border-[#00e61b]/30 rounded overflow-hidden p-4 text-[#00e61b] font-mono select-none border-glow-muted">
      {/* Scanline overlay */}
      <div className="absolute inset-0 z-20 pointer-events-none opacity-20" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, #00e61b 2px, #00e61b 4px)" }}></div>
      
      {/* Radar sweeping beam (CSS animation) */}
      <div className="absolute inset-0 z-10 pointer-events-none mix-blend-screen overflow-hidden">
        <div className="w-full h-full rounded-full" style={{ 
          background: 'conic-gradient(from 0deg, rgba(0, 230, 27, 0) 0%, rgba(0, 230, 27, 0.05) 70%, rgba(0, 230, 27, 0.4) 100%)',
          animation: 'spin 4s linear infinite',
          transformOrigin: 'center'
        }}></div>
      </div>

      <style>
        {`
          @keyframes spin {
            100% { transform: rotate(360deg); }
          }
        `}
      </style>

      {/* Top data row */}
      <div className="absolute top-4 left-4 right-4 z-30 flex justify-between text-[10px] tracking-widest text-glow">
        <span>HULL INTEGRITY: {shipState ? shipState.hull : '--'}%</span>
        <span>RADAR SCAN: ACTIVE</span>
      </div>

      {/* The canvas rendering the 3D ship and grid */}
      <div className="absolute inset-4 z-0 flex items-center justify-center">
        <canvas 
          ref={canvasRef} 
          width={300} 
          height={300} 
          className="w-full h-full max-w-[300px] max-h-[300px]"
        />
      </div>

      {/* Bottom data row */}
      <div className="absolute bottom-4 left-4 right-4 z-30 flex justify-between text-[10px] tracking-widest text-glow">
        <span>SECTOR 7G</span>
        <span>SYSTEM DIAGNOSTIC</span>
      </div>
    </div>
  );
}

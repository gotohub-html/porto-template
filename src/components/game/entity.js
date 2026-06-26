// Entity silhouette — a spindly wire/bacteria creature drawn to a 256x512 canvas
// with a walk-cycle, used as the texture on a camera-facing billboard. Salvaged
// from the old BackroomsWorkspace.

export const ENTITY_W = 256;
export const ENTITY_H = 512;

export const drawEntity = (g, walkPhase, speedFactor) => {
  g.clearRect(0, 0, ENTITY_W, ENTITY_H);

  // Soft dark aura
  const aura = g.createRadialGradient(128, 230, 20, 128, 230, 210);
  aura.addColorStop(0, "rgba(5, 5, 3, 0.65)");
  aura.addColorStop(1, "rgba(5, 5, 3, 0)");
  g.fillStyle = aura;
  g.fillRect(0, 0, ENTITY_W, ENTITY_H);

  const cx = 128;
  const swing = Math.sin(walkPhase);
  const cosSwing = Math.cos(walkPhase);

  const headY = 112;
  const neckY = 142;
  const chestX = cx;
  const chestY = 175;
  const hipX = cx;
  const hipY = 300;

  const leftShoulderX = cx - 24;
  const leftShoulderY = 180;
  const rightShoulderX = cx + 24;
  const rightShoulderY = 180;

  const swingScale = Math.min(speedFactor * 0.8, 1.0);
  const legSwing = swing * 26 * swingScale;
  const armSwing = swing * 22 * swingScale;
  const elbowSwing = cosSwing * 12 * swingScale;

  const leftKneeX = cx - 22 + legSwing * 0.4;
  const leftFootX = cx - 18 + legSwing;
  const rightKneeX = cx + 22 - legSwing * 0.4;
  const rightFootX = cx + 18 - legSwing;
  const leftKneeY = 385;
  const leftFootY = 480;
  const rightKneeY = 385;
  const rightFootY = 480;

  const leftElbowX = cx - 42 - elbowSwing;
  const leftHandX = cx - 36 - armSwing;
  const rightElbowX = cx + 42 + elbowSwing;
  const rightHandX = cx + 36 + armSwing;
  const leftElbowY = 270;
  const leftHandY = 375;
  const rightElbowY = 270;
  const rightHandY = 375;

  const drawWireSegment = (x1, y1, x2, y2, wiresCount, baseWidth, color) => {
    g.strokeStyle = color;
    g.lineCap = "round";
    g.lineJoin = "round";
    for (let i = 0; i < wiresCount; i++) {
      const ox1 = (Math.random() - 0.5) * 5;
      const oy1 = (Math.random() - 0.5) * 5;
      const ox2 = (Math.random() - 0.5) * 5;
      const oy2 = (Math.random() - 0.5) * 5;
      g.lineWidth = baseWidth * (0.6 + Math.random() * 0.6);
      g.beginPath();
      g.moveTo(x1 + ox1, y1 + oy1);
      const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * 8;
      const my = (y1 + y2) / 2 + (Math.random() - 0.5) * 8;
      g.quadraticCurveTo(mx, my, x2 + ox2, y2 + oy2);
      g.stroke();
    }
  };

  const wireColor = "rgba(45, 43, 35, 0.95)";
  const wireCoreColor = "rgba(22, 21, 17, 0.98)";

  // Legs
  drawWireSegment(cx - 14, hipY, leftKneeX, leftKneeY, 4, 3.5, wireColor);
  drawWireSegment(leftKneeX, leftKneeY, leftFootX, leftFootY, 4, 3.0, wireColor);
  drawWireSegment(leftFootX, leftFootY, leftFootX - 10, leftFootY + 5, 2, 2.0, wireCoreColor);
  drawWireSegment(leftFootX, leftFootY, leftFootX + 5, leftFootY + 5, 2, 2.0, wireCoreColor);
  drawWireSegment(cx + 14, hipY, rightKneeX, rightKneeY, 4, 3.5, wireColor);
  drawWireSegment(rightKneeX, rightKneeY, rightFootX, rightFootY, 4, 3.0, wireColor);
  drawWireSegment(rightFootX, rightFootY, rightFootX - 5, rightFootY + 5, 2, 2.0, wireCoreColor);
  drawWireSegment(rightFootX, rightFootY, rightFootX + 10, rightFootY + 5, 2, 2.0, wireCoreColor);

  // Torso
  drawWireSegment(chestX, chestY, hipX, hipY, 6, 4.0, wireCoreColor);
  drawWireSegment(leftShoulderX, leftShoulderY, rightShoulderX, rightShoulderY, 4, 3.5, wireColor);
  drawWireSegment(leftShoulderX, leftShoulderY, hipX, hipY, 3, 2.5, wireColor);
  drawWireSegment(rightShoulderX, rightShoulderY, hipX, hipY, 3, 2.5, wireColor);
  drawWireSegment(chestX, chestY, chestX, neckY, 4, 3.0, wireCoreColor);

  // Arms
  drawWireSegment(leftShoulderX, leftShoulderY, leftElbowX, leftElbowY, 4, 3.0, wireColor);
  drawWireSegment(leftElbowX, leftElbowY, leftHandX, leftHandY, 4, 2.5, wireColor);
  drawWireSegment(leftHandX, leftHandY, leftHandX - 8 + swing * 3, leftHandY + 18, 2, 1.5, wireCoreColor);
  drawWireSegment(leftHandX, leftHandY, leftHandX + swing * 3, leftHandY + 20, 2, 1.5, wireCoreColor);
  drawWireSegment(leftHandX, leftHandY, leftHandX + 8 + swing * 3, leftHandY + 16, 2, 1.5, wireCoreColor);
  drawWireSegment(rightShoulderX, rightShoulderY, rightElbowX, rightElbowY, 4, 3.0, wireColor);
  drawWireSegment(rightElbowX, rightElbowY, rightHandX, rightHandY, 4, 2.5, wireColor);
  drawWireSegment(rightHandX, rightHandY, rightHandX - 8 - swing * 3, rightHandY + 16, 2, 1.5, wireCoreColor);
  drawWireSegment(rightHandX, rightHandY, rightHandX - swing * 3, rightHandY + 20, 2, 1.5, wireCoreColor);
  drawWireSegment(rightHandX, rightHandY, rightHandX + 8 - swing * 3, rightHandY + 18, 2, 1.5, wireCoreColor);

  // Head
  const headRadius = 24;
  g.fillStyle = wireCoreColor;
  g.beginPath();
  g.arc(cx, headY, headRadius, 0, Math.PI * 2);
  g.fill();
  for (let i = 0; i < 6; i++) {
    g.strokeStyle = wireColor;
    g.lineWidth = 2.0;
    g.beginPath();
    g.arc(cx + (Math.random() - 0.5) * 6, headY + (Math.random() - 0.5) * 6, headRadius - 2, 0, Math.PI * 2);
    g.stroke();
  }

  // Eye voids + glowing eyes
  g.fillStyle = "rgba(12, 10, 8, 0.95)";
  g.beginPath();
  g.arc(cx - 10, headY + 2, 9, 0, Math.PI * 2);
  g.arc(cx + 10, headY + 2, 9, 0, Math.PI * 2);
  g.fill();
  g.shadowColor = "#39ff14";
  g.shadowBlur = 15;
  g.fillStyle = "#ebffea";
  g.beginPath();
  g.arc(cx - 10, headY + 4, 3, 0, Math.PI * 2);
  g.arc(cx + 10, headY + 4, 3, 0, Math.PI * 2);
  g.fill();
  g.shadowBlur = 0;
};

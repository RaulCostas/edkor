import React, { useEffect, useRef, useState, useCallback } from "react";
import { Eraser, Undo2, Circle, X as XIcon, PenTool } from "lucide-react";

interface VehicleDiagramCanvasProps {
  value?: string;
  onChange: (dataUrl: string) => void;
}

type ToolType = "circle" | "cross" | "pen";

/**
 * Draws the 5-view 4-door vehicle technical blueprint on a 2D canvas context.
 * Base coordinate space: 520 x 440
 */
export const drawFourDoorVehicleBlueprint = (ctx: CanvasRenderingContext2D) => {
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 520, 440);

  ctx.strokeStyle = "#1f2937";
  ctx.fillStyle = "#1f2937";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Helper to draw a wheel (side view)
  const drawWheel = (cx: number, cy: number, r: number = 22) => {
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.65, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.2, 0, Math.PI * 2);
    ctx.stroke();

    // Spokes
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * (r * 0.2), cy + Math.sin(angle) * (r * 0.2));
      ctx.lineTo(cx + Math.cos(angle) * (r * 0.65), cy + Math.sin(angle) * (r * 0.65));
      ctx.stroke();
    }
    ctx.restore();
  };

  // =========================================================================
  // 1. VISTA FRONTAL (Top-Left: x=15..145, y=15..140)
  // =========================================================================
  ctx.save();
  ctx.translate(18, 22);
  ctx.lineWidth = 1.8;

  // Tires (front)
  ctx.fillStyle = "#e5e7eb";
  ctx.beginPath();
  ctx.roundRect(6, 86, 18, 24, 3);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(96, 86, 18, 24, 3);
  ctx.fill();
  ctx.stroke();

  // Main body & roof (front)
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(22, 12);
  ctx.quadraticCurveTo(60, 7, 98, 12);
  ctx.lineTo(110, 44);
  ctx.quadraticCurveTo(117, 56, 116, 78);
  ctx.lineTo(114, 92);
  ctx.lineTo(6, 92);
  ctx.lineTo(4, 78);
  ctx.quadraticCurveTo(3, 56, 10, 44);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Side mirrors (front)
  ctx.beginPath();
  ctx.roundRect(-4, 38, 12, 9, 4);
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(112, 38, 12, 9, 4);
  ctx.stroke();

  // Windshield (front)
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(25, 16);
  ctx.quadraticCurveTo(60, 12, 95, 16);
  ctx.lineTo(104, 42);
  ctx.quadraticCurveTo(60, 45, 16, 42);
  ctx.closePath();
  ctx.stroke();

  // Hood lines
  ctx.beginPath();
  ctx.moveTo(16, 42);
  ctx.lineTo(28, 66);
  ctx.moveTo(104, 42);
  ctx.lineTo(92, 66);
  ctx.stroke();

  // Headlights
  ctx.beginPath();
  ctx.ellipse(20, 63, 12, 6, 0.15, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(100, 63, 12, 6, -0.15, 0, Math.PI * 2);
  ctx.stroke();

  // Grille & emblem
  ctx.beginPath();
  ctx.roundRect(36, 60, 48, 10, 3);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(60, 65, 3.5, 0, Math.PI * 2);
  ctx.stroke();

  // Front bumper & lower grille
  ctx.beginPath();
  ctx.moveTo(5, 75);
  ctx.lineTo(115, 75);
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(22, 79, 76, 8, 2);
  ctx.stroke();
  ctx.restore();

  // =========================================================================
  // 2. VISTA POSTERIOR / TRASERA (Middle-Left: x=18, y=155)
  // =========================================================================
  ctx.save();
  ctx.translate(18, 158);
  ctx.lineWidth = 1.8;

  // Tires (rear)
  ctx.fillStyle = "#e5e7eb";
  ctx.beginPath();
  ctx.roundRect(6, 86, 18, 24, 3);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(96, 86, 18, 24, 3);
  ctx.fill();
  ctx.stroke();

  // Main body & roof (rear)
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(22, 12);
  ctx.quadraticCurveTo(60, 7, 98, 12);
  ctx.lineTo(110, 42);
  ctx.quadraticCurveTo(117, 55, 116, 78);
  ctx.lineTo(114, 92);
  ctx.lineTo(6, 92);
  ctx.lineTo(4, 78);
  ctx.quadraticCurveTo(3, 55, 10, 42);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Side mirrors (rear)
  ctx.beginPath();
  ctx.roundRect(-4, 38, 12, 9, 4);
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(112, 38, 12, 9, 4);
  ctx.stroke();

  // Rear window
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(26, 16);
  ctx.quadraticCurveTo(60, 13, 94, 16);
  ctx.lineTo(102, 40);
  ctx.quadraticCurveTo(60, 42, 18, 40);
  ctx.closePath();
  ctx.stroke();

  // Trunk lid & taillights
  ctx.beginPath();
  ctx.moveTo(22, 42);
  ctx.lineTo(24, 72);
  ctx.lineTo(96, 72);
  ctx.lineTo(98, 42);
  ctx.stroke();

  // Taillights
  ctx.beginPath();
  ctx.roundRect(8, 52, 22, 11, 3);
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(90, 52, 22, 11, 3);
  ctx.stroke();

  // Rear emblem & license plate recess
  ctx.beginPath();
  ctx.arc(60, 50, 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(42, 57, 36, 11, 2);
  ctx.stroke();

  // Rear bumper
  ctx.beginPath();
  ctx.moveTo(5, 74);
  ctx.lineTo(115, 74);
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(18, 80, 84, 6, 2);
  ctx.stroke();
  ctx.restore();

  // =========================================================================
  // 3. LATERAL IZQUIERDO - AUTO DE 4 PUERTAS (Top-Right: x=170, y=22)
  // =========================================================================
  const drawSideFourDoorCar = (tx: number, ty: number, flipHorizontal: boolean) => {
    ctx.save();
    if (flipHorizontal) {
      // Flip around center of car width (320)
      ctx.translate(tx + 320, ty);
      ctx.scale(-1, 1);
    } else {
      ctx.translate(tx, ty);
    }

    ctx.lineWidth = 1.8;
    ctx.fillStyle = "#ffffff";

    // Outer silhouette (4-door sedan/hatchback profile, facing left: x=10 front, x=310 rear)
    ctx.beginPath();
    ctx.moveTo(10, 74); // Front bumper bottom
    ctx.quadraticCurveTo(6, 60, 14, 50); // Front headlight nose
    ctx.quadraticCurveTo(45, 42, 86, 38); // Hood
    ctx.lineTo(132, 12); // Windshield (A-pillar)
    ctx.quadraticCurveTo(195, 6, 255, 13); // Roofline (long enough for 4 doors)
    ctx.lineTo(295, 38); // Rear window (C-pillar)
    ctx.quadraticCurveTo(308, 42, 310, 54); // Trunk/tail
    ctx.lineTo(312, 74); // Rear bumper
    ctx.lineTo(290, 78); // Lower rear
    // Rear wheel arch
    ctx.arc(255, 78, 26, 0, Math.PI, true);
    ctx.lineTo(91, 78); // Rocker panel / sill
    // Front wheel arch
    ctx.arc(65, 78, 26, 0, Math.PI, true);
    ctx.lineTo(14, 78);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Window frame (divided into Front Door Window + Rear Door Window + Rear quarter)
    ctx.lineWidth = 1.4;
    // Front door window
    ctx.beginPath();
    ctx.moveTo(96, 38);
    ctx.lineTo(136, 16);
    ctx.lineTo(188, 14);
    ctx.lineTo(188, 38);
    ctx.closePath();
    ctx.stroke();

    // Rear door window
    ctx.beginPath();
    ctx.moveTo(193, 14);
    ctx.lineTo(246, 16);
    ctx.lineTo(266, 38);
    ctx.lineTo(193, 38);
    ctx.closePath();
    ctx.stroke();

    // Small rear quarter glass
    ctx.beginPath();
    ctx.moveTo(250, 17);
    ctx.lineTo(282, 38);
    ctx.lineTo(270, 38);
    ctx.closePath();
    ctx.stroke();

    // Side mirror
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(96, 31, 14, 9, 3);
    ctx.fill();
    ctx.stroke();

    // 4-Door panel seams (Front door + Rear door)
    ctx.lineWidth = 1.4;
    // Front door front seam (A-pillar base down)
    ctx.beginPath();
    ctx.moveTo(94, 38);
    ctx.lineTo(94, 74);
    ctx.stroke();

    // B-pillar seam between Front Door and Rear Door
    ctx.beginPath();
    ctx.moveTo(190, 14);
    ctx.lineTo(190, 74);
    ctx.stroke();

    // Rear door rear seam (down to rear wheel arch)
    ctx.beginPath();
    ctx.moveTo(266, 38);
    ctx.lineTo(262, 52);
    ctx.lineTo(234, 66);
    ctx.stroke();

    // Rocker sill line under both doors
    ctx.beginPath();
    ctx.moveTo(92, 74);
    ctx.lineTo(230, 74);
    ctx.stroke();

    // Beltline crease
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(24, 52);
    ctx.lineTo(298, 48);
    ctx.stroke();

    // Front door handle
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(166, 43, 16, 5, 2);
    ctx.stroke();

    // Rear door handle
    ctx.beginPath();
    ctx.roundRect(242, 43, 16, 5, 2);
    ctx.stroke();

    // Headlight & taillight details
    ctx.beginPath();
    ctx.moveTo(12, 52);
    ctx.quadraticCurveTo(24, 52, 26, 60);
    ctx.lineTo(11, 61);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(308, 45);
    ctx.lineTo(296, 47);
    ctx.lineTo(298, 57);
    ctx.lineTo(310, 56);
    ctx.stroke();

    // Fuel cap on right side only
    if (flipHorizontal) {
      ctx.beginPath();
      ctx.arc(280, 52, 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Wheels
    drawWheel(65, 78, 22);
    drawWheel(255, 78, 22);

    ctx.restore();
  };

  // Top-right: Left side view (facing left)
  drawSideFourDoorCar(175, 22, false);

  // Middle-right: Right side view (facing right)
  drawSideFourDoorCar(175, 158, true);

  // =========================================================================
  // 4. VISTA SUPERIOR / PLANTA - 4 PUERTAS (Bottom Center: x=105, y=292)
  // =========================================================================
  ctx.save();
  ctx.translate(105, 290);
  ctx.lineWidth = 1.8;
  ctx.fillStyle = "#ffffff";

  // Outer body top-down (length=310, width=124, facing right: x=0 rear, x=310 front)
  ctx.beginPath();
  ctx.moveTo(22, 16);
  ctx.quadraticCurveTo(155, 8, 282, 18);
  ctx.quadraticCurveTo(306, 28, 308, 62);
  ctx.quadraticCurveTo(306, 96, 282, 106);
  ctx.quadraticCurveTo(155, 116, 22, 108);
  ctx.quadraticCurveTo(6, 98, 6, 62);
  ctx.quadraticCurveTo(6, 26, 22, 16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Side mirrors (top view)
  ctx.beginPath();
  ctx.moveTo(205, 13);
  ctx.lineTo(212, 3);
  ctx.lineTo(222, 5);
  ctx.lineTo(218, 14);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(205, 111);
  ctx.lineTo(212, 121);
  ctx.lineTo(222, 119);
  ctx.lineTo(218, 110);
  ctx.stroke();

  // Windshield (top view)
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(216, 22);
  ctx.quadraticCurveTo(234, 62, 216, 102);
  ctx.lineTo(182, 94);
  ctx.quadraticCurveTo(192, 62, 182, 30);
  ctx.closePath();
  ctx.stroke();

  // Roof panel (top view)
  ctx.beginPath();
  ctx.moveTo(182, 30);
  ctx.lineTo(84, 32);
  ctx.lineTo(84, 92);
  ctx.lineTo(182, 94);
  ctx.stroke();

  // Rear window (top view)
  ctx.beginPath();
  ctx.moveTo(84, 32);
  ctx.lineTo(46, 24);
  ctx.quadraticCurveTo(36, 62, 46, 100);
  ctx.lineTo(84, 92);
  ctx.closePath();
  ctx.stroke();

  // 4-Door division lines on top view (B-pillars on left & right sides + door seams)
  ctx.lineWidth = 1.3;
  // Left side (top): front door seam, B-pillar seam, rear door seam
  ctx.beginPath();
  ctx.moveTo(202, 14);
  ctx.lineTo(182, 30);
  ctx.moveTo(134, 12);
  ctx.lineTo(134, 31);
  ctx.moveTo(74, 14);
  ctx.lineTo(84, 32);
  ctx.stroke();

  // Right side (bottom): front door seam, B-pillar seam, rear door seam
  ctx.beginPath();
  ctx.moveTo(202, 110);
  ctx.lineTo(182, 94);
  ctx.moveTo(134, 112);
  ctx.lineTo(134, 93);
  ctx.moveTo(74, 110);
  ctx.lineTo(84, 92);
  ctx.stroke();

  // Hood creases (front)
  ctx.beginPath();
  ctx.moveTo(222, 26);
  ctx.lineTo(292, 32);
  ctx.moveTo(222, 98);
  ctx.lineTo(292, 92);
  ctx.stroke();

  // Headlights (top view)
  ctx.beginPath();
  ctx.moveTo(286, 20);
  ctx.quadraticCurveTo(298, 26, 302, 38);
  ctx.lineTo(288, 36);
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(286, 104);
  ctx.quadraticCurveTo(298, 98, 302, 86);
  ctx.lineTo(288, 88);
  ctx.closePath();
  ctx.stroke();

  ctx.restore();

  // Subtle labels for each view
  ctx.font = "600 10px sans-serif";
  ctx.fillStyle = "#6b7280";
  ctx.textAlign = "center";
  ctx.fillText("FRONTAL", 78, 146);
  ctx.fillText("LATERAL IZQUIERDO (4 PUERTAS)", 335, 146);
  ctx.fillText("POSTERIOR", 78, 282);
  ctx.fillText("LATERAL DERECHO (4 PUERTAS)", 335, 282);
  ctx.fillText("SUPERIOR", 260, 428);

  ctx.restore();
};

const VehicleDiagramCanvas: React.FC<VehicleDiagramCanvasProps> = ({
  value,
  onChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<ToolType>("circle");
  const [color, setColor] = useState<string>("#dc2626"); // Red default
  const [history, setHistory] = useState<string[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  const initBaseDiagram = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawFourDoorVehicleBlueprint(ctx);
  }, []);

  // Initialize canvas and load existing diagram if present
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        if (history.length === 0) {
          setHistory([value]);
        }
      };
      img.src = value;
    } else {
      initBaseDiagram();
      const baseDataUrl = canvas.toDataURL("image/png");
      setHistory([baseDataUrl]);
    }
  }, [value, initBaseDiagram]);

  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ("touches" in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }
  };

  const saveSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    setHistory((prev) => [...prev.slice(-19), dataUrl]);
    onChange(dataUrl);
  };

  const handlePointerDown = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if ("touches" in e) {
      e.preventDefault();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);

    if (tool === "circle") {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(x, y, 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      saveSnapshot();
    } else if (tool === "cross") {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(x - 10, y - 10);
      ctx.lineTo(x + 10, y + 10);
      ctx.moveTo(x + 10, y - 10);
      ctx.lineTo(x - 10, y + 10);
      ctx.stroke();
      ctx.restore();
      saveSnapshot();
    } else if (tool === "pen") {
      setIsDrawing(true);
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const handlePointerMove = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing || tool !== "pen") return;
    if ("touches" in e) {
      e.preventDefault();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.restore();
    }
    setIsDrawing(false);
    saveSnapshot();
  };

  const handleUndo = () => {
    if (history.length <= 1) {
      handleClear();
      return;
    }
    const nextHistory = history.slice(0, -1);
    const prevDataUrl = nextHistory[nextHistory.length - 1];
    setHistory(nextHistory);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      onChange(prevDataUrl);
    };
    img.src = prevDataUrl;
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    initBaseDiagram();
    const baseDataUrl = canvas.toDataURL("image/png");
    setHistory([baseDataUrl]);
    onChange("");
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-50 dark:bg-gray-700/60 p-2.5 rounded-lg border border-gray-200 dark:border-gray-600">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setTool("circle")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              tool === "circle"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-100"
            }`}
            title="Toque en el vehículo para marcar un círculo"
          >
            <Circle className="w-3.5 h-3.5" />
            Círculo (Golpe/Detalle)
          </button>
          <button
            type="button"
            onClick={() => setTool("cross")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              tool === "cross"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-100"
            }`}
            title="Toque en el vehículo para marcar una X"
          >
            <XIcon className="w-3.5 h-3.5" />
            Marca X (Rayón/Daño)
          </button>
          <button
            type="button"
            onClick={() => setTool("pen")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              tool === "pen"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-100"
            }`}
            title="Dibujo libre sobre el vehículo"
          >
            <PenTool className="w-3.5 h-3.5" />
            Trazo Libre
          </button>

          {/* Colors */}
          <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-300 dark:border-gray-600">
            {[
              { c: "#dc2626", label: "Rojo" },
              { c: "#2563eb", label: "Azul" },
              { c: "#111827", label: "Negro" },
            ].map((item) => (
              <button
                key={item.c}
                type="button"
                onClick={() => setColor(item.c)}
                title={`Color ${item.label}`}
                className={`!p-0 w-6 h-6 min-h-0 rounded-full !border-0 outline-none focus:outline-none focus:ring-0 transition-transform flex items-center justify-center ${
                  color === item.c
                    ? "scale-125 shadow-md"
                    : "opacity-70 hover:opacity-100"
                }`}
                style={{ backgroundColor: item.c, border: "none" }}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleUndo}
            disabled={history.length <= 1}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 disabled:opacity-40"
            title="Deshacer última marca"
          >
            <Undo2 className="w-3.5 h-3.5" />
            Deshacer
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
            title="Limpiar todas las marcas"
          >
            <Eraser className="w-3.5 h-3.5" />
            Limpiar
          </button>
        </div>
      </div>

      {/* Canvas Container */}
      <div className="border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white overflow-hidden shadow-inner flex justify-center">
        <canvas
          ref={canvasRef}
          width={520}
          height={440}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          className="w-full max-w-[520px] h-auto cursor-crosshair touch-none select-none"
        />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
        Haga clic o toque sobre las vistas del vehículo (4 puertas) para señalar abolladuras, rayones o detalles encontrados.
      </p>
    </div>
  );
};

export default VehicleDiagramCanvas;

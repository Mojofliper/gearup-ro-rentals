import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

interface PhotoComparisonProps {
  beforePhoto: string;
  afterPhoto: string;
  onDamageAssessment?: (assessment: DamageAssessment) => void;
  readOnly?: boolean;
}

interface DamageAssessment {
  hasDamage: boolean;
  damageLevel: "none" | "minor" | "moderate" | "severe";
  damageDescription: string;
  estimatedCost?: number;
  notes: string;
}

export const PhotoComparison: React.FC<PhotoComparisonProps> = ({
  beforePhoto,
  afterPhoto,
  onDamageAssessment,
  readOnly = false,
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showBefore, setShowBefore] = useState(true);
  const [showAfter, setShowAfter] = useState(true);
  const [assessment, setAssessment] = useState<DamageAssessment>({
    hasDamage: false,
    damageLevel: "none",
    damageDescription: "",
    estimatedCost: 0,
    notes: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const beforeCanvasRef = useRef<HTMLCanvasElement>(null);
  const afterCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadImages();
  }, [beforePhoto, afterPhoto]);

  const loadImages = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadImageToCanvas(beforePhoto, beforeCanvasRef.current),
        loadImageToCanvas(afterPhoto, afterCanvasRef.current),
      ]);
    } catch (error) {
      toast.error("Eroare la încărcarea imaginilor");
    } finally {
      setIsLoading(false);
    }
  };

  const loadImageToCanvas = (
    src: string,
    canvas: HTMLCanvasElement | null,
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!canvas) {
        reject(new Error("Canvas not found"));
        return;
      }

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        // Set canvas size
        canvas.width = img.width;
        canvas.height = img.height;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Apply transformations
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(zoom, zoom);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        ctx.restore();

        resolve();
      };
      img.onerror = reject;
      img.src = src;
    });
  };

  const handleZoomChange = (value: number[]) => {
    const newZoom = value[0] / 100;
    setZoom(newZoom);
    loadImages(); // Reload with new zoom
  };

  const handleRotationChange = () => {
    setRotation((prev) => (prev + 90) % 360);
    loadImages(); // Reload with new rotation
  };

  const handleDamageLevelChange = (level: DamageAssessment["damageLevel"]) => {
    const newAssessment = {
      ...assessment,
      hasDamage: level !== "none",
      damageLevel: level,
    };
    setAssessment(newAssessment);
    onDamageAssessment?.(newAssessment);
  };

  const handleDamageDescriptionChange = (description: string) => {
    const newAssessment = { ...assessment, damageDescription: description };
    setAssessment(newAssessment);
    onDamageAssessment?.(newAssessment);
  };

  const handleEstimatedCostChange = (cost: number) => {
    const newAssessment = { ...assessment, estimatedCost: cost };
    setAssessment(newAssessment);
    onDamageAssessment?.(newAssessment);
  };

  const handleNotesChange = (notes: string) => {
    const newAssessment = { ...assessment, notes };
    setAssessment(newAssessment);
    onDamageAssessment?.(newAssessment);
  };

  const downloadImage = (
    canvas: HTMLCanvasElement | null,
    filename: string,
  ) => {
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL();
    link.click();
  };

  const getDamageLevelColor = (level: DamageAssessment["damageLevel"]) => {
    switch (level) {
      case "none":
        return "bg-green-100 text-green-800";
      case "minor":
        return "bg-yellow-100 text-yellow-800";
      case "moderate":
        return "bg-orange-100 text-orange-800";
      case "severe":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getDamageLevelIcon = (level: DamageAssessment["damageLevel"]) => {
    switch (level) {
      case "none":
        return <CheckCircle className="h-4 w-4" />;
      case "minor":
        return <AlertTriangle className="h-4 w-4" />;
      case "moderate":
        return <AlertTriangle className="h-4 w-4" />;
      case "severe":
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p>Se încarcă imaginile...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" ref={containerRef}>
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Comparare Foto - Evaluare Daune</span>
            <Badge variant={assessment.hasDamage ? "destructive" : "default"}>
              {assessment.hasDamage ? "Daune Detectate" : "Fără Daune"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Image Controls */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBefore(!showBefore)}
              >
                {showBefore ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
                Foto Înainte
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAfter(!showAfter)}
              >
                {showAfter ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
                Foto După
              </Button>
            </div>

            <Separator orientation="vertical" className="h-6" />

            <div className="flex items-center space-x-2">
              <ZoomOut className="h-4 w-4" />
              <Slider
                value={[zoom * 100]}
                onValueChange={handleZoomChange}
                max={300}
                min={25}
                step={25}
                className="w-32"
              />
              <ZoomIn className="h-4 w-4" />
            </div>

            <Button variant="outline" size="sm" onClick={handleRotationChange}>
              <RotateCw className="h-4 w-4 mr-1" />
              Rotire
            </Button>

            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  downloadImage(beforeCanvasRef.current, "foto-inainte.png")
                }
              >
                <Download className="h-4 w-4 mr-1" />
                Descarcă Înainte
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  downloadImage(afterCanvasRef.current, "foto-dupa.png")
                }
              >
                <Download className="h-4 w-4 mr-1" />
                Descarcă După
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Image Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Before Photo */}
        {showBefore && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Foto Înainte</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <canvas
                  ref={beforeCanvasRef}
                  className="w-full h-auto max-h-96 object-contain"
                  style={{ cursor: "crosshair" }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* After Photo */}
        {showAfter && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Foto După</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <canvas
                  ref={afterCanvasRef}
                  className="w-full h-auto max-h-96 object-contain"
                  style={{ cursor: "crosshair" }}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Damage Assessment */}
      {!readOnly && (
        <Card>
          <CardHeader>
            <CardTitle>Evaluare Daune</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Damage Level */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Nivel Daune
              </label>
              <div className="flex flex-wrap gap-2">
                {(["none", "minor", "moderate", "severe"] as const).map(
                  (level) => (
                    <Button
                      key={level}
                      variant={
                        assessment.damageLevel === level ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => handleDamageLevelChange(level)}
                      className="flex items-center space-x-2"
                    >
                      {getDamageLevelIcon(level)}
                      <span className="capitalize">
                        {level === "none" && "Fără daune"}
                        {level === "minor" && "Daune minore"}
                        {level === "moderate" && "Daune moderate"}
                        {level === "severe" && "Daune grave"}
                      </span>
                    </Button>
                  ),
                )}
              </div>
            </div>

            {/* Damage Description */}
            {assessment.hasDamage && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Descriere Daune
                </label>
                <textarea
                  value={assessment.damageDescription}
                  onChange={(e) =>
                    handleDamageDescriptionChange(e.target.value)
                  }
                  placeholder="Descrie daunele observate..."
                  className="w-full p-2 border rounded-md"
                  rows={3}
                />
              </div>
            )}

            {/* Estimated Cost */}
            {assessment.hasDamage && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Cost Estimativ (RON)
                </label>
                <input
                  type="number"
                  value={assessment.estimatedCost || ""}
                  onChange={(e) =>
                    handleEstimatedCostChange(Number(e.target.value))
                  }
                  placeholder="0"
                  className="w-full p-2 border rounded-md"
                  min="0"
                />
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Note Suplimentare
              </label>
              <textarea
                value={assessment.notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Note suplimentare despre evaluare..."
                className="w-full p-2 border rounded-md"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assessment Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Sumar Evaluare</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">Status:</span>
              <Badge className={getDamageLevelColor(assessment.damageLevel)}>
                {getDamageLevelIcon(assessment.damageLevel)}
                <span className="ml-1 capitalize">
                  {assessment.damageLevel === "none" && "Fără daune"}
                  {assessment.damageLevel === "minor" && "Daune minore"}
                  {assessment.damageLevel === "moderate" && "Daune moderate"}
                  {assessment.damageLevel === "severe" && "Daune grave"}
                </span>
              </Badge>
            </div>

            {assessment.hasDamage && (
              <>
                {assessment.damageDescription && (
                  <div>
                    <span className="font-medium">Descriere:</span>
                    <p className="text-sm text-gray-600 mt-1">
                      {assessment.damageDescription}
                    </p>
                  </div>
                )}

                {assessment.estimatedCost && assessment.estimatedCost > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Cost estimativ:</span>
                    <span className="text-lg font-bold text-red-600">
                      {assessment.estimatedCost} RON
                    </span>
                  </div>
                )}
              </>
            )}

            {assessment.notes && (
              <div>
                <span className="font-medium">Note:</span>
                <p className="text-sm text-gray-600 mt-1">{assessment.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

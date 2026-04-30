import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { RotateCcw, ZoomIn, ZoomOut, Move } from "lucide-react";
import { ResponsiveDialog } from "@/components/layout/ResponsiveDialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const ImageCropDialog = ({
  open,
  onOpenChange,
  file,
  title,
  description,
  aspect = 1,
  outputWidth = 512,
  outputHeight = 512,
  onConfirm,
}) => {
  const frameRef = useRef(null);
  const imageRef = useRef(null);
  const containerRef = useRef(null);

  const [src, setSrc] = useState("");
  const [imageSize, setImageSize] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const cropFrameStyle = useMemo(
    () => ({
      aspectRatio: `${aspect}`,
      maxHeight: aspect > 1.2 ? "50dvh" : "56dvh",
      maxWidth: aspect <= 1.2 ? "min(100%, 56dvh)" : undefined,
    }),
    [aspect],
  );

  // Load image and reset state
  useEffect(() => {
    if (!file) {
      setSrc("");
      setImageSize(null);
      return undefined;
    }

    const objectUrl = URL.createObjectURL(file);
    setSrc(objectUrl);
    setImageSize(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });

    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const handleImageLoad = (event) => {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    setImageSize({ width: naturalWidth, height: naturalHeight });
  };

  // Calculate scales and dimensions
  const dimensions = useMemo(() => {
    if (!imageSize || !frameRef.current) return null;

    const frameWidth = frameRef.current.clientWidth;
    const frameHeight = frameWidth / aspect;

    // Base scale to fit the image inside the frame while maintaining aspect ratio
    // We want the image to cover the frame area
    const scaleToCover = Math.max(
      frameWidth / imageSize.width,
      frameHeight / imageSize.height
    );

    const baseWidth = imageSize.width * scaleToCover;
    const baseHeight = imageSize.height * scaleToCover;

    const currentWidth = baseWidth * zoom;
    const currentHeight = baseHeight * zoom;

    // Max offsets to keep the image covering the frame
    const maxOffsetX = (currentWidth - frameWidth) / 2;
    const maxOffsetY = (currentHeight - frameHeight) / 2;

    return {
      frameWidth,
      frameHeight,
      baseWidth,
      baseHeight,
      currentWidth,
      currentHeight,
      maxOffsetX,
      maxOffsetY,
    };
  }, [imageSize, zoom, aspect, open]);

  // Clamp offset when dimensions change
  useEffect(() => {
    if (!dimensions) return;

    setOffset((prev) => ({
      x: clamp(prev.x, -dimensions.maxOffsetX, dimensions.maxOffsetX),
      y: clamp(prev.y, -dimensions.maxOffsetY, dimensions.maxOffsetY),
    }));
  }, [dimensions]);

  const handlePointerDown = (e) => {
    if (!dimensions) return;
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging || !dimensions) return;

    setOffset((prev) => ({
      x: clamp(prev.x + e.movementX, -dimensions.maxOffsetX, dimensions.maxOffsetX),
      y: clamp(prev.y + e.movementY, -dimensions.maxOffsetY, dimensions.maxOffsetY),
    }));
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const handleWheel = useCallback((e) => {
    if (!dimensions) return;
    e.preventDefault();
    const delta = -e.deltaY;
    const zoomStep = 0.05;
    const nextZoom = clamp(zoom + (delta > 0 ? zoomStep : -zoomStep), 1, 5);
    setZoom(nextZoom);
  }, [dimensions, zoom]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleConfirm = async () => {
    if (!imageSize || !dimensions || !imageRef.current) return;

    setSubmitting(true);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = outputWidth;
      canvas.height = outputHeight;

      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas unavailable");

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";

      // Calculate source coordinates
      // The image is centered in the frame, so offset (0,0) means center of image is at center of frame
      // currentWidth / zoom is baseWidth. 
      // baseWidth / frameWidth is the scale factor from image to frame at zoom 1.
      
      const displayedImageWidth = dimensions.currentWidth;
      const displayedImageHeight = dimensions.currentHeight;
      
      const scaleX = imageSize.width / displayedImageWidth;
      const scaleY = imageSize.height / displayedImageHeight;

      // Source X/Y relative to image top-left
      const centerX = imageSize.width / 2 - (offset.x * scaleX);
      const centerY = imageSize.height / 2 - (offset.y * scaleY);

      const sWidth = (dimensions.frameWidth * scaleX);
      const sHeight = (dimensions.frameHeight * scaleY);
      
      const sx = centerX - sWidth / 2;
      const sy = centerY - sHeight / 2;

      context.drawImage(
        imageRef.current,
        sx,
        sy,
        sWidth,
        sHeight,
        0,
        0,
        outputWidth,
        outputHeight
      );

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((nextBlob) => {
          if (nextBlob) resolve(nextBlob);
          else reject(new Error("Failed to crop image"));
        }, file?.type || "image/png", 0.95);
      });

      await onConfirm(blob);
      onOpenChange(false);
    } catch (err) {
      console.error("Crop error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      className={cn("max-h-[90dvh] overflow-y-auto sm:max-w-2xl", aspect > 1.5 && "sm:max-w-3xl")}
    >
      <div className="flex flex-col gap-6 py-4">
        <div 
          ref={containerRef}
          className="relative mx-auto w-full overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-inner"
          style={cropFrameStyle}
        >
          {/* Main Frame */}
          <div
            ref={frameRef}
            className="absolute inset-0 flex items-center justify-center"
          >
            {src && (
              <div
                className={cn(
                  "relative cursor-grab active:cursor-grabbing touch-none select-none transition-transform duration-75",
                  isDragging && "scale-[1.01]"
                )}
                style={{
                  width: dimensions?.currentWidth,
                  height: dimensions?.currentHeight,
                  transform: `translate(${offset.x}px, ${offset.y}px)`,
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              >
                <img
                  ref={imageRef}
                  src={src}
                  alt="Crop target"
                  className="h-full w-full object-cover pointer-events-none"
                  onLoad={handleImageLoad}
                  draggable={false}
                />
              </div>
            )}
          </div>

          {/* Visual Overlay Mask */}
          <div className="pointer-events-none absolute inset-0 flex flex-col">
             <div className="flex-1 bg-black/40" />
             <div className="flex">
                <div className="flex-1 bg-black/40" />
                <div 
                  className="border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]"
                  style={{
                    width: dimensions?.frameWidth || "100%",
                    height: dimensions?.frameHeight || "100%",
                  }}
                />
                <div className="flex-1 bg-black/40" />
             </div>
             <div className="flex-1 bg-black/40" />
          </div>
          
          {/* Helper icon */}
          <div className="absolute bottom-3 right-3 rounded-full bg-black/50 p-1.5 text-white backdrop-blur">
            <Move className="h-4 w-4" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <ZoomOut className="h-4 w-4 text-muted-foreground shrink-0" />
            <Slider
              value={[zoom]}
              min={1}
              max={5}
              step={0.01}
              onValueChange={([val]) => setZoom(val)}
              className="flex-1"
            />
            <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="min-w-[3ch] text-right text-sm font-medium tabular-nums text-muted-foreground">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-9"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset View
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-9"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirm}
                disabled={!imageSize || submitting}
                className="h-9 min-w-[100px]"
              >
                {submitting ? "Processing..." : "Save Crop"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ResponsiveDialog>
  );
};

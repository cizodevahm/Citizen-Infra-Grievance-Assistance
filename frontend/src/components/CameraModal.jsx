"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Camera, X, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CameraModal({ isOpen, onClose, onCapture }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraIndex, setSelectedCameraIndex] = useState(0);
  const [error, setError] = useState(null);
  const [isStarting, setIsStarting] = useState(false);

  // Stop camera tracks
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Start camera stream
  const startCamera = useCallback(async (deviceId) => {
    stopStream();
    setIsStarting(true);
    setError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported on this device/browser.");
      }

      const constraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : { facingMode: { ideal: "environment" } },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Enumerate available video inputs
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");
      setCameras(videoDevices);
      setIsStarting(false);
    } catch (err) {
      console.error("Camera access error:", err);
      setIsStarting(false);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setError("Camera permission was denied. Please allow camera access in your browser settings.");
      } else {
        setError(err.message || "Failed to initialize camera.");
      }
    }
  }, [stopStream]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        startCamera();
      }, 0);
      return () => clearTimeout(timer);
    } else {
      stopStream();
    }

    return () => {
      stopStream();
    };
  }, [isOpen, startCamera, stopStream]);

  const switchCamera = () => {
    if (cameras.length <= 1) return;
    const nextIndex = (selectedCameraIndex + 1) % cameras.length;
    setSelectedCameraIndex(nextIndex);
    startCamera(cameras[nextIndex].deviceId);
  };

  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
          const file = new File([blob], `capture-${timestamp}.jpg`, {
            type: "image/jpeg",
          });
          onCapture(file);
          stopStream();
          onClose();
        }
      },
      "image/jpeg",
      0.92
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col text-white">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-slate-100">Take Live Photo</h3>
          </div>
          <button
            type="button"
            onClick={() => {
              stopStream();
              onClose();
            }}
            className="rounded-full p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport */}
        <div className="relative aspect-[4/3] bg-black flex items-center justify-center overflow-hidden">
          {error ? (
            <div className="p-6 text-center max-w-sm space-y-3">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
              <p className="text-sm text-red-300">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="text-white border-slate-700 bg-slate-800 hover:bg-slate-700"
                onClick={() => startCamera()}
              >
                Retry Camera
              </Button>
            </div>
          ) : (
            <>
              {isStarting && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 z-10 text-sm text-slate-300">
                  Starting camera...
                </div>
              )}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </>
          )}
        </div>

        {/* Controls */}
        <div className="p-4 bg-slate-950/90 flex items-center justify-between gap-4">
          <div>
            {cameras.length > 1 && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={switchCamera}
                className="bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                Flip Camera
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                stopStream();
                onClose();
              }}
              className="text-slate-300 border-slate-700 bg-slate-800 hover:bg-slate-700 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCapture}
              disabled={Boolean(error) || isStarting}
              className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-5"
            >
              <Camera className="w-4 h-4 mr-1.5" />
              Capture
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

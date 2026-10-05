"use client";

import React, { useState, useRef } from "react";
import {
  UploadCloud,
  Camera,
  Image as ImageIcon,
  Trash2,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  ShieldCheck,
  MapPin,
  Search,
} from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

import CameraModal from "./CameraModal";
import AudioRecorder from "./AudioRecorder";
import LocationPicker from "./LocationPicker";
import TrackRequestModal from "./TrackRequestModal";

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit

export default function GrievanceForm() {
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const [voiceNoteFile, setVoiceNoteFile] = useState(null);
  const [textNote, setTextNote] = useState("");
  const [location, setLocation] = useState(null);

  const [errorMessage, setErrorMessage] = useState(null);
  const [successData, setSuccessData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);

  const fileInputRef = useRef(null);

  // Handle image file selection
  const processImageFile = (file) => {
    setErrorMessage(null);

    if (!file) return;

    // Check file type
    if (!file.type.startsWith("image/")) {
      setErrorMessage(
        "Please select a valid image file (JPEG, PNG, WEBP, HEIC, etc.).",
      );
      return;
    }

    // Check 10 MB size limit
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setErrorMessage(
        `Selected image is ${sizeMB} MB, which exceeds the maximum allowed limit of 10 MB.`,
      );
      return;
    }

    // Set preview
    const previewUrl = URL.createObjectURL(file);
    setImageFile(file);
    setImagePreview(previewUrl);
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleRemoveImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    // Form Validations
    if (!imageFile) {
      setErrorMessage(
        "Please capture or upload an infrastructure issue photo (Max 10 MB).",
      );
      return;
    }

    if (!location || !location.latitude || !location.longitude) {
      setErrorMessage(
        "Incident location coordinates are required. Please use browser GPS or enter coordinates manually.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("image", imageFile);
      if (voiceNoteFile) {
        formData.append("voiceNote", voiceNoteFile);
      }
      if (textNote.trim()) {
        formData.append("textNote", textNote.trim());
      }
      formData.append("latitude", location.latitude.toString());
      formData.append("longitude", location.longitude.toString());
      formData.append("locationSource", location.source || "unknown");
      formData.append("submittedAt", new Date().toISOString());

      const response = await fetch("/api/grievance", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const resData = await response.json().catch(() => ({}));
        throw new Error(
          resData.error || "Failed to submit grievance. Please try again.",
        );
      }

      const result = await response.json();

      setSuccessData({
        ticketId:
          result.ticketId ||
          `CIGA-${Math.floor(100000 + Math.random() * 900000)}`,
        imageName: imageFile.name,
        imageSize: (imageFile.size / (1024 * 1024)).toFixed(2) + " MB",
        hasVoiceNote: Boolean(voiceNoteFile),
        textNote: textNote.trim() || "No text description provided",
        location: location,
        submittedAt: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
    } catch (err) {
      console.error("Submission error:", err);
      setErrorMessage(
        err.message || "An unexpected error occurred while submitting.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    handleRemoveImage();
    setVoiceNoteFile(null);
    setTextNote("");
    setSuccessData(null);
    setErrorMessage(null);
  };

  return (
    <div className="w-full space-y-6">
      {/* Success Confirmation Card */}
      {successData ? (
        <Card className="border-emerald-200 dark:border-emerald-900 bg-white dark:bg-slate-900 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-emerald-600 px-6 py-6 text-white text-center space-y-2">
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto backdrop-blur-sm">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold">Grievance Submitted!</h3>
            <p className="text-emerald-100 text-sm">
              Your report has been logged and assigned to the local civic
              authority.
            </p>
          </div>

          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">
                Ticket Reference
              </span>
              <span className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded">
                {successData.ticketId}
              </span>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-slate-400" /> Image:
                </span>
                <span className="font-medium text-xs font-mono">
                  {successData.imageName} ({successData.imageSize})
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-400" /> Coordinates:
                </span>
                <span className="font-medium text-xs font-mono">
                  {successData.location.latitude},{" "}
                  {successData.location.longitude}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-slate-400" /> Location
                  Method:
                </span>
                <Badge variant="outline" className="text-xs font-normal">
                  {successData.location.source === "browser_gps"
                    ? "Browser GPS"
                    : "Manual Entry"}
                </Badge>
              </div>

              {successData.hasVoiceNote && (
                <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                  <span className="text-slate-500">Voice Note:</span>
                  <Badge variant="success" className="text-xs">
                    Recorded Audio Attached
                  </Badge>
                </div>
              )}

              {successData.textNote && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-xs text-slate-500">Description:</span>
                  <p className="text-xs text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800">
                    {successData.textNote}
                  </p>
                </div>
              )}
            </div>
          </CardContent>

          <CardFooter className="p-6 pt-0 flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              className="w-full text-xs sm:text-sm border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
              onClick={() => setIsTrackModalOpen(true)}
            >
              <Search className="w-4 h-4 mr-1.5 text-blue-600 dark:text-blue-400" />
              Track This Request
            </Button>
            <Button
              type="button"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm"
              onClick={handleResetForm}
            >
              Report Another Issue
            </Button>
          </CardFooter>
        </Card>
      ) : (
        /* Grievance Submission Form Card */
        <Card className="border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 shadow-xl backdrop-blur-md">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Report Infrastructure Issue
            </CardTitle>
            <CardDescription className="text-sm text-slate-500 dark:text-slate-400">
              Submit potholes, broken streetlights, water leakage, or road
              hazards.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5">
              {errorMessage && (
                <Alert
                  variant="destructive"
                  className="animate-in fade-in duration-150"
                >
                  <AlertCircle className="w-4 h-4" />
                  <AlertTitle>Validation Notice</AlertTitle>
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}

              {/* 1. Photo Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    <ImageIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-0.5" />
                    Issue Photo
                    <span className="text-red-500 font-bold text-base leading-none">
                      *
                    </span>
                  </Label>
                  <span className="text-[11px] font-medium text-slate-400">
                    Max size: 10 MB
                  </span>
                </div>

                {!imagePreview ? (
                  <div
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-2xl p-5 text-center transition-colors bg-slate-50/50 dark:bg-slate-900/40"
                  >
                    <div className="flex flex-col items-center justify-center space-y-2.5">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <UploadCloud className="w-5 h-5" />
                      </div>

                      <div className="space-y-0.5">
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Drag and drop photo here, or select option:
                        </p>
                        <p className="text-[11px] text-slate-400">
                          JPEG, PNG, WEBP, HEIC (Up to 10 MB)
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          onClick={() => setIsCameraOpen(true)}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8"
                        >
                          <Camera className="w-3.5 h-3.5 mr-1.5" />
                          Take Photo
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs h-8 bg-white dark:bg-slate-800"
                        >
                          <ImageIcon className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                          Browse Device
                        </Button>

                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileInputChange}
                          className="hidden"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-950 group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreview}
                      alt="Infrastructure Issue Preview"
                      className="w-full max-h-56 object-contain bg-black/40"
                    />

                    {/* Overlay Info */}
                    <div className="absolute top-2.5 left-2.5 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-full text-xs text-white flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="truncate max-w-[130px]">
                        {imageFile?.name}
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        ({(imageFile?.size / (1024 * 1024)).toFixed(2)} MB)
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={handleRemoveImage}
                        className="h-7 px-2 bg-red-600/90 hover:bg-red-700 text-xs shadow-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Incident Location (GPS / Manual Coordinates) */}
              <LocationPicker
                location={location}
                onLocationChange={setLocation}
              />

              {/* 3. Voice Note */}
              <AudioRecorder
                audioFile={voiceNoteFile}
                onAudioChange={setVoiceNoteFile}
              />

              {/* 4. Text Note */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="textNote"
                    className="text-sm font-semibold text-slate-800 dark:text-slate-200"
                  >
                    Additional Description
                    <span className="text-xs font-normal text-slate-400 ml-1">
                      (Optional)
                    </span>
                  </Label>
                  <span className="text-xs text-slate-400">
                    {textNote.length}/500
                  </span>
                </div>
                <Textarea
                  id="textNote"
                  placeholder="Describe landmarks, road number, severity, or hazards..."
                  value={textNote}
                  maxLength={500}
                  onChange={(e) => setTextNote(e.target.value)}
                  className="min-h-[75px] text-xs"
                />
              </div>
            </CardContent>

            <CardFooter className="p-6 pt-1">
              <Button
                type="submit"
                disabled={isSubmitting || !imageFile}
                className="w-full h-11 text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>Submit</>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {/* Live Camera View */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={processImageFile}
      />

      {/* Track Request Modal */}
      <TrackRequestModal
        isOpen={isTrackModalOpen}
        onClose={() => setIsTrackModalOpen(false)}
        initialTicketId={successData?.ticketId || ""}
      />
    </div>
  );
}

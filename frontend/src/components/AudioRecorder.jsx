"use client";

import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, Trash2, AlertCircle, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AudioRecorder({ audioFile, onAudioChange }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [error, setError] = useState(null);

  // Custom audio playback states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const streamRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    setError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Audio recording is not supported in this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "audio/webm";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || "audio/webm",
        });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const fileExt = mediaRecorder.mimeType.includes("mp4") ? "mp4" : "webm";
        const file = new File([audioBlob], `voicenote-${timestamp}.${fileExt}`, {
          type: audioBlob.type,
        });

        onAudioChange(file);

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingTime(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 120) {
            stopRecording();
            return 120;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Microphone access error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setError("Microphone permission was denied. Please allow microphone access to record.");
      } else {
        setError(err.message || "Failed to start microphone.");
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
  };

  const handleDelete = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setRecordingTime(0);
    onAudioChange(null);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => {
        console.warn("Audio playback error:", e);
      });
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const dur = audioRef.current.duration;
      if (dur && isFinite(dur)) {
        setDuration(dur);
      } else {
        setDuration(recordingTime);
      }
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e) => {
    const seekTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  const formatTime = (seconds) => {
    const totalSecs = Math.floor(seconds || 0);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <Mic className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          Voice Note
          <span className="text-xs font-normal text-slate-400 ml-1">
            (Optional - max 2 mins)
          </span>
        </label>
        {isRecording && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400 animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
            Recording: {formatTime(recordingTime)} / 02:00
          </span>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 text-xs rounded-lg bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-900">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Trigger recording */}
      {!audioUrl && !isRecording && (
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={startRecording}
            className="w-full justify-center border-dashed border-2 border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 py-6 text-slate-700 dark:text-slate-300 hover:text-blue-600"
          >
            <Mic className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
            Click to record voice note
          </Button>
        </div>
      )}

      {/* Recording in progress */}
      {isRecording && (
        <div className="p-4 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full bg-red-500 animate-ping"></div>
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Listening & Recording...
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Speak clearly near your microphone
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={stopRecording}
            className="flex items-center gap-2 px-4 shadow"
          >
            <Square className="w-4 h-4 fill-white" />
            Stop Recording ({formatTime(recordingTime)})
          </Button>
        </div>
      )}

      {/* Audio Playback with Play/Pause on Proper Left */}
      {audioUrl && !isRecording && (
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center gap-3">
          {/* Play/Pause Button on Proper Left */}
          <button
            type="button"
            onClick={togglePlay}
            title={isPlaying ? "Pause" : "Play"}
            className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shrink-0 shadow-sm transition-transform active:scale-95 cursor-pointer"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-white" />
            ) : (
              <Play className="w-4 h-4 fill-white ml-0.5" />
            )}
          </button>

          {/* Scrubber & Duration */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                Voice Note ({(audioFile?.size / 1024).toFixed(1)} KB)
              </span>
              <span className="text-[11px] font-mono text-slate-500 shrink-0 ml-2">
                {formatTime(currentTime)} / {formatTime(duration || recordingTime)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={duration || recordingTime || 1}
              step="0.05"
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          {/* Hidden audio element */}
          <audio
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
            className="hidden"
          />

          {/* Delete / Re-record on Right */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            title="Delete and re-record"
            className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

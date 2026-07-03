import { useCallback, useEffect, useRef, useState } from "react"

import { recordAudio } from "@/lib/audio-utils"

export const AUDIO_CONFIG = {
  preferredMimeType: "audio/webm;codecs=opus",
  fallbackMimeTypes: ["audio/ogg;codecs=opus", "audio/mp4"],
  chunkInterval: 1_000,
  maxDuration: 120,
  maxFileSize: 10 * 1024 * 1024,
} as const

interface UseAudioRecordingOptions {
  transcribeAudio?: (blob: Blob) => Promise<string>
  onTranscriptionComplete?: (text: string) => void
  onError?: (error: string) => void
}

export function useAudioRecording({
  transcribeAudio,
  onTranscriptionComplete,
  onError,
}: UseAudioRecordingOptions) {
  const [isListening, setIsListening] = useState(false)
  const [isSpeechSupported, setIsSpeechSupported] = useState(!!transcribeAudio)
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null)
  const [duration, setDuration] = useState(0)
  const activeRecordingRef = useRef<Promise<Blob> | null>(null)
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const checkSpeechSupport = async () => {
      const hasMediaDevices = !!(
        navigator.mediaDevices && navigator.mediaDevices.getUserMedia
      )
      setIsSpeechSupported(hasMediaDevices && !!transcribeAudio)
    }

    checkSpeechSupport()
  }, [transcribeAudio])

  const clearTimers = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current)
      autoStopTimerRef.current = null
    }
  }, [])

  const stopRecording = useCallback(async () => {
    clearTimers()
    setIsRecording(false)
    setIsTranscribing(true)
    try {
      recordAudio.stop()
      const recording = await activeRecordingRef.current
      if (recording && recording.size > AUDIO_CONFIG.maxFileSize) {
        onError?.(
          `Recording exceeds maximum file size of ${Math.round(AUDIO_CONFIG.maxFileSize / (1024 * 1024))}MB.`
        )
        return
      }
      if (transcribeAudio && recording) {
        const text = await transcribeAudio(recording)
        onTranscriptionComplete?.(text)
      }
    } catch (error) {
      console.error("Error transcribing audio:", error)
    } finally {
      setIsTranscribing(false)
      setIsListening(false)
      setDuration(0)
      setAudioStream((prev) => {
        prev?.getTracks().forEach((track) => track.stop())
        return null
      })
      activeRecordingRef.current = null
    }
  }, [clearTimers, onError, onTranscriptionComplete, transcribeAudio])

  const toggleListening = useCallback(async () => {
    if (!isListening) {
      try {
        setIsListening(true)
        setIsRecording(true)
        setDuration(0)

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        })
        setAudioStream(stream)

        activeRecordingRef.current = recordAudio(stream)

        durationIntervalRef.current = setInterval(() => {
          setDuration((prev) => prev + 1)
        }, 1_000)

        autoStopTimerRef.current = setTimeout(() => {
          void stopRecording()
        }, AUDIO_CONFIG.maxDuration * 1_000)
      } catch (error) {
        console.error("Error recording audio:", error)
        setIsListening(false)
        setIsRecording(false)
        setDuration(0)
        clearTimers()
        setAudioStream((prev) => {
          prev?.getTracks().forEach((track) => track.stop())
          return null
        })
      }
    } else {
      await stopRecording()
    }
  }, [isListening, stopRecording, clearTimers])

  useEffect(() => {
    return () => {
      clearTimers()
    }
  }, [clearTimers])

  return {
    isListening,
    isSpeechSupported,
    isRecording,
    isTranscribing,
    audioStream,
    duration,
    toggleListening,
    stopRecording,
  }
}

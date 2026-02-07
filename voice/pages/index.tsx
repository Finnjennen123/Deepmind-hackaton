import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { motion } from 'framer-motion'
import { MOCK_COURSE } from '../lib/mock-course'
import { Course } from '../lib/course-types'
import OrbExplosion from '../components/OrbExplosion'
import { authClient } from '../lib/auth-client'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface OnboardingResult {
  subject: string
  reason: string
  summary: string
}

export default function Home() {
  const router = useRouter()
  const session = authClient.useSession()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [currentInput, setCurrentInput] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [orbScale, setOrbScale] = useState(1)
  const [status, setStatus] = useState('Tap the orb to start')

  // Onboarding state
  const [phase, setPhase] = useState<'onboarding' | 'profiling' | 'complete'>('onboarding')
  const [onboardingResult, setOnboardingResult] = useState<OnboardingResult | null>(null)
  const [isComplete, setIsComplete] = useState(false)
  const [generatedCourse, setGeneratedCourse] = useState<Course | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const socketRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null)
  const audioQueueRef = useRef<ArrayBuffer[]>([])
  const isPlayingRef = useRef(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const shouldStopSpeakingRef = useRef(false)
  const messagesRef = useRef<Message[]>([])
  const isListeningRef = useRef(false)
  const isSpeakingRef = useRef(false)
  const isMutedRef = useRef(false)
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const sendQueueRef = useRef<string[]>([])
  const isSendingRef = useRef(false)
  const sendMessageRef = useRef<(content: string) => void>(() => { })
  const ttsAbortRef = useRef<AbortController | null>(null)

  const micAnalyserRef = useRef<AnalyserNode | null>(null)
  const speakAnalyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number>(0)

  // ── Card fly-in animation state ──
  const [flyingCard, setFlyingCard] = useState<{
    start: { left: number; top: number; width: number; height: number }
    target: { left: number; top: number; width: number; height: number }
  } | null>(null)
  // Consume sessionStorage data once at init and stash in a ref
  const flyInDataRef = useRef<string | null>(null)
  const [flyInPending, setFlyInPending] = useState(() => {
    if (typeof window !== 'undefined') {
      const data = sessionStorage.getItem('condenseCard')
      if (data) {
        sessionStorage.removeItem('condenseCard')
        flyInDataRef.current = data
        return true
      }
    }
    return false
  })
  const courseRowRef = useRef<HTMLDivElement>(null)

  // ── Navigate-to-course transition state ──
  const [navTransition, setNavTransition] = useState<{
    orbRect: { left: number; top: number; width: number; height: number }
    cardRect: { left: number; top: number; width: number; height: number }
  } | null>(null)

  // ── Orb explosion → course nodes transition ──
  const [orbExplosion, setOrbExplosion] = useState<{
    left: number; top: number; width: number; height: number
  } | null>(null)

  // Refs for phase state
  const phaseRef = useRef<'onboarding' | 'profiling' | 'complete'>('onboarding')
  const onboardingResultRef = useRef<OnboardingResult | null>(null)

  useEffect(() => { messagesRef.current = messages }, [messages])
  useEffect(() => { isListeningRef.current = isListening }, [isListening])
  useEffect(() => { isSpeakingRef.current = isSpeaking }, [isSpeaking])
  useEffect(() => { isMutedRef.current = isMuted }, [isMuted])
  useEffect(() => { phaseRef.current = phase }, [phase])
  useEffect(() => { onboardingResultRef.current = onboardingResult }, [onboardingResult])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => { scrollToBottom() }, [messages])

  // ── Check for card fly-in data on mount (arriving from course page) ──
  useEffect(() => {
    const stored = flyInDataRef.current
    if (!stored) return
    flyInDataRef.current = null
    const startRect = JSON.parse(stored)
    // Wait one frame so the course-row is rendered and measurable
    requestAnimationFrame(() => {
      if (courseRowRef.current) {
        const t = courseRowRef.current.getBoundingClientRect()
        setFlyingCard({
          start: startRect,
          target: { left: t.left, top: t.top, width: t.width, height: t.height },
        })
      }
      setFlyInPending(false)
    })
  }, [])

  // ── Orb audio-reactive loop ──────────────────────────────────

  useEffect(() => {
    const dataArray = new Uint8Array(128)
    const tick = () => {
      let level = 0
      if (micAnalyserRef.current) {
        micAnalyserRef.current.getByteFrequencyData(dataArray)
        level = Math.max(level, dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 255)
      }
      if (speakAnalyserRef.current) {
        speakAnalyserRef.current.getByteFrequencyData(dataArray)
        level = Math.max(level, dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 255)
      }
      const target = 1 + level * 0.35
      setOrbScale(prev => prev + (target - prev) * 0.25)
      animFrameRef.current = requestAnimationFrame(tick)
    }
    animFrameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [])

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) audioContextRef.current = new AudioContext()
    return audioContextRef.current
  }, [])

  // ── Audio playback ───────────────────────────────────────────

  const stopSpeaking = useCallback(() => {
    shouldStopSpeakingRef.current = true
    audioQueueRef.current = []
    nextPlayTimeRef.current = 0
    // Abort any in-flight TTS fetches
    if (ttsAbortRef.current) {
      try { ttsAbortRef.current.abort() } catch (_) { }
      ttsAbortRef.current = null
    }
    if (currentSourceRef.current) {
      try { currentSourceRef.current.stop() } catch (_) { }
      currentSourceRef.current = null
    }
    isPlayingRef.current = false
    setIsSpeaking(false)
    ttsEndTimeRef.current = Date.now()  // mark when TTS stopped for echo cooldown
  }, [])

  // Track scheduled end time for gapless PCM playback
  const nextPlayTimeRef = useRef(0)

  // Timestamp when TTS last stopped — used to ignore echo in the Deepgram pipeline
  const ttsEndTimeRef = useRef(0)

  const playAudioQueue = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return
    isPlayingRef.current = true
    setIsSpeaking(true)
    const ctx = getAudioContext()
    if (ctx.state === 'suspended') await ctx.resume()
    if (!speakAnalyserRef.current) {
      speakAnalyserRef.current = ctx.createAnalyser()
      speakAnalyserRef.current.fftSize = 256
      speakAnalyserRef.current.smoothingTimeConstant = 0.6
      speakAnalyserRef.current.connect(ctx.destination)
    }

    // Schedule PCM buffers gaplessly
    if (nextPlayTimeRef.current < ctx.currentTime) {
      nextPlayTimeRef.current = ctx.currentTime
    }

    while (audioQueueRef.current.length > 0 && !shouldStopSpeakingRef.current) {
      const audioData = audioQueueRef.current.shift()
      if (!audioData) continue
      try {
        // Convert 16-bit signed LE PCM to Float32
        const pcm16 = new Int16Array(audioData)
        const float32 = new Float32Array(pcm16.length)
        for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / 32768

        // Apply short fade-in/fade-out (48 samples = 2ms) to avoid clicks
        const FADE = Math.min(48, float32.length)
        for (let i = 0; i < FADE; i++) float32[i] *= i / FADE
        for (let i = 0; i < FADE; i++) float32[float32.length - 1 - i] *= i / FADE

        const audioBuf = ctx.createBuffer(1, float32.length, 24000)
        audioBuf.getChannelData(0).set(float32)
        const source = ctx.createBufferSource()
        source.buffer = audioBuf
        source.connect(speakAnalyserRef.current!)
        currentSourceRef.current = source

        const startAt = nextPlayTimeRef.current
        nextPlayTimeRef.current = startAt + audioBuf.duration
        source.start(startAt)

        // Wait for this chunk to finish before checking queue again
        await new Promise<void>(resolve => {
          source.onended = () => { currentSourceRef.current = null; resolve() }
        })
      } catch (e) { console.error('Audio playback error:', e) }
    }
    isPlayingRef.current = false
    shouldStopSpeakingRef.current = false
    setIsSpeaking(false)
    ttsEndTimeRef.current = Date.now()  // mark when TTS stopped for echo cooldown
  }, [getAudioContext])

  // ── ElevenLabs HTTP Streaming TTS (eleven_v3 for voice tags) ─

  const speakSentence = useCallback(async (text: string, signal: AbortSignal) => {
    const voiceId = process.env.NEXT_PUBLIC_VOICE_ID || ''
    const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || ''
    console.log('[TTS] Speaking sentence:', text.slice(0, 60))

    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=pcm_24000`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'xi-api-key': apiKey },
        body: JSON.stringify({
          text,
          model_id: 'eleven_v3',
          voice_settings: { stability: 0.5, similarity_boost: 0.75 }
        }),
        signal
      }
    )
    if (!res.ok) {
      const err = await res.text().catch(() => '')
      console.error('[TTS] HTTP error:', res.status, err)
      return
    }

    const reader = res.body?.getReader()
    if (!reader) return

    let leftover = new Uint8Array(0)
    // Buffer at least 12000 samples (500ms at 24kHz) = 24000 bytes before playing
    const MIN_BUFFER_BYTES = 24000

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (shouldStopSpeakingRef.current) { reader.cancel(); break }

      // Merge leftover bytes with new chunk
      const merged = new Uint8Array(leftover.length + value.length)
      merged.set(leftover)
      merged.set(value, leftover.length)

      // PCM 16-bit = 2 bytes per sample; ensure even byte count
      const usable = merged.length - (merged.length % 2)
      if (usable >= MIN_BUFFER_BYTES) {
        const clean = new Uint8Array(usable)
        clean.set(merged.subarray(0, usable))
        audioQueueRef.current.push(clean.buffer)
        playAudioQueue()
        leftover = merged.subarray(usable)
      } else {
        leftover = merged
      }
    }

    // Flush any remaining buffered audio
    if (leftover.length >= 2 && !shouldStopSpeakingRef.current) {
      const usable = leftover.length - (leftover.length % 2)
      const clean = new Uint8Array(usable)
      clean.set(leftover.subarray(0, usable))
      audioQueueRef.current.push(clean.buffer)
      playAudioQueue()
    }
    console.log('[TTS] Sentence done')
  }, [playAudioQueue])

  // TTS sentence queue — process one sentence at a time serially
  const ttsQueueRef = useRef<string[]>([])
  const isTtsDrainingRef = useRef(false)

  const drainTtsQueue = useCallback(async (signal: AbortSignal) => {
    if (isTtsDrainingRef.current) return
    isTtsDrainingRef.current = true
    while (ttsQueueRef.current.length > 0 && !shouldStopSpeakingRef.current) {
      const sentence = ttsQueueRef.current.shift()!
      try {
        await speakSentence(sentence, signal)
      } catch (e: any) {
        if (e.name === 'AbortError') break
        console.error('[TTS] Sentence error:', e)
      }
    }
    isTtsDrainingRef.current = false
  }, [speakSentence])

  const queueTtsSentence = useCallback((sentence: string, signal: AbortSignal) => {
    ttsQueueRef.current.push(sentence)
    drainTtsQueue(signal)
  }, [drainTtsQueue])

  // ── Chat (queued) ────────────────────────────────────────────

  const processOne = useCallback(async (content: string) => {
    stopSpeaking()
    const userMessage: Message = { role: 'user', content }
    const newMessages = [...messagesRef.current, userMessage]
    setMessages(newMessages)
    setCurrentInput('')
    setIsProcessing(true)
    setStatus('Thinking...')
    shouldStopSpeakingRef.current = false
    ttsQueueRef.current = []
    isTtsDrainingRef.current = false

    // AbortController for TTS fetches
    const abort = new AbortController()
    ttsAbortRef.current = abort

    try {
      console.log('[CHAT] processOne called with:', content.slice(0, 60))
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          phase: phaseRef.current,
          onboardingResult: onboardingResultRef.current
        })
      })
      console.log('[CHAT] Fetch response status:', res.status)
      if (!res.ok) throw new Error(`Chat failed: ${res.status}`)

      // Check content type to determine response type
      const contentType = res.headers.get('content-type') || ''

      if (contentType.includes('application/json')) {
        // JSON response - phase transition or completion
        const data = await res.json()
        console.log('[CHAT] JSON response:', data.type)

        if (data.type === 'phase_transition') {
          // Transition to profiling phase
          setPhase(data.newPhase)
          setOnboardingResult(data.onboardingResult)
          console.log('[CHAT] Transitioning to profiling phase')

          // Immediately continue the conversation
          if (data.continueConversation) {
            // Make another call to get the first profiling question
            const continuedRes = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                messages: newMessages,
                phase: 'profiling',
                onboardingResult: data.onboardingResult
              })
            })

            if (continuedRes.ok) {
              const contType = continuedRes.headers.get('content-type') || ''
              if (contType.includes('text/plain')) {
                // Stream the response
                await streamTextResponse(continuedRes, newMessages, abort)
              }
            }
          }
        } else if (data.type === 'complete') {
          // Onboarding complete!
          setPhase('complete')
          setIsComplete(true)

          // Speak the final message
          const finalMessage = data.text
          setMessages([...newMessages, { role: 'assistant', content: finalMessage }])
          queueTtsSentence(finalMessage, abort.signal)

          console.log('[CHAT] Onboarding complete! Profile saved.')

          // ── Generate Course Structure ──
          if (data.learnerProfile) {
            setStatus('Generating course...')
            try {
              console.log('[CLIENT] Sending profile to generator:', data.learnerProfile)
              const genRes = await fetch('/api/course/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data.learnerProfile)
              })
              
              if (genRes.ok) {
                const newCourse = await genRes.json()
                console.log('[CLIENT] Received generated course:', newCourse)
                setGeneratedCourse(newCourse)
                // Save to session for course page
                sessionStorage.setItem('currentCourse', JSON.stringify(newCourse))
                sessionStorage.setItem('learnerProfile', JSON.stringify(data.learnerProfile))
                setStatus('Course ready')
              } else {
                const errText = await genRes.text()
                console.error('Failed to generate course:', errText)
                setStatus('Generation failed')
              }
            } catch (e) {
              console.error('Error generating course:', e)
              setStatus('Generation failed')
            }
          }
        }
      } else {
        // Text response - stream it
        await streamTextResponse(res, newMessages, abort)
      }
    } catch (e) {
      console.error('[CHAT] Error:', e)
      setStatus('Error occurred')
    } finally {
      setIsProcessing(false)
      if (isComplete) {
        setStatus('Course ready')
      } else {
        setStatus(isListeningRef.current ? 'Listening...' : 'Tap the orb to start')
      }
    }
  }, [stopSpeaking, queueTtsSentence, isComplete])

  // Helper to stream text response
  const streamTextResponse = useCallback(async (
    res: Response,
    newMessages: Message[],
    abort: AbortController
  ) => {
    const reader = res.body?.getReader()
    if (!reader) throw new Error('No reader')
    const decoder = new TextDecoder()
    setMessages([...newMessages, { role: 'assistant', content: '' }])

    let full = ''
    let sentenceBuffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value)
      full += chunk
      sentenceBuffer += chunk
      setMessages([...newMessages, { role: 'assistant', content: full }])

      // Split on sentence-ending punctuation, including voice tags like [giggle]
      const sentenceMatch = sentenceBuffer.match(/^([\s\S]*?[.!?…](?:\s|\[|$))/);
      if (sentenceMatch && !shouldStopSpeakingRef.current) {
        const sentence = sentenceMatch[1].trim()
        sentenceBuffer = sentenceBuffer.slice(sentenceMatch[0].length)
        if (sentence) {
          console.log('[CHAT] Queueing sentence:', sentence.slice(0, 60))
          queueTtsSentence(sentence, abort.signal)
        }
      }
    }

    // Flush remaining text
    if (sentenceBuffer.trim() && !shouldStopSpeakingRef.current) {
      console.log('[CHAT] Queueing remainder:', sentenceBuffer.trim().slice(0, 60))
      queueTtsSentence(sentenceBuffer.trim(), abort.signal)
    }

    console.log('[CHAT] Stream done, full length:', full.length)
    setMessages([...newMessages, { role: 'assistant', content: full }])
  }, [queueTtsSentence])

  const drainSendQueue = useCallback(async () => {
    if (isSendingRef.current) { console.log('[QUEUE] Already sending, skipping drain'); return }
    isSendingRef.current = true
    console.log('[QUEUE] Draining, queue length:', sendQueueRef.current.length)
    while (sendQueueRef.current.length > 0) {
      await processOne(sendQueueRef.current.shift()!)
    }
    isSendingRef.current = false
    console.log('[QUEUE] Drain complete')
  }, [processOne])

  const sendMessage = useCallback((content: string) => {
    if (!content.trim()) return
    if (isComplete) return // Don't send messages after completion
    console.log('[MSG] sendMessage called:', content.slice(0, 60))
    sendQueueRef.current.push(content)
    drainSendQueue()
  }, [drainSendQueue, isComplete])

  useEffect(() => { sendMessageRef.current = sendMessage }, [sendMessage])

  // ── Deepgram STT ─────────────────────────────────────────────

  const startListening = useCallback(async () => {
    try {
      const tokenRes = await fetch('/api/deepgram-token')
      const { token } = await tokenRes.json()
      const socket = new WebSocket(
        'wss://api.deepgram.com/v1/listen?model=nova-2&language=en&smart_format=true&interim_results=true&utterance_end_ms=2000&vad_events=true',
        ['token', token]
      )
      socketRef.current = socket

      socket.onopen = async () => {
        setIsListening(true)
        setStatus('Listening...')
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        micStreamRef.current = stream
        const ctx = getAudioContext()
        const src = ctx.createMediaStreamSource(stream)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.6
        src.connect(analyser)
        micAnalyserRef.current = analyser
        const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
        mediaRecorderRef.current = recorder
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0 && socket.readyState === WebSocket.OPEN) socket.send(e.data)
        }
        recorder.start(250)
      }

      stoppedRef.current = false  // reset so doSend works again

      let finalWords: string[] = []
      let lastSpeechTime = 0

      const doSend = () => {
        if (stoppedRef.current) return          // user already clicked stop
        if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null }
        const text = finalWords.join(' ').trim()
        if (text) { sendMessageRef.current(text); finalWords = []; setCurrentInput('') }
      }

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data)
        const now = Date.now()

        // ── Ignore transcripts while muted or TTS is playing ──
        if (isMutedRef.current) return
        if (isSpeakingRef.current || isPlayingRef.current) return

        // ── Post-TTS echo cooldown (1s) ──
        // After TTS stops, Deepgram's pipeline may still have echoed audio
        // buffered. Ignore transcripts for a short window after TTS ends.
        const POST_TTS_COOLDOWN_MS = 1000
        if (ttsEndTimeRef.current > 0 && now - ttsEndTimeRef.current < POST_TTS_COOLDOWN_MS) {
          return
        }

        // UtteranceEnd = Deepgram detected 2s of silence after speech
        if (data.type === 'UtteranceEnd') {
          doSend()
          return
        }

        const transcript = data.channel?.alternatives?.[0]?.transcript || ''
        if (!transcript) return

        // User is speaking — mark the time
        lastSpeechTime = now

        if (data.is_final) {
          finalWords.push(transcript)
          setCurrentInput(finalWords.join(' '))
        } else {
          setCurrentInput(finalWords.join(' ') + (finalWords.length ? ' ' : '') + transcript)
        }

        // Reset fallback timer on ANY speech activity
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = setTimeout(() => {
          doSend()
        }, 2500)
      }

      socket.onerror = () => setStatus('Connection error')
      socket.onclose = () => {
        setIsListening(false)
        micAnalyserRef.current = null
        if (mediaRecorderRef.current) {
          try { mediaRecorderRef.current.stop(); mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop()) } catch (_) { }
        }
      }
    } catch (e) {
      console.error('Listening error:', e)
      setStatus('Microphone access denied')
    }
  }, [getAudioContext])

  const stoppedRef = useRef(false)

  const stopListening = useCallback(() => {
    stoppedRef.current = true   // prevent any pending doSend from firing
    if (socketRef.current) { socketRef.current.close(); socketRef.current = null }
    if (mediaRecorderRef.current) {
      try { mediaRecorderRef.current.stop(); mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop()) } catch (_) { }
      mediaRecorderRef.current = null
    }
    if (micStreamRef.current) { micStreamRef.current.getTracks().forEach(t => t.stop()); micStreamRef.current = null }
    micAnalyserRef.current = null
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null }
    // Clear any queued messages so they don't fire after stop
    sendQueueRef.current = []
    isSendingRef.current = false
    setIsListening(false)
    setCurrentInput('')
    setStatus('Tap the orb to start')
  }, [])

  const navigateToCourse = useCallback(() => {
    const orbEl = document.querySelector('.orb')
    const cardEl = courseRowRef.current
    if (orbEl && cardEl) {
      const oRect = orbEl.getBoundingClientRect()
      const cRect = cardEl.getBoundingClientRect()
      setNavTransition({
        orbRect: { left: oRect.left, top: oRect.top, width: oRect.width, height: oRect.height },
        cardRect: { left: cRect.left, top: cRect.top, width: cRect.width, height: cRect.height },
      })
    } else {
      router.push('/course')
    }
  }, [router])

  const handleOrbClick = useCallback(() => {
    // If onboarding is complete, close everything then explode
    if (isComplete) {
      stopListening()
      stopSpeaking()
      setSidebarOpen(false)
      // Wait for sidebar close animation so the orb re-centers
      setTimeout(() => {
        const orbEl = document.querySelector('.orb')
        if (orbEl) {
          const rect = orbEl.getBoundingClientRect()
          setOrbExplosion({ left: rect.left, top: rect.top, width: rect.width, height: rect.height })
        } else {
          router.push('/course')
        }
      }, 450)
      return
    }
    // Ensure AudioContext is created & resumed on user gesture
    const ctx = getAudioContext()
    if (ctx.state === 'suspended') ctx.resume()
    if (!isListening) { 
      // If we are starting fresh (messages empty), ensure no old course is hanging around
      if (messages.length === 0) {
        setGeneratedCourse(null)
        sessionStorage.removeItem('currentCourse')
        sessionStorage.removeItem('learnerProfile')
      }
      setSidebarOpen(true); 
      startListening() 
    }
    else { stopListening(); stopSpeaking() }
  }, [isListening, isComplete, router, startListening, stopListening, stopSpeaking, getAudioContext, messages.length])

  const handleReset = useCallback(() => {
    stopListening(); stopSpeaking()
    setMessages([]); setCurrentInput(''); setSidebarOpen(false)
    setPhase('onboarding')
    setOnboardingResult(null)
    setIsComplete(false)
    setGeneratedCourse(null) // Clear any previous course
    sessionStorage.removeItem('currentCourse') // Clear session
    sessionStorage.removeItem('learnerProfile') // Clear profile
    setStatus('Tap the orb to start')
  }, [stopListening, stopSpeaking])

  const handleMuteToggle = useCallback(() => {
    const next = !isMuted
    setIsMuted(next)
    // Disable tracks (sends silence to Deepgram, keeping the WebSocket alive)
    if (micStreamRef.current) micStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !next })
    setStatus(next ? 'Muted' : isListening ? 'Listening...' : 'Tap the orb to start')
  }, [isMuted, isListening])

  const handleSignOut = useCallback(async () => {
    await authClient.signOut()
    router.replace('/auth/sign-in')
  }, [router])

  const handleDemoLoad = useCallback(async () => {
    try {
      setStatus('Loading demo...')
      stopListening()
      stopSpeaking()
      
      const res = await fetch('/api/demo/load-brain')
      if (res.ok) {
        const data = await res.json()
        
        // TRIGGER GENERATION FROM PROFILE
        if (data.learnerProfile) {
          setStatus('Generating course...')
          try {
            console.log('[CLIENT] Sending demo profile to generator:', data.learnerProfile)
            const genRes = await fetch('/api/course/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data.learnerProfile)
            })
            
            if (genRes.ok) {
              const newCourse = await genRes.json()
              console.log('[CLIENT] Received generated course:', newCourse)
              setGeneratedCourse(newCourse)
              // Save to session for course page
              sessionStorage.setItem('currentCourse', JSON.stringify(newCourse))
              sessionStorage.setItem('learnerProfile', JSON.stringify(data.learnerProfile))
              setStatus('Course ready')
              setPhase('complete')
              setIsComplete(true)
              setMessages([{ role: 'assistant', content: "I've generated a fresh course for you based on the demo profile. Click the orb to begin!" }])
            } else {
              const errText = await genRes.text()
              console.error('Failed to generate course:', errText)
              setStatus('Generation failed')
            }
          } catch (e) {
            console.error('Error generating course:', e)
            setStatus('Generation failed')
          }
        }
      } else {
        setStatus('Demo failed')
        console.error('Demo load failed')
      }
    } catch (e) {
      setStatus('Error loading demo')
      console.error(e)
    }
  }, [stopListening, stopSpeaking])

  const getOrbState = () => {
    if (isComplete) return 'complete'
    if (isProcessing) return 'processing'
    if (isSpeaking) return 'speaking'
    if (isListening) return 'listening'
    return ''
  }

  const orbStyle = {
    transform: `scale(${orbScale})`,
    boxShadow: isComplete
      ? `0 0 ${40 + (orbScale - 1) * 200}px rgba(0, 200, 100, ${0.3 + (orbScale - 1) * 1.5})`
      : `0 0 ${40 + (orbScale - 1) * 200}px rgba(255, 107, 0, ${0.3 + (orbScale - 1) * 1.5})`,
  }

  return (
    <>
      <Head>
        <title>Voice Onboarding</title>
        <meta name="description" content="AI Voice Onboarding Assistant" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap" rel="stylesheet" />
      </Head>

      <div className="container">
        <div className={`orb-area ${sidebarOpen ? 'shifted' : ''}`}>
          <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: 10, zIndex: 100 }}>
            <button 
              type="button" 
              onClick={handleDemoLoad}
              style={{
                padding: '6px 12px',
                background: '#eee',
                border: '1px solid #ddd',
                borderRadius: 6,
                fontSize: 12,
                cursor: 'pointer',
                color: '#333'
              }}
            >
              Demo
            </button>
            {session.data && (
              <button type="button" className="sign-out-btn" onClick={handleSignOut} title="Sign out">
                Sign out
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className={`orb ${getOrbState()}`} style={{ ...orbStyle, opacity: (navTransition || orbExplosion) ? 0 : undefined }} onClick={handleOrbClick} />
            {isComplete ? (
              <p className="complete-message">Tap the orb to view course</p>
            ) : (
              <p className="status">{status}</p>
            )}
            <button className={`mute-btn ${isMuted ? 'active' : ''}`} onClick={handleMuteToggle} title={isMuted ? 'Unmute mic' : 'Mute mic'}>
              {isMuted ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="1" y1="1" x2="23" y2="23" /><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" /><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.49-.35 2.17" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              )}
            </button>

          </div>

          {/* Courses section — anchored to bottom */}
          {(() => {
            // Only show the course if it has been generated or loaded from demo.
            // No more hardcoded MOCK_COURSE to confuse the user.
            const displayCourses = generatedCourse ? [generatedCourse] : [];
            
            if (displayCourses.length === 0) return null;
            
            return (
              <div className={`courses-section ${sidebarOpen ? 'courses-shifted' : ''}`}>
                <p className="courses-label">Your courses</p>
                {displayCourses.map((c, i) => {
                  const totalParts = (course: Course) => course.phases.reduce((s, p) => s + p.parts.length, 0);
                  const masteredParts = (course: Course) => course.phases.reduce((s, p) => s + p.parts.filter(pt => pt.status === 'mastered').length, 0);
                  
                  const total = totalParts(c);
                  const mastered = masteredParts(c);
                  const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;
                  return (
                    <div key={i} className="course-row" ref={courseRowRef} style={{ visibility: (flyInPending || flyingCard || navTransition) ? 'hidden' : 'visible' }} onClick={navigateToCourse}>
                      <div className="course-row-left">
                        <div className="course-row-dot" style={{ background: pct === 100 ? '#00c864' : '#ff6b00' }} />
                        <div className="course-row-info">
                          <span className="course-row-title">{c.title}</span>
                          <span className="course-row-meta">{c.phases.length} phases · {total} lessons</span>
                        </div>
                      </div>
                      <div className="course-row-right">
                        <span className="course-row-pct" style={{ color: pct === 100 ? '#00c864' : '#999' }}>{pct}%</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {!sidebarOpen && (
          <button className="toggle-btn" onClick={() => setSidebarOpen(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        )}

        <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-head">
            <button className="close-btn" onClick={() => setSidebarOpen(false)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            <h2>Onboarding</h2>
            <button className="reset-btn" onClick={handleReset}>Reset</button>
          </div>

          <div className="messages">
            {messages.map((msg, i) => (
              <div key={i} className={`msg ${msg.role}`}>{msg.content}</div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="input-area">
            <div className="input-row">
              <textarea
                value={currentInput}
                readOnly
                placeholder="Listening..."
                rows={1}
              />
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .complete-message {
          color: #00c864;
          font-size: 14px;
          margin-top: 20px;
          text-align: center;
        }
        .orb.complete {
          background: linear-gradient(135deg, #00c864, #00a855);
        }
        .courses-section {
          position: absolute;
          bottom: 32px;
          left: 50%;
          transform: translateX(-50%);
          width: 300px;
          transition: left 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .courses-section.courses-shifted {
          left: calc(50% - 190px);
        }
        .courses-label {
          font-size: 11px;
          font-weight: 500;
          color: #a0a0a0;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin: 0 0 8px 2px;
        }
        .course-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          border: 1px solid #ece9e4;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.15s ease;
          background: #faf9f7;
        }
        .course-row:hover {
          border-color: #d9d4cd;
          background: #f0eeea;
        }
        .course-row + .course-row {
          margin-top: 6px;
        }
        .course-row-left {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .course-row-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .course-row-info {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .course-row-title {
          font-size: 13px;
          font-weight: 500;
          color: #1a1a1a;
          letter-spacing: -0.01em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .course-row-meta {
          font-size: 11px;
          color: #a0a0a0;
          margin-top: 1px;
        }
        .course-row-right {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }
        .course-row-pct {
          font-size: 11px;
          font-weight: 500;
        }
      `}</style>

      {/* ── Navigate-to-course transition ── */}
      {navTransition && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none' }}>
          {/* Orb clone — shrinks and floats up */}
          <motion.div
            initial={{
              left: navTransition.orbRect.left,
              top: navTransition.orbRect.top,
              width: navTransition.orbRect.width,
              height: navTransition.orbRect.height,
              opacity: 1,
              scale: 1,
            }}
            animate={{
              scale: 0.25,
              opacity: 0,
              y: -60,
            }}
            transition={{ duration: 0.55, ease: [0.32, 0, 0.15, 1] }}
            style={{
              position: 'fixed',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ff6b00, #ff8533)',
              boxShadow: '0 0 40px rgba(255, 107, 0, 0.3)',
            }}
          />

          {/* Card clone — expands to fill viewport */}
          <motion.div
            initial={{
              left: navTransition.cardRect.left,
              top: navTransition.cardRect.top,
              width: navTransition.cardRect.width,
              height: navTransition.cardRect.height,
              borderRadius: 10,
              opacity: 1,
            }}
            animate={{
              left: 0,
              top: 0,
              width: typeof window !== 'undefined' ? window.innerWidth : 1440,
              height: typeof window !== 'undefined' ? window.innerHeight : 900,
              borderRadius: 0,
              opacity: 1,
            }}
            transition={{ duration: 0.55, ease: [0.32, 0, 0.15, 1] }}
            onAnimationComplete={() => router.push('/course')}
            style={{
              position: 'fixed',
              background: '#faf9f7',
              boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
              border: '1px solid #ece9e4',
              overflow: 'hidden',
            }}
          >
            {/* Card content that fades away as it expands */}
            <motion.div
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                whiteSpace: 'nowrap',
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff6b00', flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column' as const }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a', letterSpacing: '-0.01em' }}>{(generatedCourse || MOCK_COURSE).title}</span>
                  <span style={{ fontSize: 11, color: '#a0a0a0', marginTop: 1 }}>{(generatedCourse || MOCK_COURSE).phases.length} phases</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      )}

      {/* ── Orb explosion → course nodes transition ── */}
      {orbExplosion && (
        <OrbExplosion
          orbRect={orbExplosion}
          onComplete={() => {
            router.push('/course')
          }}
        />
      )}

      {/* Card fly-in — arrives from course page and lands in the course row */}
      {flyingCard && (() => {
        const c = generatedCourse || MOCK_COURSE
        const totalP = c.phases.reduce((s, p) => s + p.parts.length, 0)
        const masteredP = c.phases.reduce((s, p) => s + p.parts.filter(pt => pt.status === 'mastered').length, 0)
        const pct = totalP > 0 ? Math.round((masteredP / totalP) * 100) : 0
        return (
          <motion.div
            key="flying-card"
            initial={{
              left: flyingCard.start.left,
              top: flyingCard.start.top,
              width: flyingCard.start.width,
            }}
            animate={{
              left: flyingCard.target.left,
              top: flyingCard.target.top,
              width: flyingCard.target.width,
            }}
            transition={{
              duration: 0.6,
              ease: [0.32, 0, 0.15, 1],
            }}
            onAnimationComplete={() => setFlyingCard(null)}
            style={{
              position: 'fixed',
              zIndex: 9999,
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              border: '1px solid #ece9e4',
              borderRadius: 10,
              background: '#faf9f7',
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: pct === 100 ? '#00c864' : '#ff6b00', flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column' as const }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>{c.title}</span>
                <span style={{ fontSize: 11, color: '#a0a0a0', marginTop: 1 }}>{c.phases.length} phases · {totalP} lessons</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 500, color: pct === 100 ? '#00c864' : '#999' }}>{pct}%</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </div>
          </motion.div>
        )
      })()}
    </>
  )
}

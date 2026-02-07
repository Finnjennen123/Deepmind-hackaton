import { useState, useRef, useEffect } from 'react'
import type { TeachBotConfig } from '../../lib/pipeline/types'

export default function TeachTheBot({ rounds }: { rounds: TeachBotConfig[] }) {
  const [roundIndex, setRoundIndex] = useState(0)
  const [statementIndex, setStatementIndex] = useState(0)
  const [chatHistory, setChatHistory] = useState<{ type: 'bot' | 'user' | 'system'; text: string }[]>([])
  const [inputValue, setInputValue] = useState('')
  const [score, setScore] = useState(0)
  const [waitingForResponse, setWaitingForResponse] = useState(false)
  const [loading, setLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const round = rounds[roundIndex]

  // Show first bot statement on mount / round change
  useEffect(() => {
    setChatHistory([{ type: 'bot', text: round.botStatements[0].text }])
    setStatementIndex(0)
    setWaitingForResponse(true)
  }, [roundIndex, round.botStatements])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  async function handleSubmit() {
    if (!inputValue.trim() || !waitingForResponse || loading) return

    const current = round.botStatements[statementIndex]
    const userText = inputValue.trim()
    setInputValue('')
    setWaitingForResponse(false)
    setLoading(true)

    // Add user response + typing indicator
    setChatHistory(prev => [
      ...prev,
      { type: 'user' as const, text: userText },
      { type: 'system' as const, text: '...' },
    ])

    try {
      const res = await fetch('/api/game-eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'teach-evaluate',
          topic: round.topic,
          statement: current.text,
          isWrong: current.isWrong,
          whatsWrong: current.whatsWrong,
          hint: current.hint,
          userResponse: userText,
        }),
      })

      const { caught, feedback } = await res.json()

      if (caught) setScore(prev => prev + 1)

      // Replace typing indicator with real feedback
      setChatHistory(prev => {
        const updated = prev.slice(0, -1) // remove "..."
        updated.push({ type: 'system' as const, text: feedback })
        return updated
      })
    } catch {
      // Fallback to simple heuristic if API fails
      setChatHistory(prev => {
        const updated = prev.slice(0, -1)
        if (current.isWrong && userText.length > 20) {
          updated.push({ type: 'system' as const, text: `Good catch! ${current.whatsWrong}` })
          setScore(prev => prev + 1)
        } else if (current.isWrong) {
          updated.push({ type: 'system' as const, text: `Hint: ${current.hint}` })
        } else {
          updated.push({ type: 'system' as const, text: "That one was actually correct! Let's keep going." })
        }
        return updated
      })
    }

    setLoading(false)

    // Move to next statement
    const nextIndex = statementIndex + 1
    if (nextIndex < round.botStatements.length) {
      setTimeout(() => {
        setChatHistory(prev => [...prev, { type: 'bot', text: round.botStatements[nextIndex].text }])
        setStatementIndex(nextIndex)
        setWaitingForResponse(true)
      }, 1000)
    }
  }

  function reset() {
    setRoundIndex(0)
    setStatementIndex(0)
    setChatHistory([])
    setScore(0)
    setInputValue('')
  }

  const isComplete = statementIndex >= round.botStatements.length - 1 && !waitingForResponse && chatHistory.length > 1

  return (
    <div className="game-container">
      <h2 className="game-title">Teach the Bot</h2>
      <p className="game-subtitle">The bot is learning {round.topic}. Correct its mistakes!</p>

      <div className="game-stats">
        <div className="stat">
          <div className="stat-value">{score}</div>
          <div className="stat-label">Corrections</div>
        </div>
        <div className="stat">
          <div className="stat-value">{statementIndex + 1}/{round.botStatements.length}</div>
          <div className="stat-label">Progress</div>
        </div>
      </div>

      <div className="teach-bot-chat">
        {chatHistory.map((msg, i) => {
          if (msg.type === 'bot') {
            return (
              <div key={i} className="bot-message">
                <div className="bot-label">Bot</div>
                {msg.text}
              </div>
            )
          }
          if (msg.type === 'user') {
            return <div key={i} className="user-response">{msg.text}</div>
          }
          return (
            <div key={i} className="bot-message" style={{ background: '#ecfdf5', borderColor: '#00c864' }}>
              {msg.text}
            </div>
          )
        })}
        <div ref={chatEndRef} />
      </div>

      {(waitingForResponse || loading) && (
        <div className="teach-input-area">
          <input
            className="teach-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder={loading ? 'Evaluating...' : 'Is this right or wrong? Explain...'}
            disabled={loading}
          />
          <button className="teach-submit" onClick={handleSubmit} disabled={loading}>
            {loading ? '...' : 'Send'}
          </button>
        </div>
      )}

      {isComplete && (
        <div className="game-actions">
          <button className="btn-primary" onClick={reset}>Play Again</button>
        </div>
      )}
    </div>
  )
}

'use client'
import { useState, useEffect } from 'react'

export default function Blackjack() {
  const [playerHand, setPlayerHand] = useState([])
  const [dealerHand, setDealerHand] = useState([])
  const [deck, setDeck] = useState([])
  const [gameStarted, setGameStarted] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [message, setMessage] = useState('')
  const [playerScore, setPlayerScore] = useState(0)
  const [dealerScore, setDealerScore] = useState(0)
  const [showDealerCard, setShowDealerCard] = useState(false)
  
  // Betting state
  const [balance, setBalance] = useState(1000)
  const [currentBet, setCurrentBet] = useState(0)
  const [betPlaced, setBetPlaced] = useState(false)
  const [hasDoubled, setHasDoubled] = useState(false)
  
  // AI Advisor
  const [suggestion, setSuggestion] = useState('')

  // Get optimal play suggestion
  const getOptimalPlay = (playerScore, dealerUpCard, playerHand) => {
    if (!dealerUpCard) return ''
    
    const dealerValue = dealerUpCard.value === 'A' ? 11 : ['J', 'Q', 'K'].includes(dealerUpCard.value) ? 10 : parseInt(dealerUpCard.value)
    const hasAce = playerHand.some(card => card.value === 'A')
    const isPair = playerHand.length === 2 && playerHand[0].value === playerHand[1].value
    
    // Basic strategy logic
    if (playerScore >= 17) {
      return '🤖 STAND - Your hand is strong enough'
    }
    
    if (playerScore <= 11) {
      return '🤖 HIT - You can\'t bust, get another card'
    }
    
    if (playerHand.length === 2 && playerScore >= 10 && playerScore <= 11 && dealerValue <= 9) {
      return '🤖 DOUBLE - Strong position to double down'
    }
    
    if (playerScore === 12) {
      if (dealerValue >= 4 && dealerValue <= 6) {
        return '🤖 STAND - Dealer likely to bust'
      } else {
        return '🤖 HIT - Improve your hand'
      }
    }
    
    if (playerScore >= 13 && playerScore <= 16) {
      if (dealerValue >= 2 && dealerValue <= 6) {
        return '🤖 STAND - Dealer showing weak card'
      } else {
        return '🤖 HIT - Dealer has strong position'
      }
    }
    
    return '🤖 HIT - Build your hand'
  }

  // Update suggestion whenever hands change
  useEffect(() => {
    if (gameStarted && !gameOver && playerHand.length > 0 && dealerHand.length > 0) {
      const dealerUpCard = dealerHand[0]
      const advice = getOptimalPlay(playerScore, dealerUpCard, playerHand)
      setSuggestion(advice)
    } else {
      setSuggestion('')
    }
  }, [playerHand, dealerHand, playerScore, gameStarted, gameOver])

  // Create a deck of cards
  const createDeck = () => {
    const suits = ['♥', '♦', '♣', '♠']
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
    const newDeck = []
    
    for (let suit of suits) {
      for (let value of values) {
        newDeck.push({ suit, value })
      }
    }
    
    // Shuffle deck
    return newDeck.sort(() => Math.random() - 0.5)
  }

  // Calculate hand value
  const calculateScore = (hand) => {
    let score = 0
    let aces = 0

    for (let card of hand) {
      if (card.value === 'A') {
        aces += 1
        score += 11
      } else if (['J', 'Q', 'K'].includes(card.value)) {
        score += 10
      } else {
        score += parseInt(card.value)
      }
    }

    // Adjust for aces
    while (score > 21 && aces > 0) {
      score -= 10
      aces -= 1
    }

    return score
  }

  // Place bet
  const placeBet = (amount) => {
    if (amount > balance) {
      alert("Insufficient credits!")
      return
    }
    setCurrentBet(amount)
    setBetPlaced(true)
  }

  // Start new game
  const startGame = () => {
    if (!betPlaced) {
      alert("Place your bet first, choom!")
      return
    }

    const newDeck = createDeck()
    const playerCards = [newDeck.pop(), newDeck.pop()]
    const dealerCards = [newDeck.pop(), newDeck.pop()]

    setDeck(newDeck)
    setPlayerHand(playerCards)
    setDealerHand(dealerCards)
    setPlayerScore(calculateScore(playerCards))
    setDealerScore(calculateScore(dealerCards))
    setGameStarted(true)
    setGameOver(false)
    setShowDealerCard(false)
    setMessage('')
    setBalance(balance - currentBet)
    setHasDoubled(false)
  }

  // Player hits
  const hit = () => {
    const newDeck = [...deck]
    const newCard = newDeck.pop()
    const newHand = [...playerHand, newCard]
    const newScore = calculateScore(newHand)

    setDeck(newDeck)
    setPlayerHand(newHand)
    setPlayerScore(newScore)

    if (newScore > 21) {
      setGameOver(true)
      setShowDealerCard(true)
      setMessage(`>> BUST! -${currentBet} CREDITS <<`)
    }
  }

  // Double down
  const doubleDown = () => {
    if (currentBet > balance) {
      alert("Not enough credits to double!")
      return
    }
    
    const doubledBet = currentBet * 2  // Calculate doubled bet
    
    setBalance(balance - currentBet)
    setCurrentBet(doubledBet)  // Set to doubled amount
    setHasDoubled(true)
    
    // Hit one card then auto-stand
    const newDeck = [...deck]
    const newCard = newDeck.pop()
    const newHand = [...playerHand, newCard]
    const newScore = calculateScore(newHand)

    setDeck(newDeck)
    setPlayerHand(newHand)
    setPlayerScore(newScore)

    if (newScore > 21) {
      setGameOver(true)
      setShowDealerCard(true)
      setMessage(`>> BUST! -${doubledBet} CREDITS <<`)  // Use doubledBet here
    } else {
      // Auto stand after double - PASS THE DOUBLED BET
      setTimeout(() => stand(newScore, newDeck, newHand, doubledBet), 1000)
    }
  }

  // Player stands
  const stand = (scoreOverride = null, deckOverride = null, handOverride = null, betOverride = null) => {
    setShowDealerCard(true)
    let newDeck = deckOverride || [...deck]
    let newDealerHand = [...dealerHand]
    let newDealerScore = calculateScore(newDealerHand)
    const finalPlayerScore = scoreOverride || playerScore
    const finalBet = betOverride || currentBet  // Use passed bet or current bet
    
    // Get current balance - important for when doubling has already deducted
    const currentBalance = balance

    // Dealer hits until 17 or higher
    while (newDealerScore < 17) {
      const newCard = newDeck.pop()
      newDealerHand.push(newCard)
      newDealerScore = calculateScore(newDealerHand)
    }

    setDealerHand(newDealerHand)
    setDealerScore(newDealerScore)
    setDeck(newDeck)
    setGameOver(true)

    // Determine winner and update balance - USE finalBet instead of currentBet
    if (newDealerScore > 21) {
      const winnings = finalBet * 2
      setBalance(currentBalance + winnings)
      setMessage(`>> DEALER FLATLINED! +${finalBet} CREDITS <<`)
    } else if (newDealerScore > finalPlayerScore) {
      setMessage(`>> DEALER WINS! -${finalBet} CREDITS <<`)
    } else if (newDealerScore < finalPlayerScore) {
      const winnings = finalBet * 2
      setBalance(currentBalance + winnings)
      setMessage(`>> VICTORY! +${finalBet} CREDITS <<`)
    } else {
      setBalance(currentBalance + finalBet)
      setMessage(`>> DRAW! ${finalBet} CREDITS RETURNED <<`)
    }
  }

  // Reset for new round
  const newRound = () => {
    setGameStarted(false)
    setBetPlaced(false)
    setCurrentBet(0)
    setPlayerHand([])
    setDealerHand([])
    setMessage('')
    setHasDoubled(false)
    setSuggestion('')
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Cyberpunk grid background */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-black to-cyan-900/20"></div>
      <div className="absolute inset-0" style={{
        backgroundImage: `
          linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px'
      }}></div>
      
      {/* Glowing orbs */}
      <div className="absolute top-20 left-20 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-500/30 rounded-full blur-3xl"></div>

      <div className="relative max-w-6xl mx-auto p-4 min-h-screen flex flex-col justify-center">
        {/* Title and Balance */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(0,255,255,0.5)]">
            ◢ BLACKJACK 2077 ◣
          </h1>
          <div className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border-2 border-cyan-400 px-6 py-3 rounded-lg font-bold text-3xl text-cyan-400 shadow-[0_0_20px_rgba(0,255,255,0.3)] backdrop-blur-sm">
            ◈ {balance} CR
          </div>
        </div>

        {/* AI Advisor Panel */}
        {suggestion && (
          <div className="mb-6 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-2 border-green-400 rounded-xl p-4 backdrop-blur-sm shadow-[0_0_20px_rgba(34,197,94,0.3)] animate-pulse">
            <div className="flex items-center gap-3">
              <div className="text-4xl">🤖</div>
              <div>
                <p className="text-green-400 font-bold text-sm mb-1">◈ AI TACTICAL ADVISOR ◈</p>
                <p className="text-green-300 text-lg font-semibold">{suggestion}</p>
              </div>
            </div>
          </div>
        )}

        {/* Game Area */}
        <div className="bg-black/60 backdrop-blur-xl rounded-2xl shadow-[0_0_50px_rgba(0,255,255,0.3)] p-8 border-2 border-cyan-500/50">
          
          {!gameStarted ? (
            <div className="text-center py-12">
              {!betPlaced ? (
                <>
                  <h2 className="text-4xl font-bold text-transparent bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text mb-8 animate-pulse">
                    &gt;&gt; PLACE YOUR BET &lt;&lt;
                  </h2>
                  <div className="flex gap-4 justify-center flex-wrap mb-6">
                    <button
                      onClick={() => placeBet(10)}
                      disabled={balance < 10}
                      className="bg-gradient-to-r from-cyan-600 to-cyan-400 hover:from-cyan-500 hover:to-cyan-300 disabled:from-gray-700 disabled:to-gray-600 text-black font-bold text-xl py-4 px-8 rounded-lg transition transform hover:scale-105 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(0,255,255,0.5)] hover:shadow-[0_0_25px_rgba(0,255,255,0.8)]"
                    >
                      10 CR
                    </button>
                    <button
                      onClick={() => placeBet(25)}
                      disabled={balance < 25}
                      className="bg-gradient-to-r from-purple-600 to-purple-400 hover:from-purple-500 hover:to-purple-300 disabled:from-gray-700 disabled:to-gray-600 text-black font-bold text-xl py-4 px-8 rounded-lg transition transform hover:scale-105 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(168,85,247,0.5)] hover:shadow-[0_0_25px_rgba(168,85,247,0.8)]"
                    >
                      25 CR
                    </button>
                    <button
                      onClick={() => placeBet(50)}
                      disabled={balance < 50}
                      className="bg-gradient-to-r from-pink-600 to-pink-400 hover:from-pink-500 hover:to-pink-300 disabled:from-gray-700 disabled:to-gray-600 text-black font-bold text-xl py-4 px-8 rounded-lg transition transform hover:scale-105 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(236,72,153,0.5)] hover:shadow-[0_0_25px_rgba(236,72,153,0.8)]"
                    >
                      50 CR
                    </button>
                    <button
                      onClick={() => placeBet(100)}
                      disabled={balance < 100}
                      className="bg-gradient-to-r from-yellow-600 to-yellow-400 hover:from-yellow-500 hover:to-yellow-300 disabled:from-gray-700 disabled:to-gray-600 text-black font-bold text-xl py-4 px-8 rounded-lg transition transform hover:scale-105 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(234,179,8,0.5)] hover:shadow-[0_0_25px_rgba(234,179,8,0.8)]"
                    >
                      100 CR
                    </button>
                    <button
                      onClick={() => placeBet(balance)}
                      disabled={balance === 0}
                      className="bg-gradient-to-r from-red-600 via-orange-500 to-yellow-400 hover:from-red-500 hover:via-orange-400 hover:to-yellow-300 disabled:from-gray-700 disabled:to-gray-600 text-black font-bold text-xl py-4 px-8 rounded-lg transition transform hover:scale-105 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(239,68,68,0.6)] hover:shadow-[0_0_30px_rgba(239,68,68,0.9)] animate-pulse"
                    >
                      ALL IN
                    </button>
                  </div>
                  
                  {balance === 0 && (
                    <div className="mt-4">
                      <p className="text-red-400 text-2xl mb-4 font-bold animate-pulse">&gt;&gt; FLATLINED &lt;&lt;</p>
                      <button
                        onClick={() => setBalance(1000)}
                        className="bg-gradient-to-r from-green-600 to-emerald-400 hover:from-green-500 hover:to-emerald-300 text-black font-bold text-lg py-3 px-6 rounded-lg transition shadow-[0_0_15px_rgba(34,197,94,0.5)]"
                      >
                        ◈ RELOAD 1000 CR ◈
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border-2 border-cyan-400 py-6 px-8 rounded-xl mb-6 inline-block backdrop-blur-sm shadow-[0_0_30px_rgba(0,255,255,0.4)]">
                    <p className="text-xl font-semibold text-cyan-300 mb-2">◈ CURRENT BET ◈</p>
                    <p className="text-5xl font-bold text-transparent bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text">{currentBet} CR</p>
                  </div>
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={startGame}
                      className="bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-bold text-2xl py-6 px-12 rounded-xl transition transform hover:scale-110 shadow-[0_0_30px_rgba(0,255,255,0.5)] hover:shadow-[0_0_40px_rgba(0,255,255,0.8)]"
                    >
                      ▶ INITIALIZE ◀
                    </button>
                    <button
                      onClick={() => {
                        setBetPlaced(false)
                        setCurrentBet(0)
                      }}
                      className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-bold text-xl py-4 px-8 rounded-xl transition shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                    >
                      ✕ ABORT
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              {/* Current Bet Display */}
              <div className="text-center mb-6">
                <span className="bg-gradient-to-r from-cyan-500/30 to-purple-500/30 border border-cyan-400 text-cyan-300 px-6 py-2 rounded-full font-bold text-xl backdrop-blur-sm shadow-[0_0_15px_rgba(0,255,255,0.3)]">
                  ◈ BET: {currentBet} CR ◈
                </span>
              </div>

              {/* Dealer's Hand */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold text-cyan-400 mb-4 drop-shadow-[0_0_10px_rgba(0,255,255,0.8)]">
                  &gt;&gt; DEALER {showDealerCard && `[${dealerScore}]`} &lt;&lt;
                </h2>
                <div className="flex gap-4 justify-center">
                  {dealerHand.map((card, index) => (
                    <div
                      key={index}
                      className={`w-28 h-40 rounded-xl shadow-[0_0_20px_rgba(0,255,255,0.3)] flex flex-col items-center justify-center text-5xl font-bold border-2 transition-all ${
                        index === 1 && !showDealerCard 
                          ? 'bg-gradient-to-br from-gray-900 to-gray-700 border-purple-500' 
                          : card.suit === '♥' || card.suit === '♦' 
                            ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-pink-500 text-pink-400' 
                            : 'bg-gradient-to-br from-gray-900 to-gray-800 border-cyan-500 text-cyan-400'
                      }`}
                    >
                      {index === 1 && !showDealerCard ? (
                        <span className="text-purple-400 text-6xl">◈</span>
                      ) : (
                        <>
                          <div className="drop-shadow-[0_0_5px_rgba(0,255,255,0.8)]">{card.value}</div>
                          <div className="drop-shadow-[0_0_5px_rgba(0,255,255,0.8)]">{card.suit}</div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Player's Hand */}
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-purple-400 mb-4 drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]">
                  &gt;&gt; YOU [{playerScore}] &lt;&lt;
                </h2>
                <div className="flex gap-4 justify-center">
                  {playerHand.map((card, index) => (
                    <div
                      key={index}
                      className={`w-28 h-40 rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.3)] flex flex-col items-center justify-center text-5xl font-bold border-2 ${
                        card.suit === '♥' || card.suit === '♦' 
                          ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-pink-500 text-pink-400' 
                          : 'bg-gradient-to-br from-gray-900 to-gray-800 border-cyan-500 text-cyan-400'
                      }`}
                    >
                      <div className="drop-shadow-[0_0_5px_rgba(168,85,247,0.8)]">{card.value}</div>
                      <div className="drop-shadow-[0_0_5px_rgba(168,85,247,0.8)]">{card.suit}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Message */}
              {message && (
                <div className="text-center mb-6">
                  <p className="text-3xl font-bold text-transparent bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text py-4 px-6 rounded-xl border-2 border-cyan-400 backdrop-blur-sm shadow-[0_0_30px_rgba(0,255,255,0.4)] animate-pulse">
                    {message}
                  </p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-4 justify-center flex-wrap">
                {!gameOver ? (
                  <>
                    <button
                      onClick={hit}
                      className="bg-gradient-to-r from-cyan-600 to-cyan-400 hover:from-cyan-500 hover:to-cyan-300 text-black font-bold text-xl py-4 px-10 rounded-xl transition transform hover:scale-105 shadow-[0_0_15px_rgba(0,255,255,0.5)] hover:shadow-[0_0_25px_rgba(0,255,255,0.8)]"
                    >
                      ▲ HIT
                    </button>
                    <button
                      onClick={() => stand()}
                      className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-bold text-xl py-4 px-10 rounded-xl transition transform hover:scale-105 shadow-[0_0_15px_rgba(239,68,68,0.5)] hover:shadow-[0_0_25px_rgba(239,68,68,0.8)]"
                    >
                      ■ STAND
                    </button>
                    {playerHand.length === 2 && !hasDoubled && (
                      <button
                        onClick={doubleDown}
                        disabled={currentBet > balance}
                        className="bg-gradient-to-r from-yellow-600 to-orange-500 hover:from-yellow-500 hover:to-orange-400 disabled:from-gray-700 disabled:to-gray-600 text-black font-bold text-xl py-4 px-10 rounded-xl transition transform hover:scale-105 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(234,179,8,0.5)] hover:shadow-[0_0_25px_rgba(234,179,8,0.8)]"
                      >
                        ◆ DOUBLE
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    onClick={newRound}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xl py-4 px-12 rounded-xl transition transform hover:scale-105 shadow-[0_0_20px_rgba(168,85,247,0.5)] hover:shadow-[0_0_30px_rgba(168,85,247,0.8)]"
                  >
                    ▶ NEW ROUND ◀
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <a href="/" className="text-cyan-400 hover:text-cyan-300 font-semibold drop-shadow-[0_0_5px_rgba(0,255,255,0.8)]">
            ← JACK OUT
          </a>
        </div>
      </div>
    </div>
  )
}
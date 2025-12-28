'use client'
import { useState, useEffect, useRef } from 'react'
import { db, id } from '../lib/instant'

export default function Blackjack() {
  // Auth state
  const { isLoading, user, error } = db.useAuth()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sentEmail, setSentEmail] = useState('')

  const [playerHand, setPlayerHand] = useState([])
  const [dealerHand, setDealerHand] = useState([])
  const [deck, setDeck] = useState([])
  const [gameStarted, setGameStarted] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [message, setMessage] = useState('')
  const [playerScore, setPlayerScore] = useState(0)
  const [dealerScore, setDealerScore] = useState(0)
  const [showDealerCard, setShowDealerCard] = useState(false)

  // Player state
  const [playerName, setPlayerName] = useState('')
  const [playerId, setPlayerId] = useState(null)
  const [hasEnteredName, setHasEnteredName] = useState(false)

  // Betting state
  const [balance, setBalance] = useState(1000)
  const [currentBet, setCurrentBet] = useState(0)
  const [betPlaced, setBetPlaced] = useState(false)
  const [hasDoubled, setHasDoubled] = useState(false)

  // Insurance state
  const [insuranceOffered, setInsuranceOffered] = useState(false)
  const [insuranceBet, setInsuranceBet] = useState(0)
  const [insuranceTaken, setInsuranceTaken] = useState(false)

  // Split state
  const [isSplit, setIsSplit] = useState(false)
  const [splitHand, setSplitHand] = useState([])
  const [splitScore, setSplitScore] = useState(0)
  const [currentHand, setCurrentHand] = useState('main') // 'main' or 'split'
  const [splitBet, setSplitBet] = useState(0)
  const [splitAces, setSplitAces] = useState(false)

  // Blackjack detection
  const [playerBlackjack, setPlayerBlackjack] = useState(false)
  const [dealerBlackjack, setDealerBlackjack] = useState(false)

  // AI Advisor
  const [suggestion, setSuggestion] = useState('')

  // Music state
  const [isMusicPlaying, setIsMusicPlaying] = useState(false)
  const [volume, setVolume] = useState(0.3)
  const audioRef = useRef(null)

  // Get optimal play suggestion
  const getOptimalPlay = (playerScore, dealerUpCard, playerHand, isSplitHand, canSplit, canDouble) => {
    if (!dealerUpCard) return ''

    const dealerValue = dealerUpCard.value === 'A' ? 11 : ['J', 'Q', 'K'].includes(dealerUpCard.value) ? 10 : parseInt(dealerUpCard.value)
    const hasAce = playerHand.some(card => card.value === 'A')
    const isPair = playerHand.length === 2 && playerHand[0].value === playerHand[1].value

    // Pair splitting strategy
    if (isPair && canSplit && !isSplitHand) {
      const pairValue = playerHand[0].value
      if (pairValue === 'A' || pairValue === '8') {
        return '🤖 SPLIT - Always split Aces and 8s'
      }
      if (pairValue === '10' || pairValue === 'J' || pairValue === 'Q' || pairValue === 'K') {
        return '🤖 STAND - Never split 10s'
      }
      if ((pairValue === '2' || pairValue === '3' || pairValue === '7') && dealerValue >= 2 && dealerValue <= 7) {
        return '🤖 SPLIT - Good split opportunity'
      }
      if (pairValue === '6' && dealerValue >= 2 && dealerValue <= 6) {
        return '🤖 SPLIT - Split against weak dealer card'
      }
      if (pairValue === '9' && dealerValue !== 7 && dealerValue !== 10 && dealerValue !== 11) {
        return '🤖 SPLIT - Split 9s except vs 7, 10, or A'
      }
    }

    // Insurance recommendation
    if (dealerUpCard.value === 'A' && !playerBlackjack) {
      return '🤖 NO INSURANCE - Insurance is a sucker bet'
    }

    // Basic strategy logic
    if (playerScore >= 17) {
      return '🤖 STAND - Your hand is strong enough'
    }

    if (playerScore <= 11) {
      if (playerHand.length === 2 && canDouble && playerScore >= 10 && dealerValue <= 9) {
        return '🤖 DOUBLE - Strong doubling opportunity'
      }
      return '🤖 HIT - You can\'t bust, get another card'
    }

    if (playerHand.length === 2 && canDouble && playerScore >= 10 && playerScore <= 11 && dealerValue <= 9) {
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
    if (gameStarted && !gameOver && !insuranceOffered && !splitAces && playerHand.length > 0 && dealerHand.length > 0) {
      const dealerUpCard = dealerHand[0]
      const activeHand = currentHand === 'main' ? playerHand : splitHand
      const activeScore = currentHand === 'main' ? playerScore : splitScore
      const canSplit = playerHand.length === 2 && !isSplit && canSplitCards(playerHand[0], playerHand[1]) && currentBet <= balance
      const betToCheck = currentHand === 'main' ? currentBet : splitBet
      const activeHandLength = currentHand === 'main' ? playerHand.length : splitHand.length
      const canDouble = activeHandLength === 2 && !hasDoubled && betToCheck <= balance

      const advice = getOptimalPlay(activeScore, dealerUpCard, activeHand, isSplit, canSplit, canDouble)
      setSuggestion(advice)
    } else {
      setSuggestion('')
    }
  }, [playerHand, dealerHand, playerScore, splitScore, gameStarted, gameOver, currentHand, isSplit, balance, currentBet, splitBet, hasDoubled, insuranceOffered, splitHand, splitAces])

  // Music control
  const toggleMusic = () => {
    if (audioRef.current) {
      if (isMusicPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play().catch(err => console.log('Audio play failed:', err))
      }
      setIsMusicPlaying(!isMusicPlaying)
    }
  }

  // Update volume when slider changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [volume])

  const handleVolumeChange = (e) => {
    setVolume(parseFloat(e.target.value))
  }

  // Send magic code to email
  const handleSendMagicCode = async (e) => {
    e.preventDefault()
    if (email.trim() === '') {
      alert('Please enter your email, choom!')
      return
    }

    try {
      await db.auth.sendMagicCode({ email })
      setSentEmail(email)
      alert(`Magic code sent to ${email}! Check your inbox.`)
    } catch (err) {
      alert('Error: ' + err.body?.message)
    }
  }

  // Sign in with magic code
  const handleSignInWithCode = async (e) => {
    e.preventDefault()
    if (code.trim() === '') {
      alert('Please enter the code from your email!')
      return
    }

    try {
      await db.auth.signInWithMagicCode({ email: sentEmail, code })
      // User is now authenticated
    } catch (err) {
      alert('Error: ' + err.body?.message)
    }
  }

  // Sign out
  const handleSignOut = () => {
    db.auth.signOut()
    setPlayerName('')
    setPlayerId(null)
    setHasEnteredName(false)
    setBalance(1000)
    setGameStarted(false)
  }

  // Handle player name submission (after authentication)
  const handleNameSubmit = (e) => {
    e.preventDefault()
    if (playerName.trim() === '') {
      alert('Please enter your name, choom!')
      return
    }

    // Create or update player record in InstantDB
    const newPlayerId = user?.id || id()
    db.transact(
      db.tx.players[newPlayerId].update({
        name: playerName,
        email: user?.email,
        balance: 1000,
        createdAt: Date.now(),
        lastPlayed: Date.now()
      })
    )

    setPlayerId(newPlayerId)
    setHasEnteredName(true)
  }

  // Update balance in database
  const updateBalanceInDB = (newBalance) => {
    if (playerId) {
      db.transact(
        db.tx.players[playerId].update({
          balance: newBalance,
          lastPlayed: Date.now()
        })
      )
    }
  }

  // Update balance in database whenever it changes
  useEffect(() => {
    if (playerId && hasEnteredName) {
      updateBalanceInDB(balance)
    }
  }, [balance])

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

  // Check if hand is blackjack (21 with 2 cards)
  const isBlackjack = (hand) => {
    return hand.length === 2 && calculateScore(hand) === 21
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

    // Check for blackjacks
    const playerHasBlackjack = isBlackjack(playerCards)
    const dealerHasBlackjack = isBlackjack(dealerCards)
    setPlayerBlackjack(playerHasBlackjack)
    setDealerBlackjack(dealerHasBlackjack)

    // Offer insurance if dealer shows Ace
    if (dealerCards[0].value === 'A' && !playerHasBlackjack) {
      setInsuranceOffered(true)
    }

    // Handle immediate blackjack scenarios
    if (playerHasBlackjack || dealerHasBlackjack) {
      setShowDealerCard(true)
      setGameOver(true)

      if (playerHasBlackjack && dealerHasBlackjack) {
        // Push - return bet
        setBalance(balance + currentBet)
        setMessage('>> DOUBLE BLACKJACK! PUSH! <<')
      } else if (playerHasBlackjack) {
        // Player blackjack - 3:2 payout (bet + bet * 1.5)
        const winnings = currentBet + Math.floor(currentBet * 1.5)
        setBalance(balance + winnings)
        setMessage(`>> BLACKJACK! +${Math.floor(currentBet * 1.5)} CREDITS <<`)
      } else {
        // Dealer blackjack - player loses
        setMessage(`>> DEALER BLACKJACK! -${currentBet} CREDITS <<`)
      }
    }
  }

  // Take insurance
  const takeInsurance = () => {
    const insuranceAmount = Math.floor(currentBet / 2)
    if (insuranceAmount > balance) {
      alert("Not enough credits for insurance!")
      return
    }
    setInsuranceBet(insuranceAmount)
    setInsuranceTaken(true)
    setInsuranceOffered(false)
    setBalance(balance - insuranceAmount)

    // Check if dealer has blackjack
    if (dealerBlackjack) {
      setShowDealerCard(true)
      setGameOver(true)
      // Insurance pays 2:1, so player gets back 3x insurance bet
      const insurancePayout = insuranceAmount * 3
      setBalance(prev => prev + insurancePayout)
      setMessage(`>> DEALER BLACKJACK! Insurance pays +${insuranceAmount * 2} CR <<`)
    }
  }

  // Decline insurance
  const declineInsurance = () => {
    setInsuranceOffered(false)
    // If dealer has blackjack, game ends
    if (dealerBlackjack) {
      setShowDealerCard(true)
      setGameOver(true)
      setMessage(`>> DEALER BLACKJACK! -${currentBet} CREDITS <<`)
    }
  }

  // Player hits
  const hit = () => {
    const newDeck = [...deck]
    const newCard = newDeck.pop()
    const newHand = currentHand === 'main' ? [...playerHand, newCard] : [...splitHand, newCard]
    const newScore = calculateScore(newHand)

    setDeck(newDeck)

    if (currentHand === 'main') {
      setPlayerHand(newHand)
      setPlayerScore(newScore)

      if (newScore > 21) {
        if (isSplit) {
          // Move to split hand
          setCurrentHand('split')
          setMessage('>> First hand BUST! Playing split hand... <<')
        } else {
          setGameOver(true)
          setShowDealerCard(true)
          setMessage(`>> BUST! -${currentBet} CREDITS <<`)
        }
      }
    } else {
      setSplitHand(newHand)
      setSplitScore(newScore)

      if (newScore > 21) {
        setGameOver(true)
        setShowDealerCard(true)
        // Calculate total loss
        const mainBust = playerScore > 21
        const totalLoss = mainBust ? currentBet + splitBet : splitBet
        setMessage(`>> Split hand BUST! -${totalLoss} CREDITS <<`)
      }
    }
  }

  // Double down
  const doubleDown = () => {
    const betToDouble = currentHand === 'main' ? currentBet : splitBet

    if (betToDouble > balance) {
      alert("Not enough credits to double!")
      return
    }

    const doubledBet = betToDouble * 2

    setBalance(balance - betToDouble)

    if (currentHand === 'main') {
      setCurrentBet(doubledBet)
    } else {
      setSplitBet(doubledBet)
    }

    setHasDoubled(true)

    // Hit one card then auto-stand
    const newDeck = [...deck]
    const newCard = newDeck.pop()
    const activeHand = currentHand === 'main' ? playerHand : splitHand
    const newHand = [...activeHand, newCard]
    const newScore = calculateScore(newHand)

    setDeck(newDeck)

    if (currentHand === 'main') {
      setPlayerHand(newHand)
      setPlayerScore(newScore)
    } else {
      setSplitHand(newHand)
      setSplitScore(newScore)
    }

    if (newScore > 21) {
      if (isSplit && currentHand === 'main') {
        // Move to split hand
        setCurrentHand('split')
        setHasDoubled(false)
        setMessage('>> First hand BUST! Playing split hand... <<')
      } else {
        setGameOver(true)
        setShowDealerCard(true)
        if (isSplit) {
          const mainBust = currentHand === 'split' ? playerScore > 21 : true
          const totalLoss = mainBust ? currentBet + doubledBet : doubledBet
          setMessage(`>> Split hand BUST! -${totalLoss} CREDITS <<`)
        } else {
          setMessage(`>> BUST! -${doubledBet} CREDITS <<`)
        }
      }
    } else {
      // Auto stand after double
      if (isSplit && currentHand === 'main') {
        setTimeout(() => {
          setCurrentHand('split')
          setHasDoubled(false)
          setMessage('>> Playing split hand... <<')
        }, 1000)
      } else {
        setTimeout(() => stand(newScore, newDeck, newHand, doubledBet), 1000)
      }
    }
  }

  // Player stands
  const stand = (scoreOverride = null, deckOverride = null, handOverride = null, betOverride = null) => {
    if (isSplit && currentHand === 'main') {
      // Move to split hand
      setCurrentHand('split')
      setMessage('>> Playing split hand... <<')
      return
    }

    setShowDealerCard(true)
    let newDeck = deckOverride || [...deck]
    let newDealerHand = [...dealerHand]
    let newDealerScore = calculateScore(newDealerHand)

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

    // Handle split hands
    if (isSplit) {
      const finalPlayerScore = scoreOverride || playerScore
      const finalSplitScore = splitScore
      const finalBet = betOverride || currentBet
      const finalSplitBet = splitBet

      let totalWinnings = 0
      let messages = []

      // Evaluate main hand
      if (finalPlayerScore <= 21) {
        if (newDealerScore > 21) {
          totalWinnings += finalBet * 2
          messages.push(`Hand 1 wins +${finalBet}`)
        } else if (newDealerScore > finalPlayerScore) {
          messages.push(`Hand 1 loses -${finalBet}`)
        } else if (newDealerScore < finalPlayerScore) {
          totalWinnings += finalBet * 2
          messages.push(`Hand 1 wins +${finalBet}`)
        } else {
          totalWinnings += finalBet
          messages.push(`Hand 1 pushes`)
        }
      } else {
        messages.push(`Hand 1 busts -${finalBet}`)
      }

      // Evaluate split hand
      if (finalSplitScore <= 21) {
        if (newDealerScore > 21) {
          totalWinnings += finalSplitBet * 2
          messages.push(`Hand 2 wins +${finalSplitBet}`)
        } else if (newDealerScore > finalSplitScore) {
          messages.push(`Hand 2 loses -${finalSplitBet}`)
        } else if (newDealerScore < finalSplitScore) {
          totalWinnings += finalSplitBet * 2
          messages.push(`Hand 2 wins +${finalSplitBet}`)
        } else {
          totalWinnings += finalSplitBet
          messages.push(`Hand 2 pushes`)
        }
      } else {
        messages.push(`Hand 2 busts -${finalSplitBet}`)
      }

      setBalance(currentBalance + totalWinnings)
      const netProfit = totalWinnings - finalBet - finalSplitBet
      setMessage(`>> ${messages.join(' | ')} | Net: ${netProfit >= 0 ? '+' : ''}${netProfit} CR <<`)
    } else {
      // Single hand logic
      const finalPlayerScore = scoreOverride || playerScore
      const finalBet = betOverride || currentBet

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
  }

  // Split hand
  const splitHands = () => {
    if (currentBet > balance) {
      alert("Not enough credits to split!")
      return
    }

    // Split the hand
    const card1 = playerHand[0]
    const card2 = playerHand[1]
    const isAces = card1.value === 'A'

    // Deal new cards to each hand
    const newDeck = [...deck]
    const newCard1 = newDeck.pop()
    const newCard2 = newDeck.pop()

    const newMainHand = [card1, newCard1]
    const newSplitHand = [card2, newCard2]

    setPlayerHand(newMainHand)
    setSplitHand(newSplitHand)
    setPlayerScore(calculateScore(newMainHand))
    setSplitScore(calculateScore(newSplitHand))
    setDeck(newDeck)
    setIsSplit(true)
    setSplitBet(currentBet)
    setBalance(balance - currentBet)
    setSplitAces(isAces)

    if (isAces) {
      // When splitting Aces, you get one card each and must stand
      setGameOver(true)
      setShowDealerCard(true)
      setCurrentHand('split')
      // Dealer plays
      setTimeout(() => {
        let newDealerHand = [...dealerHand]
        let newDealerScore = calculateScore(newDealerHand)
        let finalDeck = [...newDeck]

        while (newDealerScore < 17) {
          const card = finalDeck.pop()
          newDealerHand.push(card)
          newDealerScore = calculateScore(newDealerHand)
        }

        setDealerHand(newDealerHand)
        setDealerScore(newDealerScore)
        setDeck(finalDeck)

        // Evaluate both hands (no blackjack bonus for split aces)
        evaluateSplitHands(calculateScore(newMainHand), calculateScore(newSplitHand), newDealerScore, currentBet, currentBet, balance)
      }, 500)
    } else {
      setCurrentHand('main')
      setMessage('>> Playing first hand... <<')
    }
  }

  // Helper to evaluate split hands at the end
  const evaluateSplitHands = (mainScore, splitScoreVal, dealerScoreVal, mainBet, splitBetVal, currentBalance) => {
    let totalWinnings = 0
    let messages = []

    // Evaluate main hand
    if (mainScore <= 21) {
      if (dealerScoreVal > 21) {
        totalWinnings += mainBet * 2
        messages.push(`Hand 1 wins +${mainBet}`)
      } else if (dealerScoreVal > mainScore) {
        messages.push(`Hand 1 loses -${mainBet}`)
      } else if (dealerScoreVal < mainScore) {
        totalWinnings += mainBet * 2
        messages.push(`Hand 1 wins +${mainBet}`)
      } else {
        totalWinnings += mainBet
        messages.push(`Hand 1 pushes`)
      }
    } else {
      messages.push(`Hand 1 busts -${mainBet}`)
    }

    // Evaluate split hand
    if (splitScoreVal <= 21) {
      if (dealerScoreVal > 21) {
        totalWinnings += splitBetVal * 2
        messages.push(`Hand 2 wins +${splitBetVal}`)
      } else if (dealerScoreVal > splitScoreVal) {
        messages.push(`Hand 2 loses -${splitBetVal}`)
      } else if (dealerScoreVal < splitScoreVal) {
        totalWinnings += splitBetVal * 2
        messages.push(`Hand 2 wins +${splitBetVal}`)
      } else {
        totalWinnings += splitBetVal
        messages.push(`Hand 2 pushes`)
      }
    } else {
      messages.push(`Hand 2 busts -${splitBetVal}`)
    }

    setBalance(currentBalance + totalWinnings)
    const netProfit = totalWinnings - mainBet - splitBetVal
    setMessage(`>> ${messages.join(' | ')} | Net: ${netProfit >= 0 ? '+' : ''}${netProfit} CR <<`)
  }

  // Helper to get card value for splitting purposes
  const getCardValue = (card) => {
    if (['J', 'Q', 'K'].includes(card.value)) return 10
    if (card.value === 'A') return 'A'
    return parseInt(card.value)
  }

  // Check if cards can be split (same rank or both 10-value)
  const canSplitCards = (card1, card2) => {
    if (card1.value === card2.value) return true
    const val1 = getCardValue(card1)
    const val2 = getCardValue(card2)
    return val1 === 10 && val2 === 10
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
    setInsuranceOffered(false)
    setInsuranceBet(0)
    setInsuranceTaken(false)
    setIsSplit(false)
    setSplitHand([])
    setSplitScore(0)
    setCurrentHand('main')
    setSplitBet(0)
    setPlayerBlackjack(false)
    setDealerBlackjack(false)
    setSplitAces(false)
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Background Music */}
      <audio
        ref={audioRef}
        loop
        src="https://cdn.pixabay.com/audio/2022/03/10/audio_4a463d02ee.mp3"
      />

      {/* Music Controls */}
      <div className="fixed top-4 left-4 z-50 bg-black/80 backdrop-blur-md border-2 border-cyan-500/50 rounded-xl p-4 shadow-[0_0_30px_rgba(0,255,255,0.3)]">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleMusic}
            className="bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-bold px-4 py-2 rounded-lg transition transform hover:scale-105 shadow-[0_0_15px_rgba(0,255,255,0.5)]"
          >
            {isMusicPlaying ? '⏸' : '▶'}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 text-xl">🔊</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              className="w-24 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <span className="text-cyan-400 text-sm font-bold w-8">{Math.round(volume * 100)}</span>
          </div>
        </div>
      </div>

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
        {isLoading ? (
          // Loading state
          <div className="text-center">
            <p className="text-cyan-400 text-3xl font-bold animate-pulse">◈ LOADING... ◈</p>
          </div>
        ) : !user ? (
          // Authentication Screen
          <div className="bg-black/80 backdrop-blur-xl rounded-2xl shadow-[0_0_50px_rgba(0,255,255,0.3)] p-12 border-2 border-cyan-500/50 max-w-2xl mx-auto">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(0,255,255,0.5)] text-center mb-8">
              ◢ BLACKJACK 2077 ◣
            </h1>
            <div className="text-center mb-8">
              <p className="text-cyan-300 text-2xl font-semibold mb-4">
                &gt;&gt; WELCOME TO THE TABLE, CHOOM &lt;&lt;
              </p>
              <p className="text-purple-300 text-lg mb-2">
                Secure your session with email authentication
              </p>
            </div>

            {!sentEmail ? (
              // Step 1: Email input
              <form onSubmit={handleSendMagicCode} className="space-y-6">
                <div>
                  <label className="block text-cyan-400 text-sm font-bold mb-2">
                    EMAIL ADDRESS
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@corp.net"
                    className="w-full bg-black/60 border-2 border-cyan-400 rounded-xl px-6 py-4 text-2xl text-cyan-300 placeholder-cyan-600/50 focus:outline-none focus:border-purple-400 focus:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-bold text-2xl py-6 px-12 rounded-xl transition transform hover:scale-105 shadow-[0_0_30px_rgba(0,255,255,0.5)] hover:shadow-[0_0_40px_rgba(0,255,255,0.8)]"
                >
                  ▶ SEND CODE ◀
                </button>
              </form>
            ) : (
              // Step 2: Code verification
              <form onSubmit={handleSignInWithCode} className="space-y-6">
                <div>
                  <label className="block text-cyan-400 text-sm font-bold mb-2">
                    VERIFICATION CODE
                  </label>
                  <p className="text-purple-300 text-sm mb-3">
                    Code sent to: {sentEmail}
                  </p>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    className="w-full bg-black/60 border-2 border-cyan-400 rounded-xl px-6 py-4 text-2xl text-cyan-300 placeholder-cyan-600/50 focus:outline-none focus:border-purple-400 focus:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-bold text-2xl py-6 px-12 rounded-xl transition transform hover:scale-105 shadow-[0_0_30px_rgba(0,255,255,0.5)] hover:shadow-[0_0_40px_rgba(0,255,255,0.8)]"
                >
                  ▶ VERIFY & JACK IN ◀
                </button>
                <button
                  type="button"
                  onClick={() => setSentEmail('')}
                  className="w-full bg-gradient-to-r from-gray-600 to-gray-500 hover:from-gray-500 hover:to-gray-400 text-white font-bold text-lg py-3 px-6 rounded-xl transition"
                >
                  ← Back
                </button>
              </form>
            )}
          </div>
        ) : !hasEnteredName ? (
          // Player Name Input Screen (after authentication)
          <div className="bg-black/80 backdrop-blur-xl rounded-2xl shadow-[0_0_50px_rgba(0,255,255,0.3)] p-12 border-2 border-cyan-500/50 max-w-2xl mx-auto">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(0,255,255,0.5)] text-center mb-8">
              ◢ BLACKJACK 2077 ◣
            </h1>
            <div className="text-center mb-8">
              <p className="text-cyan-300 text-2xl font-semibold mb-4">
                &gt;&gt; IDENTITY CONFIRMED &lt;&lt;
              </p>
              <p className="text-purple-300 text-lg mb-2">
                Welcome, {user.email}
              </p>
              <p className="text-purple-300 text-lg">
                Enter your handle to begin your session
              </p>
            </div>
            <form onSubmit={handleNameSubmit} className="space-y-6">
              <div>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name..."
                  className="w-full bg-black/60 border-2 border-cyan-400 rounded-xl px-6 py-4 text-2xl text-cyan-300 placeholder-cyan-600/50 focus:outline-none focus:border-purple-400 focus:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-bold text-2xl py-6 px-12 rounded-xl transition transform hover:scale-105 shadow-[0_0_30px_rgba(0,255,255,0.5)] hover:shadow-[0_0_40px_rgba(0,255,255,0.8)]"
              >
                ▶ START SESSION ◀
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* Title and Balance */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-6xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(0,255,255,0.5)]">
                  ◢ BLACKJACK 2077 ◣
                </h1>
                <div className="flex items-center gap-4 mt-2">
                  <p className="text-cyan-400 text-xl font-semibold">
                    ◈ Player: {playerName} ◈
                  </p>
                  <button
                    onClick={handleSignOut}
                    className="bg-gradient-to-r from-red-600/20 to-pink-600/20 hover:from-red-600/40 hover:to-pink-600/40 border border-red-400 text-red-400 font-bold px-4 py-1 rounded-lg transition text-sm"
                  >
                    ✕ Sign Out
                  </button>
                </div>
              </div>
              <div className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border-2 border-cyan-400 px-6 py-3 rounded-lg font-bold text-3xl text-cyan-400 shadow-[0_0_20px_rgba(0,255,255,0.3)] backdrop-blur-sm">
                ◈ {balance} CR
              </div>
            </div>
          </>
        )}

        {hasEnteredName && (
          <>
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
                  ◈ BET: {currentBet} CR {isSplit && `+ ${splitBet} CR`} ◈
                </span>
              </div>

              {/* Insurance Offer */}
              {insuranceOffered && (
                <div className="mb-6 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-2 border-yellow-400 rounded-xl p-6 backdrop-blur-sm shadow-[0_0_20px_rgba(234,179,8,0.3)]">
                  <div className="text-center">
                    <p className="text-yellow-400 font-bold text-2xl mb-4">⚠ INSURANCE AVAILABLE ⚠</p>
                    <p className="text-yellow-300 text-lg mb-4">Dealer shows an Ace! Insure for {Math.floor(currentBet / 2)} CR?</p>
                    <div className="flex gap-4 justify-center">
                      <button
                        onClick={takeInsurance}
                        className="bg-gradient-to-r from-green-600 to-emerald-400 hover:from-green-500 hover:to-emerald-300 text-black font-bold text-lg py-3 px-8 rounded-lg transition transform hover:scale-105 shadow-[0_0_15px_rgba(34,197,94,0.5)]"
                      >
                        ✓ TAKE INSURANCE
                      </button>
                      <button
                        onClick={declineInsurance}
                        className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-bold text-lg py-3 px-8 rounded-lg transition shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                      >
                        ✕ NO INSURANCE
                      </button>
                    </div>
                  </div>
                </div>
              )}

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
                {isSplit ? (
                  <div className="grid grid-cols-2 gap-8">
                    {/* Main Hand */}
                    <div>
                      <h2 className={`text-2xl font-bold mb-4 drop-shadow-[0_0_10px_rgba(168,85,247,0.8)] ${currentHand === 'main' ? 'text-purple-400' : 'text-purple-400/50'}`}>
                        &gt;&gt; HAND 1 [{playerScore}] &lt;&lt;
                      </h2>
                      <div className="flex gap-4 justify-center">
                        {playerHand.map((card, index) => (
                          <div
                            key={index}
                            className={`w-24 h-36 rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.3)] flex flex-col items-center justify-center text-4xl font-bold border-2 ${
                              card.suit === '♥' || card.suit === '♦'
                                ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-pink-500 text-pink-400'
                                : 'bg-gradient-to-br from-gray-900 to-gray-800 border-cyan-500 text-cyan-400'
                            } ${currentHand === 'main' ? '' : 'opacity-50'}`}
                          >
                            <div className="drop-shadow-[0_0_5px_rgba(168,85,247,0.8)]">{card.value}</div>
                            <div className="drop-shadow-[0_0_5px_rgba(168,85,247,0.8)]">{card.suit}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Split Hand */}
                    <div>
                      <h2 className={`text-2xl font-bold mb-4 drop-shadow-[0_0_10px_rgba(168,85,247,0.8)] ${currentHand === 'split' ? 'text-purple-400' : 'text-purple-400/50'}`}>
                        &gt;&gt; HAND 2 [{splitScore}] &lt;&lt;
                      </h2>
                      <div className="flex gap-4 justify-center">
                        {splitHand.map((card, index) => (
                          <div
                            key={index}
                            className={`w-24 h-36 rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.3)] flex flex-col items-center justify-center text-4xl font-bold border-2 ${
                              card.suit === '♥' || card.suit === '♦'
                                ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-pink-500 text-pink-400'
                                : 'bg-gradient-to-br from-gray-900 to-gray-800 border-cyan-500 text-cyan-400'
                            } ${currentHand === 'split' ? '' : 'opacity-50'}`}
                          >
                            <div className="drop-shadow-[0_0_5px_rgba(168,85,247,0.8)]">{card.value}</div>
                            <div className="drop-shadow-[0_0_5px_rgba(168,85,247,0.8)]">{card.suit}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 className="text-3xl font-bold text-purple-400 mb-4 drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]">
                      &gt;&gt; YOU [{playerScore}] {playerBlackjack && '🎰 BLACKJACK!'} &lt;&lt;
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
                  </>
                )}
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
                {!gameOver && !insuranceOffered ? (
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
                    {((currentHand === 'main' && playerHand.length === 2) || (currentHand === 'split' && splitHand.length === 2)) && !hasDoubled && !splitAces && (
                      <button
                        onClick={doubleDown}
                        disabled={(currentHand === 'main' ? currentBet : splitBet) > balance}
                        className="bg-gradient-to-r from-yellow-600 to-orange-500 hover:from-yellow-500 hover:to-orange-400 disabled:from-gray-700 disabled:to-gray-600 text-black font-bold text-xl py-4 px-10 rounded-xl transition transform hover:scale-105 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(234,179,8,0.5)] hover:shadow-[0_0_25px_rgba(234,179,8,0.8)]"
                      >
                        ◆ DOUBLE
                      </button>
                    )}
                    {playerHand.length === 2 && !isSplit && canSplitCards(playerHand[0], playerHand[1]) && (
                      <button
                        onClick={splitHands}
                        disabled={currentBet > balance}
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-gray-700 disabled:to-gray-600 text-white font-bold text-xl py-4 px-10 rounded-xl transition transform hover:scale-105 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(168,85,247,0.5)] hover:shadow-[0_0_25px_rgba(168,85,247,0.8)]"
                      >
                        ◈ SPLIT
                      </button>
                    )}
                  </>
                ) : gameOver ? (
                  <button
                    onClick={newRound}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xl py-4 px-12 rounded-xl transition transform hover:scale-105 shadow-[0_0_20px_rgba(168,85,247,0.5)] hover:shadow-[0_0_30px_rgba(168,85,247,0.8)]"
                  >
                    ▶ NEW ROUND ◀
                  </button>
                ) : null}
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
          </>
        )}
      </div>
    </div>
  )
}
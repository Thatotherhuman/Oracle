(function () {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.continuous = false;
  recognition.interimResults = false;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'voice-command-btn';
  button.setAttribute('aria-label', 'Start voice commands');
  button.innerHTML = '🎤';

  const status = document.createElement('div');
  status.className = 'voice-command-status';
  status.textContent = 'Tap the mic to speak';

  const wrapper = document.createElement('div');
  wrapper.className = 'voice-command-ui';
  wrapper.appendChild(button);
  wrapper.appendChild(status);
  document.body.appendChild(wrapper);

  const demoPanel = document.createElement('div');
  demoPanel.className = 'demo-nav-panel';

  const demoToggle = document.createElement('button');
  demoToggle.type = 'button';
  demoToggle.className = 'demo-nav-toggle';
  demoToggle.textContent = '☰ Demo';

  const demoList = document.createElement('div');
  demoList.className = 'demo-nav-list';

  const demoActions = [
    { label: 'Home', href: '/' },
    { label: 'Portfolio', href: '/portfolio' },
    { label: 'Solaris', href: '/solaris' },
    { label: 'Profile', href: '/profile' },
    { label: 'EKYC', href: '/ekyc' }
  ];

  demoActions.forEach((action) => {
    const link = document.createElement('a');
    link.className = 'demo-nav-btn';
    link.href = action.href;
    link.textContent = action.label;
    demoList.appendChild(link);
  });

  demoToggle.addEventListener('click', () => {
    demoPanel.classList.toggle('open');
  });

  demoPanel.appendChild(demoToggle);
  demoPanel.appendChild(demoList);
  document.body.appendChild(demoPanel);

  const protectedRoutes = ['/portfolio', '/solaris', '/solaris/buy', '/solaris/sell', '/profile'];

  function isEkycComplete() {
    try {
      return window.localStorage.getItem('ekycComplete') === 'true';
    } catch (error) {
      return false;
    }
  }

  if (!isEkycComplete() && (window.location.pathname === '/' || protectedRoutes.includes(window.location.pathname))) {
    if (!window.location.pathname.includes('/ekyc')) {
      window.location.replace('/ekyc');
    }
  }

  const routes = {
    'start ekyc': '/ekyc',
    'begin ekyc': '/ekyc',
    'open portfolio': '/portfolio',
    'portfolio': '/portfolio',
    'open solaris': '/solaris',
    'solaris': '/solaris',
    'sell': '/solaris/sell',
    'buy': '/solaris/buy',
    'invest': '/solaris/buy',
    'open profile': '/profile',
    'edit profile': '/profile',
    'profile': '/profile',
    'ekyc': '/ekyc',
    'go home': '/',
    'home': '/',
    'back': null,
    'start': '/portfolio'
  };

  let pendingAmount = null;
  let pendingTradeType = null;

  function setStatus(message) {
    status.textContent = message;
  }

  function speak(text) {
    if (!('speechSynthesis' in window)) {
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  }

  function showMessage(text) {
    const overlay = document.getElementById('messageOverlay');
    if (!overlay) {
      return;
    }

    const messageCard = overlay.querySelector('.message-card');
    if (messageCard) {
      messageCard.textContent = text;
    } else {
      overlay.textContent = text;
    }

    overlay.classList.remove('hidden');
    clearTimeout(window.messageTimer);
    window.messageTimer = setTimeout(() => overlay.classList.add('hidden'), 4000);
  }

  function navigateTo(route) {
    if (!route) {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.assign('/');
      }
      return;
    }

    window.location.assign(route);
  }

  function triggerAction(action) {
    const target = document.querySelector(`[data-voice-action="${action}"]`);
    if (target) {
      target.click();
      return true;
    }

    const buttonLike = Array.from(document.querySelectorAll('button, a')).find((element) => {
      const text = (element.textContent || '').toLowerCase().trim();
      return text.includes(action.replace(/-/g, ' '));
    });

    if (buttonLike) {
      buttonLike.click();
      return true;
    }

    return false;
  }

  // --- Amount parsing -------------------------------------------------

  // Known presets first, including colloquial forms ("eight fifty" = 850)
  // that a generic word-parser would misread (8 + 50 = 58).
  function parsePresetAmount(transcript) {
    const normalized = transcript.toLowerCase().replace(/,/g, ' ').replace(/-/g, ' ');

    if (/\b400\b/.test(normalized) || /four hundred/.test(normalized)) {
      return 400;
    }

    if (/\b850\b/.test(normalized) || /eight hundred fifty/.test(normalized) || /eight fifty/.test(normalized)) {
      return 850;
    }

    if (/\b1500\b/.test(normalized) || /fifteen hundred/.test(normalized)) {
      return 1500;
    }

    if (/\b10000\b/.test(normalized) || /ten thousand/.test(normalized)) {
      return 10000;
    }

    return null;
  }

  // Converts spoken number words (e.g. "two thousand five hundred",
  // "twenty five hundred") into an integer. Handles ones/teens/tens/
  // hundred/thousand combinations. Returns null if nothing recognizable.
  function wordsToNumber(text) {
    const ones = {
      zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
      eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
      fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19
    };
    const tens = {
      twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90
    };

    const tokens = text.split(/\s+/).filter(Boolean);
    let total = 0;
    let current = 0;
    let matched = false;

    tokens.forEach((token) => {
      const clean = token.replace(/,/g, '');

      if (Object.prototype.hasOwnProperty.call(ones, clean)) {
        current += ones[clean];
        matched = true;
      } else if (Object.prototype.hasOwnProperty.call(tens, clean)) {
        current += tens[clean];
        matched = true;
      } else if (clean === 'hundred') {
        current = (current || 1) * 100;
        matched = true;
      } else if (clean === 'thousand') {
        current = (current || 1) * 1000;
        total += current;
        current = 0;
        matched = true;
      } else if (/^\d+(\.\d+)?$/.test(clean)) {
        current += parseFloat(clean);
        matched = true;
      }
      // ignore filler words like "and", "dollars"
    });

    total += current;
    return matched ? total : null;
  }

  // Digits typed/spoken as numerals, e.g. "2500" or "2,500 dollars"
  function parseDigitAmount(transcript) {
    const normalized = transcript.toLowerCase().replace(/\$/g, '');
    const digitMatch = normalized.match(/\d[\d,]*(\.\d+)?/);
    if (digitMatch) {
      const value = parseFloat(digitMatch[0].replace(/,/g, ''));
      if (!isNaN(value) && value > 0) {
        return value;
      }
    }
    return null;
  }

  // Full pipeline: known presets -> digits -> spoken words
  function parseAmount(transcript) {
    return (
      parsePresetAmount(transcript) ||
      parseDigitAmount(transcript) ||
      wordsToNumber(transcript.toLowerCase().replace(/,/g, ' ').replace(/-/g, ' '))
    );
  }

  // --- Trade flow -------------------------------------------------------

  function handleTradeSpeech(transcript) {
    const amount = parseAmount(transcript);
    const confirmed = /confirm/.test(transcript);

    if (amount) {
      pendingAmount = amount;
      pendingTradeType = window.location.pathname.includes('/buy') ? 'buy' : 'sell';
      const confirmationMessage = `You selected ${amount.toLocaleString()}. Say confirm to proceed.`;
      showMessage(confirmationMessage);
      speak(confirmationMessage);
      setStatus(`Selected ${amount.toLocaleString()}`);
      return true;
    }

    if (confirmed && pendingAmount) {
      submitPendingTrade();
      return true;
    }

    return false;
  }

  // Hands the confirmed amount off to the page's own click handlers
  // (preset chip or custom-amount confirm button) so risk checks and
  // redirect logic stay in one place instead of being duplicated here.
  function submitPendingTrade() {
    const matchingChip = document.querySelector(`.amount-chip[data-amount="${pendingAmount}"]`);

    if (matchingChip) {
      matchingChip.click();
      pendingAmount = null;
      pendingTradeType = null;
      return;
    }

    const customInput = document.getElementById('customAmount');
    const confirmButton = document.getElementById('confirmCustomAmount');

    if (customInput && confirmButton) {
      customInput.value = pendingAmount;
      confirmButton.click();
      pendingAmount = null;
      pendingTradeType = null;
      return;
    }

    // Fallback for pages without preset chips or a custom-amount field
    const actionText = pendingTradeType === 'buy' ? 'buy' : 'sell';
    const confirmationMessage = `Confirmed ${actionText} order for ${pendingAmount.toLocaleString()}.`;
    showMessage(confirmationMessage);
    speak(confirmationMessage);
    setStatus('Trade confirmed');
    pendingAmount = null;
    pendingTradeType = null;
  }

  button.addEventListener('click', () => {
    button.classList.add('listening');
    setStatus('Listening...');
    recognition.start();
  });

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript.toLowerCase().trim();
    setStatus(`Heard: ${transcript}`);

    if (window.location.pathname.includes('/solaris')) {
      if (handleTradeSpeech(transcript)) {
        return;
      }
    }

    if (/(give me a summary|summary on the portfolio|portfolio summary)/.test(transcript)) {
      if (triggerAction('portfolio-summary')) {
        const summary = 'Your portfolio has increased by $400 since your last review. Solaris remains the weakest position.';
        showMessage(summary);
        speak(summary);
        return;
      }
    }

    if (/(recommendations to invest today|recommendation|recommend)/.test(transcript)) {
      if (triggerAction('portfolio-recommendation')) {
        const recommendation = 'Based on current market conditions, it would be prudent to reduce exposure to Solaris and consider rebalancing toward more stable holdings.';
        showMessage(recommendation);
        speak(recommendation);
        return;
      }
    }

    if (/(start ekyc|begin ekyc|continue ekyc)/.test(transcript)) {
      if (triggerAction('start-ekyc')) {
        return;
      }
    }

    if (/(confirm details|confirm)/.test(transcript)) {
      if (triggerAction('confirm-details')) {
        return;
      }
    }

    if (/(face scan|scan face|start face|start scan)/.test(transcript)) {
      if (triggerAction('start-face-scan')) {
        return;
      }
    }

    if (/(upload|alexid|id)/.test(transcript)) {
      if (triggerAction('upload-id')) {
        return;
      }
    }

    if (/(submit|submit verification|complete)/.test(transcript)) {
      if (triggerAction('submit-verification')) {
        return;
      }
    }

    if (/(open portfolio|portfolio)/.test(transcript)) {
      if (triggerAction('open-portfolio')) {
        return;
      }
    }

    if (/(repeat|instructions)/.test(transcript)) {
      const helpText = 'You can say start, open portfolio, open solaris, sell, buy, open profile, start ekyc, or home.';
      setStatus(helpText);
      speak(helpText);
      return;
    }

    const match = Object.entries(routes).find(([phrase]) => transcript.includes(phrase));

    if (match) {
      navigateTo(match[1]);
    } else {
      const fallback = 'I did not catch that. Try saying start, portfolio, solaris, sell, buy, profile, ekyc, or home.';
      setStatus(fallback);
      speak(fallback);
    }
  };

  recognition.onerror = () => {
    button.classList.remove('listening');
    setStatus('Voice input unavailable. Please allow microphone access.');
  };

  recognition.onend = () => {
    button.classList.remove('listening');
  };
})();
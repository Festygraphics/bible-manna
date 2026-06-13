// ════════════════════════════════════════════
// BIBLE MANNA - AI CHAT WITH GEMINI
// ════════════════════════════════════════════

const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY_HERE'; // Replace with your actual key
const GEMINI_MODEL = 'gemini-1.5-flash';

let chatHistory = [];
let freeQuestionsRemaining = 5;
let isPremium = false;

// Initialize chat history
function initChat() {
  console.log('✅ Chat initialized - Gemini AI ready');
  loadFreeQuestionCount();
  loadPremiumStatus();
}

// Send message to Gemini API
async function sendMessage() {
  const input = document.getElementById('chat-input');
  const message = input.value.trim();
  
  if (!message) return;
  
  // Check if user has questions remaining
  if (!isPremium && freeQuestionsRemaining <= 0) {
    addMessage('bot', '❌ You\'ve used all your free questions today. Upgrade to Premium for unlimited access!');
    return;
  }
  
  // Add user message to UI
  addMessage('user', message);
  chatHistory.push({ role: 'user', parts: [{ text: message }] });
  
  // Clear input
  input.value = '';
  input.style.height = 'auto';
  
  // Show typing indicator
  const typingDiv = document.createElement('div');
  typingDiv.className = 'typing-wrap';
  typingDiv.id = 'typing-indicator';
  typingDiv.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
  document.getElementById('chat-messages').appendChild(typingDiv);
  document.getElementById('chat-messages').scrollTop = document.getElementById('chat-messages').scrollHeight;
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        system_instruction: {
          parts: {
            text: `You are Bible Manna, a compassionate and wise Bible assistant. Your purpose is to help people understand Scripture, find answers to their spiritual questions, and deepen their faith.

Guidelines:
- Answer questions about the Bible with accuracy and depth
- Reference specific verses when relevant (e.g., "John 3:16")
- Be compassionate, encouraging, and pastoral
- If you don't know something, admit it honestly
- Keep responses concise but meaningful (150-300 words max)
- Help people apply Scripture to their lives
- Use simple, understandable language`
          }
        },
        contents: chatHistory,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 500,
        }
      })
    });
    
    // Remove typing indicator
    const typing = document.getElementById('typing-indicator');
    if (typing) typing.remove();
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `API Error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0]) {
      throw new Error('No response from API');
    }
    
    const aiResponse = data.candidates[0].content.parts[0].text;
    
    // Add AI response to history and UI
    chatHistory.push({ role: 'model', parts: [{ text: aiResponse }] });
    addMessage('bot', aiResponse);
    
    // Decrement free question counter
    if (!isPremium) {
      freeQuestionsRemaining--;
      updateFreeCount();
      saveFreeQuestionCount();
    }
    
  } catch (error) {
    const typing = document.getElementById('typing-indicator');
    if (typing) typing.remove();
    console.error('Gemini Error:', error);
    addMessage('bot', `❌ Error: ${error.message}. Please check your API key and try again.`);
  }
}

// Add message to chat UI
function addMessage(type, text) {
  const messagesDiv = document.getElementById('chat-messages');
  const msgDiv = document.createElement('div');
  msgDiv.className = `msg ${type}`;
  msgDiv.innerHTML = `
    <div class="msg-name">${type === 'user' ? 'You' : 'Bible Manna AI'}</div>
    <div class="bubble">${escapeHtml(text)}</div>
  `;
  messagesDiv.appendChild(msgDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Handle enter key to send message
function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

// Auto-resize textarea
function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 100) + 'px';
}

// Use suggested chip
function useChip(el) {
  const text = el.textContent;
  document.getElementById('chat-input').value = text;
  autoResize(document.getElementById('chat-input'));
  sendMessage();
}

// Update free count display
function updateFreeCount() {
  const freeCountEl = document.getElementById('free-count');
  freeCountEl.textContent = freeQuestionsRemaining;
  
  if (freeQuestionsRemaining === 0) {
    freeCountEl.parentElement.innerHTML = 'Free today: <span id="free-count">0</span>/5 — <span style="color:var(--gold);cursor:pointer;" onclick="goTo(\'premium\')">Upgrade ✦</span>';
  }
}

// Save free question count to localStorage
function saveFreeQuestionCount() {
  const today = new Date().toDateString();
  localStorage.setItem('biblemanna_free_questions_date', today);
  localStorage.setItem('biblemanna_free_questions_remaining', freeQuestionsRemaining);
}

// Load free question count from localStorage
function loadFreeQuestionCount() {
  const today = new Date().toDateString();
  const savedDate = localStorage.getItem('biblemanna_free_questions_date');
  
  if (savedDate === today) {
    const saved = localStorage.getItem('biblemanna_free_questions_remaining');
    if (saved !== null) {
      freeQuestionsRemaining = parseInt(saved);
    }
  } else {
    // Reset for new day
    freeQuestionsRemaining = 5;
    saveFreeQuestionCount();
  }
  
  updateFreeCount();
}

// Load premium status
function loadPremiumStatus() {
  isPremium = localStorage.getItem('biblemanna_is_premium') === 'true';
  if (isPremium) {
    console.log('👑 Premium user detected');
  }
}

// Set premium status
function setPremiumStatus(status) {
  isPremium = status;
  localStorage.setItem('biblemanna_is_premium', status);
  if (status) {
    freeQuestionsRemaining = 999999; // Unlimited
    updateFreeCount();
  }
}

// Initialize on page load
window.addEventListener('load', initChat);

// ════════════════════════════════════════════
// NAVIGATION & UI FUNCTIONS
// ════════════════════════════════════════════

function goTo(screen) {
  // Hide all screens
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
  });
  
  // Show target screen
  const target = document.getElementById(`screen-${screen}`);
  if (target) {
    target.classList.add('active');
  }
  
  // Update navbar active state
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  event.target.closest('.nav-item')?.classList.add('active');
}

function goBack() {
  goTo('home');
}

function completeOnboarding() {
  localStorage.setItem('biblemanna_onboarded', 'true');
  goTo('home');
}

// Prayer Journal Functions
function savePrayer() {
  const textarea = document.getElementById('prayer-input');
  const prayer = textarea.value.trim();
  
  if (!prayer) {
    alert('Please write a prayer first');
    return;
  }
  
  // Get existing prayers
  const prayers = JSON.parse(localStorage.getItem('biblemanna_prayers') || '[]');
  
  // Add new prayer
  prayers.unshift({
    text: prayer,
    date: new Date().toLocaleString(),
    id: Date.now()
  });
  
  // Save to localStorage
  localStorage.setItem('biblemanna_prayers', JSON.stringify(prayers));
  
  // Clear textarea
  textarea.value = '';
  
  // Refresh prayer list
  loadPrayers();
  
  // Show toast
  showToast('Prayer saved! 🙏');
}

function loadPrayers() {
  const prayers = JSON.parse(localStorage.getItem('biblemanna_prayers') || '[]');
  const list = document.getElementById('prayers-list');
  
  if (prayers.length === 0) {
    list.innerHTML = `
      <div class="empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22s-8-5-8-12a8 8 0 0116 0c0 7-8 12-8 12z"/></svg>
        <div class="empty-txt">Your prayer journal is empty.<br/>Write your first prayer above.</div>
      </div>
    `;
    return;
  }
  
  list.innerHTML = prayers.map(prayer => `
    <div class="prayer-item">
      <div class="prayer-text">${escapeHtml(prayer.text)}</div>
      <div class="prayer-date">${prayer.date}</div>
      <div class="prayer-acts">
        <button class="pbtn ok" onclick="answerPrayer(${prayer.id})">✓ Answered</button>
        <button class="pbtn del" onclick="deletePrayer(${prayer.id})">✕ Delete</button>
      </div>
    </div>
  `).join('');
}

function deletePrayer(id) {
  const prayers = JSON.parse(localStorage.getItem('biblemanna_prayers') || '[]');
  const filtered = prayers.filter(p => p.id !== id);
  localStorage.setItem('biblemanna_prayers', JSON.stringify(filtered));
  loadPrayers();
  showToast('Prayer deleted');
}

function answerPrayer(id) {
  showToast('Thank God for answered prayer! 🙌');
  deletePrayer(id);
}

// Utility Functions
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast show';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

function shareVerse() {
  const verse = document.getElementById('dv-text').textContent;
  const ref = document.getElementById('dv-ref').textContent;
  
  if (navigator.share) {
    navigator.share({
      title: 'Bible Manna - Daily Verse',
      text: `${verse}\n\n— ${ref}`,
      url: window.location.href
    });
  } else {
    showToast('Verse copied! Share it with others 📖');
  }
}

function openVerseModal() {
  const overlay = document.querySelector('.modal-overlay');
  if (overlay) overlay.classList.add('open');
}

function askAboutVerse() {
  const verse = document.getElementById('dv-text').textContent;
  const ref = document.getElementById('dv-ref').textContent;
  
  document.getElementById('chat-input').value = `Explain ${ref}: ${verse}`;
  goTo('ask');
  sendMessage();
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  loadPrayers();
  
  // Check if user has already onboarded
  if (localStorage.getItem('biblemanna_onboarded')) {
    document.getElementById('screen-onboard').classList.remove('active');
    document.getElementById('screen-home').classList.add('active');
  }
});

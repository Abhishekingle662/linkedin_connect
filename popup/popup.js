// Message Library Manager
let editingMessageId = null;

// DOM Elements
const messageName = document.getElementById('messageName');
const messageText = document.getElementById('messageText');
const addMessageBtn = document.getElementById('addMessageBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const messagesList = document.getElementById('messagesList');
const emptyState = document.getElementById('emptyState');
const charCount = document.getElementById('charCount');

// Tab elements
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadMessages();
  setupEventListeners();
  setupTabNavigation();
  initializeLeads(); // Initialize CRM leads
});

// Setup tab navigation
function setupTabNavigation() {
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-tab');
      
      // Remove active class from all tabs and contents
      tabBtns.forEach((b) => b.classList.remove('active'));
      tabContents.forEach((content) => content.classList.remove('active'));
      
      // Add active class to clicked tab and corresponding content
      btn.classList.add('active');
      document.getElementById(tabName).classList.add('active');
    });
  });
}

// Setup event listeners
function setupEventListeners() {
  addMessageBtn.addEventListener('click', handleAddOrUpdateMessage);
  cancelEditBtn.addEventListener('click', cancelEdit);
  messageText.addEventListener('input', updateCharCount);

  // Allow Enter to submit when in name field
  messageName.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      messageText.focus();
    }
  });
}

// Update character count
function updateCharCount() {
  const count = messageText.value.length;
  charCount.textContent = `${count} / 300 characters`;

  if (count > 300) {
    charCount.style.color = '#d32f2f';
  } else if (count > 250) {
    charCount.style.color = '#ff9800';
  } else {
    charCount.style.color = '#666';
  }
}

// Load messages from storage
async function loadMessages() {
  try {
    const result = await chrome.storage.sync.get(['messages']);
    const messages = result.messages || [];

    if (messages.length === 0) {
      emptyState.style.display = 'block';
      messagesList.style.display = 'none';
    } else {
      emptyState.style.display = 'none';
      messagesList.style.display = 'flex';
      renderMessages(messages);
    }
  } catch (error) {
    console.error('Error loading messages:', error);
    showNotification('Error loading messages', 'error');
  }
}

// Render messages in the list
function renderMessages(messages) {
  messagesList.innerHTML = '';

  messages.forEach((msg) => {
    const messageItem = createMessageElement(msg);
    messagesList.appendChild(messageItem);
  });
}

// Create a message element
function createMessageElement(msg) {
  const div = document.createElement('div');
  div.className = 'message-item';
  div.dataset.id = msg.id;

  div.innerHTML = `
    <div class="message-header">
      <div class="message-name">${escapeHtml(msg.name)}</div>
      <div class="message-actions">
        <button class="action-btn edit-btn" data-id="${msg.id}">Edit</button>
        <button class="action-btn delete-btn" data-id="${msg.id}">Delete</button>
      </div>
    </div>
    <div class="message-content">${escapeHtml(msg.text)}</div>
  `;

  // Add event listeners
  div.querySelector('.edit-btn').addEventListener('click', () => editMessage(msg.id));
  div.querySelector('.delete-btn').addEventListener('click', () => deleteMessage(msg.id));

  return div;
}

// Handle add or update message
async function handleAddOrUpdateMessage() {
  const name = messageName.value.trim();
  const text = messageText.value.trim();

  if (!name || !text) {
    showNotification('Please fill in both name and message', 'error');
    return;
  }

  if (text.length > 300) {
    showNotification('Message is too long (max 300 characters)', 'error');
    return;
  }

  try {
    const result = await chrome.storage.sync.get(['messages']);
    let messages = result.messages || [];

    if (editingMessageId) {
      // Update existing message
      messages = messages.map(msg =>
        msg.id === editingMessageId
          ? { ...msg, name, text, updatedAt: Date.now() }
          : msg
      );
      showNotification('Message updated successfully', 'success');
    } else {
      // Add new message
      const newMessage = {
        id: generateId(),
        name,
        text,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      messages.push(newMessage);
      showNotification('Message added successfully', 'success');
    }

    await chrome.storage.sync.set({ messages });
    clearForm();
    loadMessages();
  } catch (error) {
    console.error('Error saving message:', error);
    showNotification('Error saving message', 'error');
  }
}

// Edit message
async function editMessage(id) {
  try {
    const result = await chrome.storage.sync.get(['messages']);
    const messages = result.messages || [];
    const message = messages.find(msg => msg.id === id);

    if (message) {
      editingMessageId = id;
      messageName.value = message.name;
      messageText.value = message.text;
      updateCharCount();

      addMessageBtn.textContent = 'Update Message';
      cancelEditBtn.style.display = 'block';

      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
      messageName.focus();
    }
  } catch (error) {
    console.error('Error editing message:', error);
    showNotification('Error loading message', 'error');
  }
}

// Delete message
async function deleteMessage(id) {
  if (!confirm('Are you sure you want to delete this message?')) {
    return;
  }

  try {
    const result = await chrome.storage.sync.get(['messages']);
    let messages = result.messages || [];

    messages = messages.filter(msg => msg.id !== id);

    await chrome.storage.sync.set({ messages });
    showNotification('Message deleted successfully', 'success');
    loadMessages();
  } catch (error) {
    console.error('Error deleting message:', error);
    showNotification('Error deleting message', 'error');
  }
}

// Cancel edit
function cancelEdit() {
  clearForm();
}

// Clear form
function clearForm() {
  editingMessageId = null;
  messageName.value = '';
  messageText.value = '';
  updateCharCount();
  addMessageBtn.textContent = 'Add Message';
  cancelEditBtn.style.display = 'none';
}

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Show notification (simple version)
function showNotification(message, type) {
  // For now, just log to console
  // In future, could add a toast notification UI
  console.log(`[${type.toUpperCase()}] ${message}`);
}

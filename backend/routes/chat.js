// routes/chats.js
const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const User = require('../models/User');
const fetch = require('node-fetch'); // npm i node-fetch@2
const { authenticateToken } = require('../middleware/auth');

// Use env variable for AI server (the one you used earlier: 192.168.235.90:8000)
const AI_SERVER = process.env.AI_SERVER || 'http://192.168.100.50:8000';
const AI_ENDPOINT = process.env.AI_ENDPOINT || `${AI_SERVER}/chat`; // backend AI endpoint

// Create a new chat for current user
// POST /api/chats
router.post('/', authenticateToken, async (req, res) => {
  try {
    const chat = new Chat({ user: req.userId, title: req.body.title || 'New chat', messages: [] });
    await chat.save();
    return res.status(201).json({ chat });
  } catch (err) {
    console.error('Create chat error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// List chats for current user (simple)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const chats = await Chat.find({ user: req.userId }).sort({ updatedAt: -1 }).select('-__v').lean();
    return res.json({ chats });
  } catch (err) {
    console.error('List chats error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Get a single chat (messages)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id).lean();
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    if (chat.user.toString() !== req.userId.toString()) return res.status(403).json({ message: 'Forbidden' });
    return res.json({ chat });
  } catch (err) {
    console.error('Get chat error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Post a message to chat -> this saves user message, calls AI, saves bot reply, returns reply
// POST /api/chats/:id/message
router.post('/:id/message', authenticateToken, async (req, res) => {
  try {
    const chatId = req.params.id;
    const { message } = req.body;
    if (!message) return res.status(400).json({ message: 'Message required' });

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    if (chat.user.toString() !== req.userId.toString()) return res.status(403).json({ message: 'Forbidden' });

    // Append user message
    const userMsg = { role: 'user', text: message, createdAt: new Date() };
    chat.messages.push(userMsg);
    await chat.save();

    // Prepare context for AI — we can send entire conversation or last N messages
    // Here we send last 10 messages to the AI server
    const lastMessages = chat.messages.slice(-20).map(m => ({ role: m.role, text: m.text }));

    // Call AI backend
    let aiReplyText = 'Sorry — no reply';
    try {
      const resp = await fetch(AI_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: lastMessages, message }), // adapt if your AI expects different shape
      });

      if (resp.ok) {
        const data = await resp.json().catch(()=>null);
        // support multiple response shapes
        aiReplyText = (data && (data.reply || data.answer || data.text)) || (typeof data === 'string' ? data : aiReplyText);
      } else {
        const txt = await resp.text().catch(()=>null);
        console.warn('AI server returned non-OK', resp.status, txt);
      }
    } catch (err) {
      console.warn('AI call failed', err);
    }

    // Save bot reply
    const botMsg = { role: 'bot', text: aiReplyText, createdAt: new Date() };
    chat.messages.push(botMsg);
    await chat.save();

    return res.json({ reply: aiReplyText, chat });
  } catch (err) {
    console.error('Post message error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});
// POST /api/chats/new-message
// Body: { message: string }
// Creates a new chat, saves the user message, calls AI with context, saves bot reply,
// auto-sets chat.title to first 3 words of user message, returns { chat, reply }.
router.post('/new-message', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.toString().trim()) return res.status(400).json({ message: 'Message required' });

    // Create chat with auto title from first 3 words
    const makeTitle = (text) => {
      const words = text.trim().split(/\s+/).slice(0, 3);
      return words.join(' ') || 'Chat';
    };
    const title = makeTitle(message);

    const chat = new Chat({ user: req.userId, title, messages: [] });

    // save user message
    const userMsg = { role: 'user', text: message, createdAt: new Date() };
    chat.messages.push(userMsg);
    await chat.save();

    // Prepare context - send last N messages
    const lastMessages = chat.messages.slice(-20).map(m => ({ role: m.role, text: m.text }));

    // Call your AI server - adapt to your API contract
    let aiReplyText = 'Sorry — no reply';
    try {
      const AI_ENDPOINT = process.env.AI_ENDPOINT || (process.env.AI_SERVER ? `${process.env.AI_SERVER}/chat` : 'http://192.168.235.90:8000/chat');
      const resp = await fetch(AI_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: lastMessages, message }),
      });

      if (resp.ok) {
        const data = await resp.json().catch(()=>null);
        aiReplyText = (data && (data.reply || data.answer || data.text)) || (typeof data === 'string' ? data : aiReplyText);
      } else {
        const raw = await resp.text().catch(()=>null);
        console.warn('AI responded non-ok', resp.status, raw);
      }
    } catch (err) {
      console.warn('AI call failed', err);
    }

    // save bot reply
    const botMsg = { role: 'bot', text: aiReplyText, createdAt: new Date() };
    chat.messages.push(botMsg);
    await chat.save();

    // return chat + reply
    return res.status(201).json({ chat, reply: aiReplyText });
  } catch (err) {
    console.error('new-message error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});
// DELETE /api/chats/:id   -> delete a chat (user only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    if (chat.user.toString() !== req.userId.toString()) return res.status(403).json({ message: 'Forbidden' });
    await Chat.deleteOne({ _id: chat._id });
    return res.json({ message: 'Chat deleted' });
  } catch (err) {
    console.error('DELETE chat error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/chats/:chatId/messages/:messageId  -> update a message text
router.patch('/:chatId/messages/:messageId', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;
    if (typeof text !== 'string') return res.status(400).json({ message: 'Text required' });

    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    if (chat.user.toString() !== req.userId.toString()) return res.status(403).json({ message: 'Forbidden' });

    // find message subdoc by _id
    const msg = chat.messages.id(req.params.messageId);
    if (!msg) return res.status(404).json({ message: 'Message not found' });

    msg.text = text;
    await chat.save();

    return res.json({ message: 'Updated', messageId: msg._id, text: msg.text });
  } catch (err) {
    console.error('PATCH message error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;

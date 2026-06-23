import { createServer } from 'http'
import { Server } from 'socket.io'
import { verifyChatSocketToken, sanitizeChatMessageContent } from './auth.mjs'

const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3003')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

const authenticatedSockets = new Map()

interface ChatUser {
  id: string
  name: string
  avatar: string
  socketId: string
  currentChannel: string
}

interface ChatMessage {
  id: string
  content: string
  senderId: string
  senderName: string
  senderAvatar: string
  channelId: string
  timestamp: string
  reactions: { emoji: string; users: string[] }[]
  attachments: string[]
}

const connectedUsers = new Map<string, ChatUser>()
const channelMessages = new Map<string, ChatMessage[]>()

const generateId = () => Math.random().toString(36).substring(2, 11) + Date.now().toString(36)

for (let i = 1; i <= 7; i++) {
  const chId = `ch-${i}`
  if (!channelMessages.has(chId)) {
    channelMessages.set(chId, [])
  }
}

function getMessagesForChannel(channelId: string): ChatMessage[] {
  return channelMessages.get(channelId) || []
}

function addMessageToChannel(channelId: string, message: ChatMessage) {
  const messages = channelMessages.get(channelId) || []
  messages.push(message)
  if (messages.length > 50) {
    channelMessages.set(channelId, messages.slice(-50))
  } else {
    channelMessages.set(channelId, messages)
  }
}

io.on('connection', (socket) => {
  socket.on('authenticate', (data: { token?: string }, callback?: (result: { ok: boolean; error?: string }) => void) => {
    const token = typeof data?.token === 'string' ? data.token : ''
    const identity = verifyChatSocketToken(token)

    if (!identity) {
      callback?.({ ok: false, error: 'invalid_token' })
      socket.disconnect(true)
      return
    }

    authenticatedSockets.set(socket.id, identity)
    callback?.({ ok: true })
  })

  socket.on('join', (data: { channel: string }) => {
    const identity = authenticatedSockets.get(socket.id)
    if (!identity) {
      socket.emit('auth_error', { error: 'not_authenticated' })
      return
    }

    const channel = data.channel
    const user: ChatUser = {
      id: identity.userId,
      name: identity.userName,
      avatar: identity.userAvatar,
      socketId: socket.id,
      currentChannel: channel,
    }

    connectedUsers.set(socket.id, user)
    socket.join(channel)

    const messages = getMessagesForChannel(channel)
    socket.emit('channel_messages', { channelId: channel, messages })

    socket.to(channel).emit('user_joined', {
      user: { id: user.id, name: user.name, avatar: user.avatar },
      channel,
    })

    const usersList = Array.from(connectedUsers.values()).map((u) => ({
      id: u.id,
      name: u.name,
      avatar: u.avatar,
    }))
    io.emit('connected_users', { users: usersList })
  })

  socket.on('switch_channel', (data: { channel: string }) => {
    const user = connectedUsers.get(socket.id)
    if (!user) return

    socket.leave(user.currentChannel)
    socket.join(data.channel)
    user.currentChannel = data.channel

    const messages = getMessagesForChannel(data.channel)
    socket.emit('channel_messages', { channelId: data.channel, messages })
  })

  socket.on('send_message', (data: { channelId: string; content: string }) => {
    const user = connectedUsers.get(socket.id)
    if (!user) return

    const content = sanitizeChatMessageContent(data.content)
    if (!content) return

    const message: ChatMessage = {
      id: generateId(),
      content,
      senderId: user.id,
      senderName: user.name,
      senderAvatar: user.avatar,
      channelId: data.channelId,
      timestamp: new Date().toISOString(),
      reactions: [],
      attachments: [],
    }

    addMessageToChannel(data.channelId, message)
    io.to(data.channelId).emit('new_message', message)
  })

  socket.on('typing', (data: { channelId: string }) => {
    const user = connectedUsers.get(socket.id)
    if (!user) return

    socket.to(data.channelId).emit('user_typing', {
      userId: user.id,
      userName: user.name,
      channelId: data.channelId,
    })
  })

  socket.on('stop_typing', (data: { channelId: string }) => {
    const user = connectedUsers.get(socket.id)
    if (!user) return

    socket.to(data.channelId).emit('user_stop_typing', {
      userId: user.id,
      channelId: data.channelId,
    })
  })

  socket.on('disconnect', () => {
    authenticatedSockets.delete(socket.id)
    const user = connectedUsers.get(socket.id)
    if (user) {
      connectedUsers.delete(socket.id)

      socket.to(user.currentChannel).emit('user_left', {
        user: { id: user.id, name: user.name, avatar: user.avatar },
        channel: user.currentChannel,
      })

      const usersList = Array.from(connectedUsers.values()).map((u) => ({
        id: u.id,
        name: u.name,
        avatar: u.avatar,
      }))
      io.emit('connected_users', { users: usersList })
    }
  })

  socket.on('error', (error) => {
    console.error(`[Chat] Socket error (${socket.id}):`, error)
  })
})

const PORT = Number(process.env.CHAT_SOCKET_PORT || 3003)
httpServer.listen(PORT, () => {
  console.log(`[Chat] WebSocket chat service running on port ${PORT}`)
})

process.on('SIGTERM', () => {
  httpServer.close(() => process.exit(0))
})

process.on('SIGINT', () => {
  httpServer.close(() => process.exit(0))
})

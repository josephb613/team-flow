import { createServer } from 'http'
import { Server } from 'socket.io'

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

interface User {
  id: string
  username: string
}

interface Message {
  id: string
  username: string
  content: string
  timestamp: Date
  type: 'user' | 'system'
}

const users = new Map<string, User>()

const generateMessageId = () => Math.random().toString(36).substr(2, 9)

const sanitizeContent = (content: string) =>
  content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().slice(0, 4000)

const createSystemMessage = (content: string): Message => ({
  id: generateMessageId(),
  username: 'System',
  content,
  timestamp: new Date(),
  type: 'system'
})

const createUserMessage = (username: string, content: string): Message => ({
  id: generateMessageId(),
  username,
  content,
  timestamp: new Date(),
  type: 'user'
})

io.on('connection', (socket) => {
  socket.on('join', (data: { username: string; authToken?: string }) => {
    const authToken = process.env.CHAT_SOCKET_SECRET || process.env.NEON_AUTH_COOKIE_SECRET
    if (!authToken || data.authToken !== authToken) {
      socket.emit('auth_error', { error: 'unauthorized' })
      socket.disconnect(true)
      return
    }

    const username = sanitizeContent(data.username)
    if (!username) {
      socket.disconnect(true)
      return
    }

    const user: User = {
      id: socket.id,
      username,
    }

    users.set(socket.id, user)

    const joinMessage = createSystemMessage(`${username} joined the chat room`)
    io.emit('user-joined', { user, message: joinMessage })

    const usersList = Array.from(users.values())
    socket.emit('users-list', { users: usersList })
  })

  socket.on('message', (data: { content: string; username: string }) => {
    const user = users.get(socket.id)
    const content = sanitizeContent(data.content)

    if (user && user.username === data.username && content) {
      const message = createUserMessage(user.username, content)
      io.emit('message', message)
    }
  })

  socket.on('disconnect', () => {
    const user = users.get(socket.id)

    if (user) {
      users.delete(socket.id)
      const leaveMessage = createSystemMessage(`${user.username} left the chat room`)
      io.emit('user-left', { user: { id: socket.id, username: user.username }, message: leaveMessage })
    }
  })
})

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`)
})

process.on('SIGTERM', () => {
  httpServer.close(() => process.exit(0))
})

process.on('SIGINT', () => {
  httpServer.close(() => process.exit(0))
})

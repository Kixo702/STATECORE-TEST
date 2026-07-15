import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'

const app = express()
const prisma = new PrismaClient()
app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.post('/api/register', async (req, res) => {
  try {
    const { login, password, nickname, vk = '', forum = '' } = req.body
    if (!login || !password || !nickname) {
      return res.status(400).json({ error: 'Заполните обязательные поля' })
    }

    const exists = await prisma.user.findUnique({ where: { login } })
    if (exists) return res.status(409).json({ error: 'Пользователь уже существует' })

    const user = await prisma.user.create({
      data: {
        login,
        nickname,
        password,
        vk,
        forum,
      },
    })

    res.json({ user })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Ошибка регистрации' })
  }
})

app.post('/api/login', async (req, res) => {
  try {
    const { login, password } = req.body
    const user = await prisma.user.findUnique({ where: { login } })
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Неверный логин или пароль' })
    }
    res.json({ user })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Ошибка входа' })
  }
})

app.get('/api/users', async (_req, res) => {
  try {
    const users = await prisma.user.findMany({ orderBy: { registeredAt: 'desc' } })
    res.json({ users })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Ошибка загрузки пользователей' })
  }
})

app.post('/api/sync-local-users', async (req, res) => {
  try {
    const users = Array.isArray(req.body?.users) ? req.body.users : []
    const session = req.body?.session || null

    for (const user of users) {
      if (!user?.login) continue
      const payload = {
        id: user.id || `local-${user.login}`,
        login: user.login,
        nickname: user.nickname || user.login || 'User',
        password: user.password || 'local',
        vk: user.vk || '',
        forum: user.forum || '',
        roleName: user.roleName || 'Игрок',
        avatar: user.avatar || null,
        registeredAt: user.registeredAt ? new Date(user.registeredAt) : undefined,
      }

      await prisma.user.upsert({
        where: { login: payload.login },
        update: payload,
        create: payload,
      })
    }

    if (session?.login) {
      await prisma.user.upsert({
        where: { login: session.login },
        update: {
          nickname: session.nickname || session.login,
          roleName: session.roleName || 'Игрок',
          vk: session.vk || '',
          forum: session.forum || '',
          avatar: session.avatar || null,
        },
        create: {
          id: session.id || `local-${session.login}`,
          login: session.login,
          nickname: session.nickname || session.login,
          password: session.password || 'local',
          roleName: session.roleName || 'Игрок',
          vk: session.vk || '',
          forum: session.forum || '',
          avatar: session.avatar || null,
          registeredAt: session.registeredAt ? new Date(session.registeredAt) : undefined,
        },
      })
    }

    const allUsers = await prisma.user.findMany({ orderBy: { registeredAt: 'desc' } })
    res.json({ ok: true, users: allUsers })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Ошибка синхронизации пользователей' })
  }
})

app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } })
    res.json({ user })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Ошибка загрузки пользователя' })
  }
})

app.post('/api/friends/request', async (req, res) => {
  try {
    const { fromUserId, toUserId } = req.body
    if (!fromUserId || !toUserId || fromUserId === toUserId) {
      return res.status(400).json({ error: 'Неверный запрос' })
    }

    const exists = await prisma.friendRequest.findFirst({
      where: {
        fromUserId,
        toUserId,
        status: 'pending',
      },
    })
    if (exists) return res.json({ ok: true, request: exists })

    const request = await prisma.friendRequest.create({
      data: { fromUserId, toUserId, status: 'pending' },
    })
    res.json({ ok: true, request })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Ошибка отправки запроса' })
  }
})

app.get('/api/friends/requests/:userId', async (req, res) => {
  try {
    const requests = await prisma.friendRequest.findMany({
      where: { toUserId: req.params.userId, status: 'pending' },
      include: { fromUser: true },
    })
    res.json({ requests })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Ошибка загрузки запросов' })
  }
})

app.post('/api/friends/accept', async (req, res) => {
  try {
    const { requestId, userAId, userBId } = req.body
    await prisma.friendRequest.update({ where: { id: requestId }, data: { status: 'accepted' } })
    await prisma.friend.create({ data: { userAId, userBId } })
    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Ошибка принятия запроса' })
  }
})

app.get('/api/friends/:userId', async (req, res) => {
  try {
    const friends = await prisma.friend.findMany({
      where: { OR: [{ userAId: req.params.userId }, { userBId: req.params.userId }] },
      include: { userA: true, userB: true },
    })
    res.json({ friends })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Ошибка загрузки друзей' })
  }
})

const PORT = process.env.PORT || 4000
app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`))

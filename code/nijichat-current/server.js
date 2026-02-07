import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'

const app = express()
const port = 3001

app.use(cors())
app.use(express.json())

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content
      }))
    })

    res.json({
      content: response.content[0].text
    })
  } catch (error) {
    console.error('API Error:', error)
    res.status(500).json({ error: 'API request failed' })
  }
})

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
})

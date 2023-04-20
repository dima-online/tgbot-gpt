import { Telegraf, session } from 'telegraf'
import { message } from 'telegraf/filters'
import config from 'config'
import mongoose from 'mongoose'
import {
  proccessVoiceMessage,
  proccessTextMessage,
  handleCallbackQuery,
} from './logic.js'
import { initCommand, normalizeSession } from './utils.js'

const bot = new Telegraf(config.get('TELEGRAM_TOKEN'))

bot.use(session())

bot.command(
  'new',
  initCommand('Начат новый диалог. Жду голосовое или текстовое сообщение.')
)

bot.command(
  'start',
  initCommand(
    'Добро пожаловать в бота. Отправьте голосовое или текстовое сообщение для общение с ChatGPT.'
  )
)

bot.command('admin', async (ctx) => {
  if (ctx.message.from.id !== config.get('ADMIN_TG_ID')) return
  await ctx.reply('Привет Владилен')
})

bot.on(message('voice'), async (ctx) => {
  normalizeSession(ctx)
  await proccessVoiceMessage(ctx)
})

bot.on(message('text'), async (ctx) => {
  normalizeSession(ctx)
  await proccessTextMessage(ctx)
})

bot.on('callback_query', handleCallbackQuery)

async function start() {
  try {
    await mongoose.connect(config.get('MONGO_URI'), {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })

    bot.launch()

    console.log('MongoDB Connected and bot started.')

    process.once('SIGINT', () => bot.stop('SIGINT'))
    process.once('SIGTERM', () => bot.stop('SIGTERM'))
  } catch (e) {
    console.log('Server Error', e.message)
    process.exit(1)
  }
}

start()

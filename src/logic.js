import { bold, code } from 'telegraf/format'
import { openai } from './openai.js'
import { ogg } from './ogg.js'
import { gptMessage, removeFile, emptySession, printConversation } from './utils.js'
import { mongo } from './mongo.js'

/**
 * Обрабатывает голосовое сообщение пользователя.
 * @param {object} ctx - Контекст Telegram бота.
 */
export async function proccessVoiceMessage(ctx) {
  try {
    const chatId = ctx.message.chatId

    if (chatId === config.get('ALLOWED_CHAT_ID')) {
      // Разрешенная группа, обрабатываем запрос
      await ctx.reply(code('Секунду. Жду ответ от ChatGPT'))

      const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id)
      const userId = String(ctx.message.from.id)

      const oggPath = await ogg.create(link.href, userId)
      const mp3Path = await ogg.toMp3(oggPath, userId)
      removeFile(oggPath)
      const text = await openai.transcription(mp3Path)
      removeFile(mp3Path)
      await ctx.reply(code(`Ваш запрос: ${text}`))
      proccessGPTResponse(ctx, text)
    } else {
      // Неавторизованная группа
      await ctx.reply(code('Извините, этот бот работает только в определенной группе.'))
    }
  } catch (e) {
    await ctx.reply(`Ошибка с API. Скажи Владилену, чтоб пофиксил. ${e.message}`)
    console.error(`Error while proccessing voice message`, e.message)
  }
}

/**
 * Обрабатывает текстовое сообщение пользователя.
 * @param {object} ctx - Контекст Telegram бота.
 */
export async function proccessTextMessage(ctx) {
  try {
    const chatId = ctx.message.chatId
    if (chatId === config.get('ALLOWED_CHAT_ID')) {
      // Разрешенная группа, обрабатываем запрос
      await ctx.reply(code('Секунду. Жду ответ от ChatGPT'))
      proccessGPTResponse(ctx, ctx.message.text)
    } else {
      // Неавторизованная группа
      await ctx.reply(code('Извините, этот бот работает только в определенной группе.'))
    }
  } catch (e) {
    ctx.reply(`Ошибка с API. Скажи Владилену, чтоб пофиксил. ${e.message}`)
    console.error(`Error while proccessing text message`, e.message)
  }
}

/**
 * Обрабатывает запрос обратного вызова (callback query) от пользователя.
 * @param {object} ctx - Контекст Telegram бота.
 */
export async function handleCallbackQuery(ctx) {
  try {
    if (ctx.update.callback_query.data === 'save_conversation') {
      const user = await mongo.createOrGetUser(ctx.update.callback_query.from)
      await mongo.saveConversation(ctx.session.messages, user._id)
      ctx.session = emptySession()
      ctx.reply('Переписка сохранена и закрыта. Вы можете начать новую.')
    } else if (ctx.update.callback_query.data.startsWith('conversation')) {
      const conversationId = ctx.update.callback_query.data.split('-')[1]
      const conversation = ctx.session.conversations.find(
        (c) => c._id == conversationId.trim()
      )
      ctx.replyWithHTML(printConversation(conversation))
    }
  } catch (e) {
    console.error(`Error while handling callback query`, e.message)
  }
}

/**
 * Получает все беседы пользователя и отправляет список в чат.
 * @param {object} ctx - Контекст Telegram бота.
 */
export async function getUserConversations(ctx) {
  try {
    const user = await mongo.createOrGetUser(ctx.message.from)
    const conversations = await mongo.getConversations(user._id)
    ctx.session.conversations = conversations

    ctx.reply(bold('Ваши переписки:'), {
      reply_markup: {
        inline_keyboard: conversations.map((c) => [
          {
            text: c.messages[0].content,
            callback_data: `conversation-${c._id}`,
          },
        ]),
      },
    })
  } catch (e) {
    console.error(`Error while getting conversations`, e.message)
  }
}

/**
 * Обрабатывает ответ от GPT и отправляет его пользователю.
 * @param {object} ctx - Контекст Telegram бота.
 * @param {string} text - Текстовый ответ от GPT.
 */
async function proccessGPTResponse(ctx, text = '') {
  try {
    if (!text.trim()) return
    ctx.session.messages.push(gptMessage(text))
    const userId = String(ctx.message.from.id)
    const response = await openai.chat(ctx.session.messages, userId)

    console.log('DEBUG', ctx.session.messages)

    if (!response)
      return ctx.reply(`Ошибка с API. Скажи Владилену, чтоб пофиксил. ${response}`)

    ctx.session.messages.push(
      gptMessage(response.content, openai.roles.ASSISTANT)
    )

    ctx.reply(response.content, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Сохранить и закончить переписку?',
              callback_data: 'save_conversation',
            },
          ],
        ],
      },
    })
  } catch (e) {
    console.log(`Error while proccessing gpt response`, e.message)
  }
}

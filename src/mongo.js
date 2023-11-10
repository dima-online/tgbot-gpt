// Импорт моделей из соответствующих файлов
import { UserModel } from './models/user.model.js'
import { ConversationModel } from './models/conversation.model.js'
import { mapContextData } from './utils.js'

// Класс для взаимодействия с базой данных MongoDB
class MongoDB {
  /**
   * Создает нового пользователя или возвращает существующего по telegramId.
   * @param {object} from - Объект, содержащий данные о пользователе.
   * @returns {Promise<object>} - Объект пользователя.
   */
  async createOrGetUser(from) {
    // Преобразование данных из контекста
    const user = mapContextData(from)

    try {
      // Поиск пользователя по telegramId в базе данных
      const existingUser = await UserModel.findOne({
        telegramId: user.telegramId,
      })

      // Если пользователь существует, возвращаем его
      if (existingUser) return existingUser

      // Создаем нового пользователя и сохраняем в базе данных
      return await new UserModel({
        telegramId: user.telegramId,
        firstname: user.firstname,
        username: user.username,
      }).save()
    } catch (e) {
      // В случае ошибки выводим сообщение в консоль
      console.log('Error in creating user', e.message)
    }
  }

  /**
   * Сохраняет беседу в базе данных.
   * @param {array} messages - Массив сообщений беседы.
   * @param {string} userId - Идентификатор пользователя.
   */
  async saveConversation(messages, userId) {
    try {
      // Создаем новую запись беседы и сохраняем в базе данных
      await new ConversationModel({
        messages,
        userId,
      }).save()
    } catch (e) {
      // В случае ошибки выводим сообщение в консоль
      console.log('Error in creating conversation', e.message)
    }
  }

  /**
   * Получает все беседы для заданного пользователя.
   * @param {string} userId - Идентификатор пользователя.
   * @returns {Promise<array>} - Массив объектов бесед пользователя.
   */
  async getConversations(userId) {
    try {
      // Поиск бесед для заданного пользователя в базе данных
      return await ConversationModel.find({ userId })
    } catch (e) {
      // В случае ошибки выводим сообщение в консоль
      console.log('Error in creating conversation', e.message)
    }
  }
}

// Экспорт экземпляра класса MongoDB для использования в других модулях
export const mongo = new MongoDB()

import api from './api';

class ChatService {
  /**
   * Get all conversations for the current user
   */
  async getConversations() {
    const response = await api.get('/chat/conversations');
    return response.data;
  }

  /**
   * Get or create a conversation
   */
  async getOrCreateConversation(responderId, patientId) {
    const response = await api.post('/chat/conversations', {
      responder_id: responderId,
      patient_id: patientId,
    });
    return response.data;
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(conversationId) {
    const response = await api.get(`/chat/conversations/${conversationId}/messages`);
    return response.data;
  }

  /**
   * Send a message
   */
  async sendMessage(conversationId, message, messageType = 'text', attachmentUrl = null) {
    const response = await api.post(`/chat/conversations/${conversationId}/messages`, {
      message,
      message_type: messageType,
      attachment_url: attachmentUrl,
    });
    return response.data;
  }

  /**
   * Mark conversation as read
   */
  async markAsRead(conversationId) {
    const response = await api.post(`/chat/conversations/${conversationId}/mark-read`);
    return response.data;
  }

  /**
   * Get available responders (for patients)
   */
  async getAvailableResponders() {
    const response = await api.get('/chat/available-responders');
    return response.data;
  }

  /**
   * Get active patients (for responders)
   */
  async getActivePatients() {
    const response = await api.get('/chat/active-patients');
    return response.data;
  }
}

export default new ChatService();

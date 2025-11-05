import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, ArrowLeft, User as UserIcon, Check, CheckCheck } from 'lucide-react';
import chatService from '../../services/chatService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function ResponderMessages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const pollingInterval = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load conversations
  const loadConversations = async () => {
    try {
      const data = await chatService.getConversations();
      setConversations(data);
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load conversations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Load messages for selected conversation
  const loadMessages = async (conversationId) => {
    try {
      const data = await chatService.getMessages(conversationId);
      setMessages(data);
      setTimeout(scrollToBottom, 100);
      
      // Mark as read
      await chatService.markAsRead(conversationId);
      
      // Update unread count in conversations list
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId ? { ...conv, unread_count: 0 } : conv
        )
      );
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive',
      });
    }
  };

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    setSending(true);
    try {
      const message = await chatService.sendMessage(
        selectedConversation.id,
        newMessage.trim()
      );
      
      setMessages(prev => [...prev, message]);
      setNewMessage('');
      setTimeout(scrollToBottom, 100);
      
      // Update conversation list with new message
      setConversations(prev =>
        prev.map(conv =>
          conv.id === selectedConversation.id
            ? {
                ...conv,
                latest_message: {
                  message: message.message,
                  created_at: message.created_at,
                  is_sender: true,
                },
                last_message_at: message.created_at,
              }
            : conv
        )
      );
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  // Select conversation
  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
    loadMessages(conversation.id);
  };

  // Poll for new messages
  useEffect(() => {
    if (selectedConversation) {
      // Poll every 3 seconds for new messages
      pollingInterval.current = setInterval(() => {
        loadMessages(selectedConversation.id);
      }, 3000);

      return () => {
        if (pollingInterval.current) {
          clearInterval(pollingInterval.current);
        }
      };
    }
  }, [selectedConversation]);

  // Initial load
  useEffect(() => {
    loadConversations();
    
    // Refresh conversations every 10 seconds
    const conversationsInterval = setInterval(loadConversations, 10000);
    
    return () => {
      clearInterval(conversationsInterval);
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, []);

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    // Less than a minute
    if (diff < 60000) return 'Just now';
    
    // Less than an hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes}m ago`;
    }
    
    // Less than a day
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    }
    
    // Otherwise show date
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-gray-50">
      {/* Conversations List */}
      <div className={`${selectedConversation ? 'hidden md:block' : 'block'} w-full md:w-80 bg-white border-r border-gray-200 flex flex-col`}>
        <div className="p-4 border-b border-gray-200 bg-green-900 text-white">
          <div className="flex items-center gap-3">
            <MessageSquare size={24} />
            <div>
              <h2 className="font-bold text-lg">Messages</h2>
              <p className="text-xs text-green-100">
                {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <MessageSquare size={48} className="mx-auto mb-4 text-gray-300" />
              <p>No conversations yet</p>
              <p className="text-sm mt-2">Patients can start a chat with you</p>
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => handleSelectConversation(conversation)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition ${
                  selectedConversation?.id === conversation.id ? 'bg-green-50 border-l-4 border-l-green-600' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    {conversation.participant.profile_image ? (
                      <img
                        src={conversation.participant.profile_image}
                        alt={conversation.participant.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <UserIcon size={24} className="text-green-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {conversation.participant.name}
                      </h3>
                      {conversation.unread_count > 0 && (
                        <span className="bg-green-600 text-white text-xs rounded-full px-2 py-1 ml-2">
                          {conversation.unread_count}
                        </span>
                      )}
                    </div>
                    {conversation.latest_message && (
                      <p className="text-sm text-gray-600 truncate">
                        {conversation.latest_message.is_sender && 'You: '}
                        {conversation.latest_message.message}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {formatTime(conversation.last_message_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className={`${selectedConversation ? 'flex' : 'hidden md:flex'} flex-1 flex-col`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white border-b border-gray-200 flex items-center gap-3">
              <button
                onClick={() => setSelectedConversation(null)}
                className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                {selectedConversation.participant.profile_image ? (
                  <img
                    src={selectedConversation.participant.profile_image}
                    alt={selectedConversation.participant.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <UserIcon size={20} className="text-green-600" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {selectedConversation.participant.name}
                </h3>
                <p className="text-xs text-gray-500 capitalize">
                  {selectedConversation.participant.role}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.is_sender ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      message.is_sender
                        ? 'bg-green-600 text-white'
                        : 'bg-white text-gray-900 border border-gray-200'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
                    <div className={`flex items-center justify-end gap-1 mt-1 text-xs ${
                      message.is_sender ? 'text-green-100' : 'text-gray-500'
                    }`}>
                      <span>{new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {message.is_sender && (
                        message.is_read ? <CheckCheck size={14} /> : <Check size={14} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-200">
              <div className="flex items-end gap-2">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 resize-none border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent max-h-32"
                  rows={1}
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="bg-green-600 text-white p-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {sending ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <Send size={20} />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Press Enter to send, Shift+Enter for new line</p>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageSquare size={64} className="mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
              <p className="text-sm">Choose a conversation from the list to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

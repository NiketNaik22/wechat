import axios from 'axios';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const API_BASE_URL = `http://${window.location.hostname}:8080/api`;
const WS_URL = `ws://${window.location.hostname}:8080/ws`;
const SOCKJS_URL = `http://${window.location.hostname}:8080/ws-sockjs`;

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface User {
  id?: number;
  username: string;
  email: string;
  displayName: string;
  bio?: string;
  profilePictureUrl?: string;
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  id: number;
  username: string;
  email: string;
  displayName?: string;
}

export interface FriendRequest {
  id: number;
  user: User;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'BLOCKED';
  isReceived: boolean;
}

export interface Message {
    id?: number;
    senderId: number;
    receiverId: number;
    content: string;
    timestamp: string;
    type: 'TEXT' | 'IMAGE' | 'FILE';
    status: 'SENT' | 'DELIVERED' | 'READ';
    readAt?: string;
}

export const login = (data: any) => api.post<AuthResponse>('/auth/signin', data);
export const signup = (data: any) => api.post('/auth/signup', data);
export const getUsers = () => api.get<User[]>('/users');
export const getCurrentUser = () => api.get<User>('/users/me');
export const getMyFriends = () => api.get<User[]>('/users/me/friends');

// Friend Request APIs
export const getFriendRequests = () => api.get<FriendRequest[]>('/friend-requests');
export const sendFriendRequest = (receiverId: number) => api.post(`/friend-requests/send/${receiverId}`);
export const acceptFriendRequest = (requestId: number) => api.post(`/friend-requests/${requestId}/accept`);
export const rejectFriendRequest = (requestId: number) => api.post(`/friend-requests/${requestId}/reject`);
export const cancelFriendRequest = (requestId: number) => api.delete(`/friend-requests/${requestId}/cancel`);
export const unfriendUser = (friendId: number) => api.post(`/friend-requests/unfriend/${friendId}`);
export const blockUser = (userId: number) => api.post(`/friend-requests/block/${userId}`);
export const unblockUser = (userId: number) => api.post(`/friend-requests/unblock/${userId}`);

// Message APIs
export const getConversations = () => api.get<User[]>('/messages/conversations');
export const getConversation = (friendId: number) => api.get<Message[]>(`/messages/conversation/${friendId}`);

// WebSocket Client
let stompClient: Client | null = null;
let notificationListeners: ((notification: any) => void)[] = [];
let messageListeners: ((message: Message) => void)[] = [];
let readReceiptListeners: ((message: Message) => void)[] = [];

export const addNotificationListener = (listener: (notification: any) => void) => {
    notificationListeners.push(listener);
};

export const removeNotificationListener = (listener: (notification: any) => void) => {
    notificationListeners = notificationListeners.filter(l => l !== listener);
};

export const addMessageListener = (listener: (message: Message) => void) => {
    messageListeners.push(listener);
};

export const removeMessageListener = (listener: (message: Message) => void) => {
    messageListeners = messageListeners.filter(l => l !== listener);
};

export const addReadReceiptListener = (listener: (message: Message) => void) => {
    readReceiptListeners.push(listener);
};

export const removeReadReceiptListener = (listener: (message: Message) => void) => {
    readReceiptListeners = readReceiptListeners.filter(l => l !== listener);
};

export const sendMessage = (message: Omit<Message, 'id' | 'timestamp' | 'status' | 'type' | 'readAt'>) => {
    if (stompClient && stompClient.active) {
        stompClient.publish({
            destination: '/app/chat',
            body: JSON.stringify(message),
        });
    } else {
        console.error('STOMP client is not connected.');
    }
};

export const sendReadReceipt = (messageId: number) => {
    if (stompClient && stompClient.active) {
        stompClient.publish({
            destination: '/app/read',
            body: String(messageId),
        });
    } else {
        console.error('STOMP client is not connected.');
    }
};

export const connectWebSocket = () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    if (stompClient && stompClient.active) {
        return;
    }

    stompClient = new Client({
        brokerURL: `${WS_URL}?token=${token}`,
        connectHeaders: { Authorization: `Bearer ${token}` },
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        webSocketFactory: () => new SockJS(`${SOCKJS_URL}?token=${token}`),
        onConnect: () => {
            console.log('Connected to WebSocket successfully!');
            stompClient?.subscribe('/user/queue/friend-requests', (message) => {
                if (message.body) {
                    notificationListeners.forEach(listener => listener(JSON.parse(message.body)));
                }
            });
            stompClient?.subscribe('/user/queue/messages', (message) => {
                if (message.body) {
                    messageListeners.forEach(listener => listener(JSON.parse(message.body)));
                }
            });
            stompClient?.subscribe('/user/queue/read-receipts', (message) => {
                if (message.body) {
                    readReceiptListeners.forEach(listener => listener(JSON.parse(message.body)));
                }
            });
        },
        onStompError: (frame) => console.error('Broker reported error: ' + frame.headers['message']),
        onWebSocketError: (event) => console.error('WebSocket Error:', event),
        onDisconnect: () => console.log("Disconnected from WebSocket")
    });

    stompClient.activate();
};

export const disconnectWebSocket = () => {
    if (stompClient) {
        stompClient.deactivate();
        stompClient = null;
    }
};
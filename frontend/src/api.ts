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
  displayName?: string; // Add displayName to AuthResponse if backend sends it
}

export interface FriendRequest {
  id: number;
  user: User;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'BLOCKED';
  isReceived: boolean;
}

export const login = (data: any) => api.post<AuthResponse>('/auth/signin', data);
export const signup = (data: any) => api.post('/auth/signup', data);
export const getUsers = () => api.get<User[]>('/users');
export const createUser = (user: User) => api.post<User>('/users', user);
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

// WebSocket Client
let stompClient: Client | null = null;
let notificationListeners: ((notification: any) => void)[] = [];

export const addNotificationListener = (listener: (notification: any) => void) => {
    notificationListeners.push(listener);
};

export const removeNotificationListener = (listener: (notification: any) => void) => {
    notificationListeners = notificationListeners.filter(l => l !== listener);
};

export const connectWebSocket = () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    if (stompClient && stompClient.active) {
        return;
    }

    stompClient = new Client({
        // Append token to URL so the HTTP handshake is authenticated
        brokerURL: `${WS_URL}?token=${token}`,
        connectHeaders: {
            Authorization: `Bearer ${token}`
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        // Fallback to SockJS if raw WS fails
        webSocketFactory: () => {
            return new SockJS(`${SOCKJS_URL}?token=${token}`);
        },
        onConnect: () => {
            console.log('Connected to WebSocket successfully!');
            // Listen on the user-specific queue
            stompClient?.subscribe('/user/queue/friend-requests', (message) => {
                console.log("Raw WS message received:", message.body);
                if (message.body) {
                    const notification = JSON.parse(message.body);
                    notificationListeners.forEach(listener => listener(notification));
                }
            });
        },
        onStompError: (frame) => {
            console.error('Broker reported error: ' + frame.headers['message']);
            console.error('Additional details: ' + frame.body);
        },
        onWebSocketError: (event) => {
            console.error('WebSocket Error:', event);
        },
        onDisconnect: () => {
            console.log("Disconnected from WebSocket");
        }
    });

    stompClient.activate();
};

export const disconnectWebSocket = () => {
    if (stompClient) {
        stompClient.deactivate();
        stompClient = null;
    }
};
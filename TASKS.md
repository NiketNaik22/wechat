# Chat Application Implementation Tasks

This document provides a detailed breakdown of tasks required to implement the modules defined in `MODULES.md`.

## Phase 1: Core & Foundation
### 1. Core / Common Module
- [ ] Define shared models: `User`, `Message`, `Status`, `FriendRequest`.
- [ ] Create common DTOs for API requests/responses.
- [ ] Implement utility classes for JSON serialization/deserialization.
- [ ] Set up basic error handling and custom exception classes.

### 2. Persistence Module
- [ ] Choose and set up the primary database (e.g., PostgreSQL or MongoDB).
- [ ] Design the database schema (ER Diagram).
- [ ] Implement JPA/Hibernate entities (if using Java/Spring).
- [ ] Configure a connection pool.
- [ ] Set up a file storage solution (e.g., Local storage, AWS S3) for profile pictures and status media.

## Phase 2: Security & Identity
### 3. Authentication Module
- [ ] Implement User Registration API.
- [ ] Implement User Login API.
- [ ] Integrate JWT (JSON Web Token) for stateless authentication.
- [ ] Secure API endpoints with proper authorization filters.
- [ ] Implement password hashing (e.g., BCrypt).

## Phase 3: Core Features
### 4. Messaging Module
- [ ] Set up a WebSocket or STOMP server for real-time communication.
- [ ] Implement the message routing logic (sending messages to specific users).
- [ ] Create the History Service for storing and fetching past messages.
- [ ] Implement message status tracking (Sent -> Delivered -> Read).
- [ ] Handle connection/disconnection events for user presence.

### 5. Status / Feed Module
- [ ] Implement Status Creation API (Text & Media).
- [ ] Build the Feed Aggregator logic (fetching statuses from friends).
- [ ] Implement the expiry mechanism (background job to hide/delete old statuses).
- [ ] Add support for "Seen" receipts on statuses.

### 6. User & Social Module
- [ ] Build Profile Management APIs (Update bio, name, picture).
- [ ] Implement Friend Request system (Send, Accept, Reject, Remove).
- [ ] Create user search functionality (by username/email).
- [ ] Implement a "Contact List" view API.

## Phase 4: Engagement & Polishing
### 7. Notification Module
- [ ] Implement in-app notification triggers for new messages.
- [ ] Set up a background service for push notifications (e.g., Firebase Cloud Messaging).
- [ ] Create notification settings for users (mute, alerts on/off).

### 8. API / Gateway & Documentation
- [ ] Finalize the REST API structure.
- [ ] Integrate Swagger/OpenAPI for interactive documentation.
- [ ] Implement rate limiting and request validation.

## Phase 5: Testing & Deployment
- [ ] Write unit tests for core logic and services.
- [ ] Write integration tests for API endpoints.
- [ ] Perform end-to-end testing of the real-time messaging flow.
- [ ] Prepare Docker configuration for deployment.

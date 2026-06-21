# Phase 1: Core & Foundation - Detailed Implementation Plan

This document breaks down Phase 1 into granular steps.

## 1. Project Initialization & Framework Setup
- [ ] **Task 1.1**: Initialize Spring Boot project (if agreed).
  - Add dependencies: `spring-boot-starter-web`, `spring-boot-starter-data-jpa`, `spring-boot-starter-validation`, `lombok`, `h2` (for dev) or `postgresql`.
- [ ] **Task 1.2**: Set up project package structure:
  - `org.example.chat.model`
  - `org.example.chat.dto`
  - `org.example.chat.repository`
  - `org.example.chat.service`
  - `org.example.chat.controller`

## 2. Core Models Definition
- [ ] **Task 2.1**: Implement `User` model.
  - Fields: `id`, `username`, `email`, `passwordHash`, `displayName`, `profilePictureUrl`, `bio`, `createdAt`, `updatedAt`.
- [ ] **Task 2.2**: Implement `Message` model.
  - Fields: `id`, `senderId`, `receiverId`, `content`, `type` (TEXT, IMAGE, etc.), `status` (SENT, DELIVERED, READ), `timestamp`.
- [ ] **Task 2.3**: Implement `Status` model.
  - Fields: `id`, `userId`, `content`, `mediaUrl`, `createdAt`, `expiresAt`.
- [ ] **Task 2.4**: Implement `FriendRequest` model.
  - Fields: `id`, `senderId`, `receiverId`, `status` (PENDING, ACCEPTED, REJECTED), `createdAt`.

## 3. Data Transfer Objects (DTOs)
- [ ] **Task 3.1**: Create `UserDTO`, `MessageDTO`, `StatusDTO`.
- [ ] **Task 3.2**: Create Request/Response objects for Auth and Social actions.

## 4. Persistence Setup
- [ ] **Task 4.1**: Configure Database connection in `application.properties` or `application.yml`.
- [ ] **Task 4.2**: Design and implement JPA Repositories for all core models.
- [ ] **Task 4.3**: Set up basic audit logging (e.g., `CreatedAt`, `UpdatedAt` automatically).

## 5. Error Handling & Utilities
- [ ] **Task 5.1**: Implement `GlobalExceptionHandler`.
- [ ] **Task 5.2**: Create custom exceptions (e.g., `UserNotFoundException`, `UnauthorizedException`).
- [ ] **Task 5.3**: Set up JSON mapping configurations (Jackson).

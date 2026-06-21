package org.example.chat.service;

import lombok.RequiredArgsConstructor;
import org.example.chat.dto.MessageDTO;
import org.example.chat.dto.UserDTO;
import org.example.chat.model.Message;
import org.example.chat.model.User;
import org.example.chat.repository.MessageRepository;
import org.example.chat.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final UserService userService;

    public MessageDTO sendMessage(MessageDTO messageDTO) {
        Message message = Message.builder()
                .senderId(messageDTO.getSenderId())
                .receiverId(messageDTO.getReceiverId())
                .content(messageDTO.getContent())
                .type(messageDTO.getType() != null ? messageDTO.getType() : Message.MessageType.TEXT)
                .status(Message.MessageStatus.SENT)
                .timestamp(LocalDateTime.now())
                .build();
        Message savedMessage = messageRepository.save(message);
        return mapToDTO(savedMessage);
    }

    @Transactional
    public MessageDTO markMessageAsRead(Long messageId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));
        
        if (message.getStatus() != Message.MessageStatus.READ) {
            message.setStatus(Message.MessageStatus.READ);
            message.setReadAt(LocalDateTime.now());
            Message savedMessage = messageRepository.save(message);
            return mapToDTO(savedMessage);
        }
        return mapToDTO(message);
    }

    public List<MessageDTO> getConversation(String currentUsername, Long friendId) {
        User currentUser = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Long currentUserId = currentUser.getId();

        return messageRepository.findTop50BySenderIdAndReceiverIdOrSenderIdAndReceiverIdOrderByTimestampDesc(
                currentUserId, friendId, friendId, currentUserId)
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public List<UserDTO> getConversations(String currentUsername) {
        User currentUser = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("User not found"));
        List<Long> userIds = messageRepository.findDistinctUserIdsByConversation(currentUser.getId());
        return userIds.stream()
                .map(userId -> userRepository.findById(userId)
                        .orElseThrow(() -> new RuntimeException("User not found")))
                .map(userService::mapToDTO)
                .collect(Collectors.toList());
    }

    public String getReceiverUsername(Long receiverId) {
        return userRepository.findById(receiverId)
                .map(User::getUsername)
                .orElse(null);
    }

    public String getSenderUsername(Long senderId) {
        return userRepository.findById(senderId)
                .map(User::getUsername)
                .orElse(null);
    }

    private MessageDTO mapToDTO(Message message) {
        return MessageDTO.builder()
                .id(message.getId())
                .senderId(message.getSenderId())
                .receiverId(message.getReceiverId())
                .content(message.getContent())
                .type(message.getType())
                .status(message.getStatus())
                .timestamp(message.getTimestamp())
                .readAt(message.getReadAt())
                .build();
    }
}
package org.example.chat.service;

import lombok.RequiredArgsConstructor;
import org.example.chat.dto.MessageDTO;
import org.example.chat.model.Message;
import org.example.chat.repository.MessageRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;

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

    public List<MessageDTO> getMessagesForUser(Long userId) {
        return messageRepository.findByReceiverId(userId).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
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
                .build();
    }
}

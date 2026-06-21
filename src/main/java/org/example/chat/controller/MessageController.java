package org.example.chat.controller;

import lombok.RequiredArgsConstructor;
import org.example.chat.dto.MessageDTO;
import org.example.chat.dto.UserDTO;
import org.example.chat.service.MessageService;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;

@Controller
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;
    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/chat")
    public void processMessage(@Payload MessageDTO chatMessage) {
        MessageDTO savedMsg = messageService.sendMessage(chatMessage);
        
        String receiverUsername = messageService.getReceiverUsername(savedMsg.getReceiverId());
        if (receiverUsername != null) {
            messagingTemplate.convertAndSendToUser(receiverUsername, "/queue/messages", savedMsg);
        }

        String senderUsername = messageService.getSenderUsername(savedMsg.getSenderId());
        if (senderUsername != null) {
            messagingTemplate.convertAndSendToUser(senderUsername, "/queue/messages", savedMsg);
        }
    }

    @MessageMapping("/read")
    public void markAsRead(@Payload Long messageId) {
        MessageDTO message = messageService.markMessageAsRead(messageId);
        
        // Notify the original sender that the message was read
        String senderUsername = messageService.getSenderUsername(message.getSenderId());
        if (senderUsername != null) {
            messagingTemplate.convertAndSendToUser(senderUsername, "/queue/read-receipts", message);
        }
    }

    @GetMapping("/api/messages/conversations")
    public ResponseEntity<List<UserDTO>> getConversations(Authentication authentication) {
        String currentUsername = authentication.getName();
        return ResponseEntity.ok(messageService.getConversations(currentUsername));
    }

    @GetMapping("/api/messages/conversation/{friendId}")
    public ResponseEntity<List<MessageDTO>> getConversation(
            Authentication authentication,
            @PathVariable Long friendId
    ) {
        String currentUsername = authentication.getName();
        return ResponseEntity.ok(messageService.getConversation(currentUsername, friendId));
    }
}

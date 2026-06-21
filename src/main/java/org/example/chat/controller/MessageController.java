package org.example.chat.controller;

import lombok.RequiredArgsConstructor;
import org.example.chat.dto.MessageDTO;
import org.example.chat.service.MessageService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;

    @PostMapping
    public ResponseEntity<MessageDTO> sendMessage(@RequestBody MessageDTO messageDTO) {
        return ResponseEntity.ok(messageService.sendMessage(messageDTO));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<MessageDTO>> getMessagesForUser(@PathVariable Long userId) {
        return ResponseEntity.ok(messageService.getMessagesForUser(userId));
    }
}

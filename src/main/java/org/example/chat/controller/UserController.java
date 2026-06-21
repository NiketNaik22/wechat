package org.example.chat.controller;

import lombok.RequiredArgsConstructor;
import org.example.chat.dto.UserDTO;
import org.example.chat.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @PostMapping
    public ResponseEntity<UserDTO> createUser(@RequestBody UserDTO userDTO) {
        return ResponseEntity.ok(userService.createUser(userDTO));
    }

    @GetMapping
    public ResponseEntity<List<UserDTO>> getAllUsers(Authentication authentication) {
        if (authentication != null && authentication.isAuthenticated()) {
            return ResponseEntity.ok(userService.getSearchableUsers(authentication.getName()));
        }
        return ResponseEntity.ok(userService.getAllUsers());
    }
    
    @GetMapping("/me")
    public ResponseEntity<UserDTO> getCurrentUser(Authentication authentication) {
        String currentUsername = authentication.getName();
        return ResponseEntity.ok(userService.getUserByUsername(currentUsername));
    }

    @GetMapping("/me/friends")
    public ResponseEntity<List<UserDTO>> getMyFriends(Authentication authentication) {
        String currentUsername = authentication.getName();
        return ResponseEntity.ok(userService.getFriendsByUsername(currentUsername));
    }
}
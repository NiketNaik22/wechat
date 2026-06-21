package org.example.chat.controller;

import lombok.RequiredArgsConstructor;
import org.example.chat.dto.FriendRequestDTO;
import org.example.chat.service.FriendRequestService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/friend-requests")
@RequiredArgsConstructor
public class FriendRequestController {

    private final FriendRequestService friendRequestService;

    @GetMapping
    public ResponseEntity<List<FriendRequestDTO>> getRequests(Authentication authentication) {
        String currentUsername = authentication.getName();
        return ResponseEntity.ok(friendRequestService.getFriendRequestsForUser(currentUsername));
    }

    @PostMapping("/send/{receiverId}")
    public ResponseEntity<Void> sendRequest(@PathVariable Long receiverId, Authentication authentication) {
        String currentUsername = authentication.getName();
        friendRequestService.sendFriendRequest(currentUsername, receiverId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{requestId}/accept")
    public ResponseEntity<Void> acceptRequest(@PathVariable Long requestId, Authentication authentication) {
        String currentUsername = authentication.getName();
        friendRequestService.acceptFriendRequest(requestId, currentUsername);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{requestId}/reject")
    public ResponseEntity<Void> rejectRequest(@PathVariable Long requestId, Authentication authentication) {
        String currentUsername = authentication.getName();
        friendRequestService.rejectFriendRequest(requestId, currentUsername);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{requestId}/cancel")
    public ResponseEntity<Void> cancelRequest(@PathVariable Long requestId, Authentication authentication) {
        String currentUsername = authentication.getName();
        friendRequestService.cancelFriendRequest(requestId, currentUsername);
        return ResponseEntity.ok().build();
    }
    
    @PostMapping("/unfriend/{friendId}")
    public ResponseEntity<Void> unfriendUser(@PathVariable Long friendId, Authentication authentication) {
        String currentUsername = authentication.getName();
        friendRequestService.unfriendUser(friendId, currentUsername);
        return ResponseEntity.ok().build();
    }
    
    @PostMapping("/block/{userId}")
    public ResponseEntity<Void> blockUser(@PathVariable Long userId, Authentication authentication) {
        String currentUsername = authentication.getName();
        friendRequestService.blockUser(userId, currentUsername);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/unblock/{userId}")
    public ResponseEntity<Void> unblockUser(@PathVariable Long userId, Authentication authentication) {
        String currentUsername = authentication.getName();
        friendRequestService.unblockUser(userId, currentUsername);
        return ResponseEntity.ok().build();
    }
}
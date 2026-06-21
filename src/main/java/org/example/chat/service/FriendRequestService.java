package org.example.chat.service;

import lombok.RequiredArgsConstructor;
import org.example.chat.dto.FriendRequestDTO;
import org.example.chat.dto.UserDTO;
import org.example.chat.model.FriendRequest;
import org.example.chat.model.User;
import org.example.chat.repository.FriendRequestRepository;
import org.example.chat.repository.UserRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FriendRequestService {

    private final FriendRequestRepository friendRequestRepository;
    private final UserRepository userRepository;
    private final UserService userService; // To map User to UserDTO
    private final SimpMessagingTemplate messagingTemplate;

    public void sendFriendRequest(String senderUsername, Long receiverId) {
        User sender = userRepository.findByUsername(senderUsername)
                .orElseThrow(() -> new RuntimeException("Sender not found"));
                
        User receiver = userRepository.findById(receiverId)
                .orElseThrow(() -> new RuntimeException("Receiver not found"));

        if (sender.getId().equals(receiverId)) {
            throw new RuntimeException("Cannot send friend request to yourself");
        }

        // Find existing requests between these two users
        List<FriendRequest> existingRequests = friendRequestRepository.findByUsers(sender.getId(), receiverId);

        for (FriendRequest existingReq : existingRequests) {
            if (existingReq.getStatus() == FriendRequest.RequestStatus.ACCEPTED) {
                throw new RuntimeException("You are already friends with this user");
            } else if (existingReq.getStatus() == FriendRequest.RequestStatus.PENDING) {
                 throw new RuntimeException("Already sent request");
            } else if (existingReq.getStatus() == FriendRequest.RequestStatus.BLOCKED) {
                 throw new RuntimeException("Cannot send friend request to this user");
            }
            
            // If the status is REJECTED, we allow them to send a new request.
            if (existingReq.getStatus() == FriendRequest.RequestStatus.REJECTED) {
                 friendRequestRepository.delete(existingReq);
            }
        }

        FriendRequest request = FriendRequest.builder()
                .senderId(sender.getId())
                .receiverId(receiver.getId())
                .status(FriendRequest.RequestStatus.PENDING)
                .build();

        friendRequestRepository.save(request);
        
        // Push real-time notification to the receiver
        FriendRequestDTO notification = FriendRequestDTO.builder()
                .id(request.getId())
                .user(userService.getUserByUsername(senderUsername))
                .status(request.getStatus())
                .isReceived(true)
                .build();
        messagingTemplate.convertAndSendToUser(receiver.getUsername(), "/queue/friend-requests", notification);
    }
    
    public List<FriendRequestDTO> getFriendRequestsForUser(String username) {
        User currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
                
        List<FriendRequest> requests = friendRequestRepository.findBySenderIdOrReceiverId(currentUser.getId(), currentUser.getId());
        
        return requests.stream()
                .filter(req -> req.getStatus() != FriendRequest.RequestStatus.ACCEPTED) // Exclude accepted, those are in the friends list
                .map(req -> {
                    boolean isReceived = req.getReceiverId().equals(currentUser.getId());
                    Long otherUserId = isReceived ? req.getSenderId() : req.getReceiverId();
                    User otherUser = userRepository.findById(otherUserId)
                            .orElseThrow(() -> new RuntimeException("Other user not found"));
                            
                    UserDTO otherUserDTO = userService.getUserByUsername(otherUser.getUsername());
                    
                    return FriendRequestDTO.builder()
                            .id(req.getId())
                            .user(otherUserDTO)
                            .status(req.getStatus())
                            .isReceived(isReceived)
                            .build();
                })
                .collect(Collectors.toList());
    }

    public void acceptFriendRequest(Long requestId, String username) {
        User currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
                
        FriendRequest request = friendRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Friend request not found"));
                
        if (!request.getReceiverId().equals(currentUser.getId())) {
            throw new RuntimeException("You cannot accept a request not sent to you");
        }
        
        request.setStatus(FriendRequest.RequestStatus.ACCEPTED);
        friendRequestRepository.save(request);
        
        // Notify the original sender that their request was accepted
        User originalSender = userRepository.findById(request.getSenderId()).orElse(null);
        if (originalSender != null) {
            FriendRequestDTO notificationToSender = FriendRequestDTO.builder()
                    .id(request.getId())
                    .user(userService.getUserByUsername(currentUser.getUsername()))
                    .status(FriendRequest.RequestStatus.ACCEPTED)
                    .isReceived(false) // from the sender's perspective, they did not receive it
                    .build();
            messagingTemplate.convertAndSendToUser(originalSender.getUsername(), "/queue/friend-requests", notificationToSender);
        }
        
        // Also notify the receiver (current user) so their UI can update across multiple browser tabs
        FriendRequestDTO notificationToReceiver = FriendRequestDTO.builder()
                .id(request.getId())
                .user(userService.getUserByUsername(originalSender.getUsername()))
                .status(FriendRequest.RequestStatus.ACCEPTED)
                .isReceived(true)
                .build();
        messagingTemplate.convertAndSendToUser(currentUser.getUsername(), "/queue/friend-requests", notificationToReceiver);
    }

    public void rejectFriendRequest(Long requestId, String username) {
        User currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
                
        FriendRequest request = friendRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Friend request not found"));
                
        if (!request.getReceiverId().equals(currentUser.getId())) {
            throw new RuntimeException("You cannot reject a request not sent to you");
        }
        
        request.setStatus(FriendRequest.RequestStatus.REJECTED);
        friendRequestRepository.save(request);
        
        // Notify the original sender that their request was rejected
        User originalSender = userRepository.findById(request.getSenderId()).orElse(null);
        if (originalSender != null) {
            FriendRequestDTO notification = FriendRequestDTO.builder()
                    .id(request.getId())
                    .user(userService.getUserByUsername(currentUser.getUsername()))
                    .status(FriendRequest.RequestStatus.REJECTED)
                    .isReceived(false) // from the sender's perspective, they did not receive it
                    .build();
            messagingTemplate.convertAndSendToUser(originalSender.getUsername(), "/queue/friend-requests", notification);
        }
    }

    public void cancelFriendRequest(Long requestId, String username) {
        User currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
                
        FriendRequest request = friendRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Friend request not found"));
                
        if (!request.getSenderId().equals(currentUser.getId())) {
            throw new RuntimeException("You cannot cancel a request you didn't send");
        }

        if (request.getStatus() != FriendRequest.RequestStatus.PENDING) {
             throw new RuntimeException("You can only cancel pending requests");
        }
        
        friendRequestRepository.delete(request);
        
        // Notify the receiver that the request was cancelled
        User receiver = userRepository.findById(request.getReceiverId()).orElse(null);
        if (receiver != null) {
             FriendRequestDTO notification = FriendRequestDTO.builder()
                    .id(request.getId())
                    .user(userService.getUserByUsername(currentUser.getUsername()))
                    .status(FriendRequest.RequestStatus.REJECTED) // using REJECTED so frontend filters it out
                    .isReceived(true) // from the receiver's perspective, they received the initial request
                    .build();
             messagingTemplate.convertAndSendToUser(receiver.getUsername(), "/queue/friend-requests", notification);
        }
    }
    
    public void unfriendUser(Long friendId, String username) {
        User currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
                
        List<FriendRequest> existingRequests = friendRequestRepository.findByUsers(currentUser.getId(), friendId);
                
        for (FriendRequest existingReq : existingRequests) {
            if (existingReq.getStatus() == FriendRequest.RequestStatus.ACCEPTED) {
                // Soft delete by setting status to REJECTED instead of deleting
                existingReq.setStatus(FriendRequest.RequestStatus.REJECTED);
                friendRequestRepository.save(existingReq);
                return;
            }
        }
        
        throw new RuntimeException("You are not friends with this user");
    }
    
    public void blockUser(Long userIdToBlock, String username) {
        User currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
                
        User userToBlock = userRepository.findById(userIdToBlock)
                .orElseThrow(() -> new RuntimeException("User to block not found"));
                
        // Find existing relationship
        List<FriendRequest> existingRequests = friendRequestRepository.findByUsers(currentUser.getId(), userIdToBlock);
                
        if (existingRequests.isEmpty()) {
            // Create a new blocked relationship
            FriendRequest blockRequest = FriendRequest.builder()
                .senderId(currentUser.getId())
                .receiverId(userToBlock.getId())
                .status(FriendRequest.RequestStatus.BLOCKED)
                .build();
            friendRequestRepository.save(blockRequest);
        } else {
            // Update existing relationship to BLOCKED
            // Also ensure the blocker is the sender so we know who blocked who
            for (FriendRequest existingReq : existingRequests) {
                existingReq.setSenderId(currentUser.getId());
                existingReq.setReceiverId(userToBlock.getId());
                existingReq.setStatus(FriendRequest.RequestStatus.BLOCKED);
                friendRequestRepository.save(existingReq);
            }
        }
    }

    public void unblockUser(Long userIdToUnblock, String username) {
        User currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
                
        List<FriendRequest> existingRequests = friendRequestRepository.findByUsers(currentUser.getId(), userIdToUnblock);
                
        for (FriendRequest existingReq : existingRequests) {
            if (existingReq.getStatus() == FriendRequest.RequestStatus.BLOCKED) {
                if (!existingReq.getSenderId().equals(currentUser.getId())) {
                    throw new RuntimeException("You cannot unblock a user that blocked you");
                }
                friendRequestRepository.delete(existingReq);
                return;
            }
        }
        
        throw new RuntimeException("This user is not blocked");
    }
}
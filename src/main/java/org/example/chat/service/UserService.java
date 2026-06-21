package org.example.chat.service;

import lombok.RequiredArgsConstructor;
import org.example.chat.dto.UserDTO;
import org.example.chat.model.FriendRequest;
import org.example.chat.model.User;
import org.example.chat.repository.FriendRequestRepository;
import org.example.chat.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final FriendRequestRepository friendRequestRepository;
    private final PasswordEncoder passwordEncoder;

    public UserDTO createUser(UserDTO userDTO) {
        User user = User.builder()
                .username(userDTO.getUsername())
                .email(userDTO.getEmail())
                .passwordHash(passwordEncoder.encode("password123")) // Default password for Phase 1 migrations
                .displayName(userDTO.getDisplayName())
                .bio(userDTO.getBio())
                .build();
        User savedUser = userRepository.save(user);
        return mapToDTO(savedUser);
    }

    public List<UserDTO> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }
    
    public List<UserDTO> getSearchableUsers(String currentUsername) {
        User currentUser = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("User not found with username: " + currentUsername));
                
        // Find all requests where the current user is involved
        List<FriendRequest> allInvolvedRequests = friendRequestRepository.findBySenderIdOrReceiverId(currentUser.getId(), currentUser.getId());
        
        // Find IDs of users who have blocked the current user
        // (Where status is BLOCKED and the current user is the receiver of the block)
        List<Long> usersWhoBlockedMe = allInvolvedRequests.stream()
                .filter(req -> req.getStatus() == FriendRequest.RequestStatus.BLOCKED && req.getReceiverId().equals(currentUser.getId()))
                .map(FriendRequest::getSenderId)
                .collect(Collectors.toList());
                
        return userRepository.findAll().stream()
                .filter(user -> !user.getId().equals(currentUser.getId())) // Don't return self
                .filter(user -> !usersWhoBlockedMe.contains(user.getId())) // Don't return users who blocked me
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public UserDTO getUserByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found with username: " + username));
        return mapToDTO(user);
    }

    public List<UserDTO> getFriendsByUsername(String username) {
        User currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found with username: " + username));

        List<FriendRequest> acceptedRequests = friendRequestRepository.findAcceptedRequestsByUserId(currentUser.getId());

        List<Long> friendIds = acceptedRequests.stream()
                .map(request -> request.getSenderId().equals(currentUser.getId()) ? request.getReceiverId() : request.getSenderId())
                .collect(Collectors.toList());

        return userRepository.findAllById(friendIds).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    private UserDTO mapToDTO(User user) {
        return UserDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .displayName(user.getDisplayName())
                .profilePictureUrl(user.getProfilePictureUrl())
                .bio(user.getBio())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
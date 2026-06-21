package org.example.chat.service;

import org.example.chat.dto.UserDTO;
import org.example.chat.model.FriendRequest;
import org.example.chat.model.User;
import org.example.chat.repository.FriendRequestRepository;
import org.example.chat.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private FriendRequestRepository friendRequestRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;

    private User testUser1;
    private User testUser2;
    private User testUser3;

    @BeforeEach
    void setUp() {
        testUser1 = User.builder()
                .id(1L)
                .username("user1")
                .email("user1@test.com")
                .passwordHash("hashedpassword1")
                .displayName("User One")
                .build();
        testUser1.setCreatedAt(LocalDateTime.now());

        testUser2 = User.builder()
                .id(2L)
                .username("user2")
                .email("user2@test.com")
                .passwordHash("hashedpassword2")
                .displayName("User Two")
                .build();
        testUser2.setCreatedAt(LocalDateTime.now());

        testUser3 = User.builder()
                .id(3L)
                .username("user3")
                .email("user3@test.com")
                .passwordHash("hashedpassword3")
                .displayName("User Three")
                .build();
        testUser3.setCreatedAt(LocalDateTime.now());
    }

    @Test
    void testCreateUser_Success() {
        // Arrange
        UserDTO inputDTO = UserDTO.builder()
                .username("newUser")
                .email("new@test.com")
                .displayName("New User")
                .build();

        User savedUser = User.builder()
                .id(10L)
                .username("newUser")
                .email("new@test.com")
                .displayName("New User")
                .build();
        savedUser.setCreatedAt(LocalDateTime.now());

        when(passwordEncoder.encode("password123")).thenReturn("hashedPass");
        when(userRepository.save(any(User.class))).thenReturn(savedUser);

        // Act
        UserDTO result = userService.createUser(inputDTO);

        // Assert
        assertNotNull(result);
        assertEquals(10L, result.getId());
        assertEquals("newUser", result.getUsername());
        assertEquals("new@test.com", result.getEmail());
        assertEquals("New User", result.getDisplayName());
        
        verify(passwordEncoder, times(1)).encode("password123");
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    void testGetAllUsers_ReturnsListOfUsers() {
        // Arrange
        when(userRepository.findAll()).thenReturn(Arrays.asList(testUser1, testUser2));

        // Act
        List<UserDTO> result = userService.getAllUsers();

        // Assert
        assertNotNull(result);
        assertEquals(2, result.size());
        assertEquals("user1", result.get(0).getUsername());
        assertEquals("user2", result.get(1).getUsername());
        verify(userRepository, times(1)).findAll();
    }

    @Test
    void testGetUserByUsername_UserExists() {
        // Arrange
        when(userRepository.findByUsername("user1")).thenReturn(Optional.of(testUser1));

        // Act
        UserDTO result = userService.getUserByUsername("user1");

        // Assert
        assertNotNull(result);
        assertEquals(1L, result.getId());
        assertEquals("user1", result.getUsername());
        verify(userRepository, times(1)).findByUsername("user1");
    }

    @Test
    void testGetUserByUsername_UserNotFound_ThrowsException() {
        // Arrange
        when(userRepository.findByUsername("nonexistent")).thenReturn(Optional.empty());

        // Act & Assert
        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            userService.getUserByUsername("nonexistent");
        });
        
        assertEquals("User not found with username: nonexistent", exception.getMessage());
        verify(userRepository, times(1)).findByUsername("nonexistent");
    }

    @Test
    void testGetSearchableUsers_FiltersOutSelfAndUsersWhoBlockedCurrent() {
        // Arrange
        // Current user is testUser1 (ID: 1)
        when(userRepository.findByUsername("user1")).thenReturn(Optional.of(testUser1));
        
        // Mock all users existing in system
        when(userRepository.findAll()).thenReturn(Arrays.asList(testUser1, testUser2, testUser3));
        
        // Mock a BLOCKED friend request where testUser3 blocked testUser1
        FriendRequest blockRequest = FriendRequest.builder()
                .id(100L)
                .senderId(3L)    // testUser3 initiated block
                .receiverId(1L)  // testUser1 is blocked
                .status(FriendRequest.RequestStatus.BLOCKED)
                .build();
                
        // A pending request that shouldn't filter the user out
        FriendRequest pendingRequest = FriendRequest.builder()
                .id(101L)
                .senderId(1L)
                .receiverId(2L)
                .status(FriendRequest.RequestStatus.PENDING)
                .build();
                
        when(friendRequestRepository.findBySenderIdOrReceiverId(1L, 1L))
                .thenReturn(Arrays.asList(blockRequest, pendingRequest));

        // Act
        List<UserDTO> result = userService.getSearchableUsers("user1");

        // Assert
        assertNotNull(result);
        assertEquals(1, result.size()); // Should only return testUser2
        assertEquals("user2", result.get(0).getUsername());
        
        verify(userRepository, times(1)).findByUsername("user1");
        verify(friendRequestRepository, times(1)).findBySenderIdOrReceiverId(1L, 1L);
        verify(userRepository, times(1)).findAll();
    }

    @Test
    void testGetFriendsByUsername_ReturnsAcceptedFriendsOnly() {
        // Arrange
        when(userRepository.findByUsername("user1")).thenReturn(Optional.of(testUser1));
        
        // Mock accepted requests
        FriendRequest acceptedReq1 = FriendRequest.builder()
                .senderId(1L)
                .receiverId(2L)
                .status(FriendRequest.RequestStatus.ACCEPTED)
                .build();
                
        FriendRequest acceptedReq2 = FriendRequest.builder()
                .senderId(3L)
                .receiverId(1L)
                .status(FriendRequest.RequestStatus.ACCEPTED)
                .build();
                
        when(friendRequestRepository.findAcceptedRequestsByUserId(1L))
                .thenReturn(Arrays.asList(acceptedReq1, acceptedReq2));
                
        // Mock fetching those specific users
        when(userRepository.findAllById(Arrays.asList(2L, 3L)))
                .thenReturn(Arrays.asList(testUser2, testUser3));

        // Act
        List<UserDTO> result = userService.getFriendsByUsername("user1");

        // Assert
        assertNotNull(result);
        assertEquals(2, result.size());
        assertEquals("user2", result.get(0).getUsername());
        assertEquals("user3", result.get(1).getUsername());
        
        verify(userRepository, times(1)).findByUsername("user1");
        verify(friendRequestRepository, times(1)).findAcceptedRequestsByUserId(1L);
        verify(userRepository, times(1)).findAllById(Arrays.asList(2L, 3L));
    }
}
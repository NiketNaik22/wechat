package org.example.chat.repository;

import org.example.chat.model.FriendRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FriendRequestRepository extends JpaRepository<FriendRequest, Long> {
    List<FriendRequest> findByReceiverIdAndStatus(Long receiverId, FriendRequest.RequestStatus status);
    List<FriendRequest> findBySenderIdOrReceiverId(Long senderId, Long receiverId);
    
    @Query("SELECT fr FROM FriendRequest fr WHERE (fr.senderId = :userId OR fr.receiverId = :userId) AND fr.status = 'ACCEPTED'")
    List<FriendRequest> findAcceptedRequestsByUserId(@Param("userId") Long userId);
    
    @Query("SELECT fr FROM FriendRequest fr WHERE (fr.senderId = :user1Id AND fr.receiverId = :user2Id) OR (fr.senderId = :user2Id AND fr.receiverId = :user1Id)")
    List<FriendRequest> findByUsers(@Param("user1Id") Long user1Id, @Param("user2Id") Long user2Id);
}
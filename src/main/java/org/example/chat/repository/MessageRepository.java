package org.example.chat.repository;

import org.example.chat.model.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findBySenderIdAndReceiverId(Long senderId, Long receiverId);
    List<Message> findByReceiverId(Long receiverId);
    List<Message> findTop50BySenderIdAndReceiverIdOrSenderIdAndReceiverIdOrderByTimestampDesc(
            Long senderId1, Long receiverId1, Long senderId2, Long receiverId2);

    @Query("SELECT DISTINCT m.senderId FROM Message m WHERE m.receiverId = :userId UNION SELECT DISTINCT m.receiverId FROM Message m WHERE m.senderId = :userId")
    List<Long> findDistinctUserIdsByConversation(@Param("userId") Long userId);
}

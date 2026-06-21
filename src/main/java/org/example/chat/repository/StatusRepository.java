package org.example.chat.repository;

import org.example.chat.model.Status;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface StatusRepository extends JpaRepository<Status, Long> {
    List<Status> findByUserIdAndExpiresAtAfter(Long userId, LocalDateTime now);
}

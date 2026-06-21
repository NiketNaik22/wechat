package org.example.chat.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.example.chat.model.FriendRequest.RequestStatus;
import com.fasterxml.jackson.annotation.JsonProperty;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FriendRequestDTO {
    private Long id;
    private UserDTO user; // The "other" user (sender if received, receiver if sent)
    private RequestStatus status;
    
    @JsonProperty("isReceived")
    private boolean isReceived; // true if the current user is the receiver, false if they sent it
    
}
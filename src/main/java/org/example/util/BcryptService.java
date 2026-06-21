package org.example.util;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

public class BcryptService {

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public String encode(String plainText) {
        return passwordEncoder.encode(plainText);
    }

    public static void main(String[] args) {
        BcryptService service = new BcryptService();
        System.out.println("Bcrypted : "+service.encode("Pranshee123"));
    }
}

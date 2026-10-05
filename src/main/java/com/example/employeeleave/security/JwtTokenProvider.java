package com.example.employeeleave.security;

import com.example.employeeleave.entity.UserAccount;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

@Component
public class JwtTokenProvider {

    private static final Logger log = LoggerFactory.getLogger(JwtTokenProvider.class);

    private final String secretKey;
    private final long expirationMs;
    private final ObjectMapper objectMapper;

    public JwtTokenProvider(
            @Value("${jwt.secret:}") String secretKey,
            @Value("${jwt.expiration-ms:86400000}") long expirationMs,
            ObjectMapper objectMapper) {
        if (secretKey != null && !secretKey.trim().isEmpty()) {
            this.secretKey = secretKey.trim();
        } else {
            byte[] randomBytes = new byte[32];
            new SecureRandom().nextBytes(randomBytes);
            this.secretKey = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
            log.info("No JWT_SECRET environment variable or property configured. Generated an ephemeral secure 256-bit key for this application session.");
        }
        this.expirationMs = expirationMs;
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
    }

    public String generateToken(UserAccount user) {
        try {
            long now = System.currentTimeMillis();
            long exp = now + expirationMs;

            Map<String, Object> header = new HashMap<>();
            header.put("alg", "HS256");
            header.put("typ", "JWT");

            Map<String, Object> payload = new HashMap<>();
            payload.put("sub", user.getUsername());
            payload.put("userId", user.getId());
            payload.put("email", user.getEmail());
            payload.put("role", user.getRole().name());
            if (user.getEmployee() != null) {
                payload.put("employeeId", user.getEmployee().getId());
                payload.put("employeeCode", user.getEmployee().getEmployeeId());
            }
            payload.put("iat", now / 1000);
            payload.put("exp", exp / 1000);

            String encodedHeader = base64UrlEncode(objectMapper.writeValueAsString(header).getBytes(StandardCharsets.UTF_8));
            String encodedPayload = base64UrlEncode(objectMapper.writeValueAsString(payload).getBytes(StandardCharsets.UTF_8));
            String dataToSign = encodedHeader + "." + encodedPayload;

            String signature = sign(dataToSign);

            return dataToSign + "." + signature;
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate JWT token", e);
        }
    }

    public boolean validateToken(String token) {
        if (token == null || token.trim().isEmpty()) {
            return false;
        }
        String[] parts = token.split("\\.");
        if (parts.length != 3) {
            return false;
        }

        try {
            String dataToSign = parts[0] + "." + parts[1];
            String expectedSignature = sign(dataToSign);

            if (!MessageDigest.isEqual(
                    expectedSignature.getBytes(StandardCharsets.UTF_8),
                    parts[2].getBytes(StandardCharsets.UTF_8))) {
                return false;
            }

            Map<String, Object> claims = parseClaims(parts[1]);
            if (claims == null) {
                return false;
            }

            Number expNumber = (Number) claims.get("exp");
            if (expNumber == null) {
                return false;
            }

            long expSeconds = expNumber.longValue();
            long nowSeconds = System.currentTimeMillis() / 1000;

            return nowSeconds <= expSeconds;
        } catch (Exception e) {
            return false;
        }
    }

    public String getUsernameFromToken(String token) {
        Map<String, Object> claims = getClaimsFromToken(token);
        return claims != null ? (String) claims.get("sub") : null;
    }

    public String getRoleFromToken(String token) {
        Map<String, Object> claims = getClaimsFromToken(token);
        return claims != null ? (String) claims.get("role") : null;
    }

    public Long getEmployeeIdFromToken(String token) {
        Map<String, Object> claims = getClaimsFromToken(token);
        if (claims != null && claims.get("employeeId") != null) {
            Number num = (Number) claims.get("employeeId");
            return num.longValue();
        }
        return null;
    }

    public Map<String, Object> getClaimsFromToken(String token) {
        if (token == null) return null;
        String[] parts = token.split("\\.");
        if (parts.length != 3) return null;
        return parseClaims(parts[1]);
    }

    private Map<String, Object> parseClaims(String encodedPayload) {
        try {
            byte[] bytes = base64UrlDecode(encodedPayload);
            return objectMapper.readValue(bytes, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            return null;
        }
    }

    private String sign(String data) throws Exception {
        Mac hmacSha256 = Mac.getInstance("HmacSHA256");
        SecretKeySpec secretKeySpec = new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        hmacSha256.init(secretKeySpec);
        byte[] hash = hmacSha256.doFinal(data.getBytes(StandardCharsets.UTF_8));
        return base64UrlEncode(hash);
    }

    private String base64UrlEncode(byte[] data) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(data);
    }

    private byte[] base64UrlDecode(String str) {
        return Base64.getUrlDecoder().decode(str);
    }
}

package com.example.employeeleave.repository;

import com.example.employeeleave.entity.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserAccountRepository extends JpaRepository<UserAccount, Long> {

    Optional<UserAccount> findByUsername(String username);

    Optional<UserAccount> findByEmail(String email);

    Optional<UserAccount> findByUsernameOrEmail(String username, String email);

    Optional<UserAccount> findByEmployeeId(Long employeeId);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);
}

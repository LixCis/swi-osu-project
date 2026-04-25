package cz.osu.brigadnik.repository;

import cz.osu.brigadnik.entity.Registration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RegistrationRepository extends JpaRepository<Registration, Long> {
    List<Registration> findByWorkerId(Long workerId);
    List<Registration> findByPositionEventId(Long eventId);
    List<Registration> findByPositionId(Long positionId);
}

package cz.osu.brigadnik.repository;

import cz.osu.brigadnik.entity.TimeRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TimeRecordRepository extends JpaRepository<TimeRecord, Long> {
    List<TimeRecord> findByWorkerId(Long workerId);
    List<TimeRecord> findByRegistrationId(Long registrationId);
    Optional<TimeRecord> findByWorkerIdAndRegistrationIdAndClockOutIsNull(Long workerId, Long registrationId);
}

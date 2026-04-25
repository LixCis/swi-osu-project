package cz.osu.brigadnik.repository;

import cz.osu.brigadnik.entity.Break;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BreakRepository extends JpaRepository<Break, Long> {
    List<Break> findByTimeRecordId(Long timeRecordId);
    Optional<Break> findByTimeRecordIdAndEndTimeIsNull(Long timeRecordId);
}

package cz.osu.brigadnik.service;

import cz.osu.brigadnik.entity.Break;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class TimeCalculationServiceTest {

    @Test
    void testTimeCalculationWithBreak() {
        LocalDateTime clockIn = LocalDateTime.of(2024, 1, 15, 8, 0, 0);
        LocalDateTime breakStart = LocalDateTime.of(2024, 1, 15, 12, 0, 0);
        LocalDateTime breakEnd = LocalDateTime.of(2024, 1, 15, 12, 30, 0);
        LocalDateTime clockOut = LocalDateTime.of(2024, 1, 15, 16, 0, 0);

        Break breakRecord = Break.builder()
                .id(1L)
                .startTime(breakStart)
                .endTime(breakEnd)
                .build();

        BigDecimal computedHours = calculateHours(clockIn, clockOut, List.of(breakRecord));

        assertEquals(new BigDecimal("7.50"), computedHours);
    }

    private BigDecimal calculateHours(LocalDateTime clockIn, LocalDateTime clockOut, List<Break> breaks) {
        Duration totalDuration = Duration.between(clockIn, clockOut);
        long totalMinutes = totalDuration.toMinutes();

        long breakMinutes = 0;
        for (Break b : breaks) {
            if (b.getEndTime() != null) {
                breakMinutes += Duration.between(b.getStartTime(), b.getEndTime()).toMinutes();
            }
        }

        long workMinutes = totalMinutes - breakMinutes;
        return BigDecimal.valueOf(workMinutes).divide(BigDecimal.valueOf(60), 2, java.math.RoundingMode.HALF_UP);
    }
}

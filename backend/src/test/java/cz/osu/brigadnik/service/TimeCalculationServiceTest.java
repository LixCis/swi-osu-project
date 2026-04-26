package cz.osu.brigadnik.service;

import cz.osu.brigadnik.entity.Break;
import cz.osu.brigadnik.entity.Event;
import cz.osu.brigadnik.entity.Position;
import cz.osu.brigadnik.entity.Registration;
import cz.osu.brigadnik.entity.TimeRecord;
import cz.osu.brigadnik.entity.User;
import cz.osu.brigadnik.enums.RegistrationStatus;
import cz.osu.brigadnik.enums.Role;
import cz.osu.brigadnik.repository.BreakRepository;
import cz.osu.brigadnik.repository.RegistrationRepository;
import cz.osu.brigadnik.repository.TimeRecordRepository;
import cz.osu.brigadnik.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

class TimeCalculationServiceTest {

    @Mock
    private TimeRecordRepository timeRecordRepository;

    @Mock
    private BreakRepository breakRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private RegistrationRepository registrationRepository;

    @InjectMocks
    private TimeService timeService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void testTimeCalculationWithBreak() {
        LocalDateTime clockIn = LocalDateTime.of(2024, 1, 15, 8, 0, 0);
        LocalDateTime breakStart = LocalDateTime.of(2024, 1, 15, 12, 0, 0);
        LocalDateTime breakEnd = LocalDateTime.of(2024, 1, 15, 12, 30, 0);
        LocalDateTime clockOut = LocalDateTime.of(2024, 1, 15, 16, 0, 0);

        User worker = User.builder()
                .id(1L)
                .email("worker@example.com")
                .firstName("John")
                .lastName("Doe")
                .role(Role.WORKER)
                .build();

        User admin = User.builder()
                .id(2L)
                .email("admin@example.com")
                .firstName("Admin")
                .lastName("User")
                .role(Role.ADMIN)
                .build();

        Event event = Event.builder()
                .id(1L)
                .name("Test Event")
                .startDate(LocalDate.of(2024, 1, 15))
                .endDate(LocalDate.of(2024, 1, 15))
                .createdBy(admin)
                .build();

        Position position = Position.builder()
                .id(1L)
                .name("Test Position")
                .capacity(5)
                .hourlyRate(new BigDecimal("100"))
                .date(LocalDate.of(2024, 1, 15))
                .startTime(LocalTime.of(8, 0))
                .endTime(LocalTime.of(17, 0))
                .event(event)
                .build();

        Registration registration = Registration.builder()
                .id(1L)
                .worker(worker)
                .position(position)
                .status(RegistrationStatus.APPROVED)
                .build();

        TimeRecord timeRecord = TimeRecord.builder()
                .id(1L)
                .worker(worker)
                .registration(registration)
                .clockIn(clockIn)
                .clockOut(clockOut)
                .build();

        Break breakRecord = Break.builder()
                .id(1L)
                .timeRecord(timeRecord)
                .startTime(breakStart)
                .endTime(breakEnd)
                .build();

        when(timeRecordRepository.findById(1L)).thenReturn(java.util.Optional.of(timeRecord));
        when(breakRepository.findByTimeRecordId(1L)).thenReturn(Arrays.asList(breakRecord));

        BigDecimal computedHours = calculateHours(clockIn, clockOut, Arrays.asList(breakRecord));

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
        BigDecimal hours = BigDecimal.valueOf(workMinutes).divide(BigDecimal.valueOf(60), 2, java.math.RoundingMode.HALF_UP);
        return hours;
    }
}

package cz.osu.brigadnik.service;

import cz.osu.brigadnik.entity.Event;
import cz.osu.brigadnik.entity.Position;
import cz.osu.brigadnik.entity.Registration;
import cz.osu.brigadnik.entity.TimeRecord;
import cz.osu.brigadnik.entity.User;
import cz.osu.brigadnik.enums.RegistrationStatus;
import cz.osu.brigadnik.enums.Role;
import cz.osu.brigadnik.repository.BreakRepository;
import cz.osu.brigadnik.repository.TimeRecordRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

class ValidationTest {

    @Mock
    private TimeRecordRepository timeRecordRepository;

    @Mock
    private BreakRepository breakRepository;

    @InjectMocks
    private TimeService timeService;

    private AutoCloseable mocks;

    @BeforeEach
    void setUp() {
        mocks = MockitoAnnotations.openMocks(this);
    }

    @AfterEach
    void tearDown() throws Exception {
        mocks.close();
    }

    @Test
    void testCannotClockOutWithoutClockIn() {
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
                .clockIn(null)
                .clockOut(null)
                .build();

        when(timeRecordRepository.findById(1L)).thenReturn(java.util.Optional.of(timeRecord));

        assertThrows(IllegalArgumentException.class, () -> timeService.clockOut(1L, 1L));
    }

    @Test
    void testCannotStartBreakWithoutClockIn() {
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
                .clockIn(null)
                .clockOut(null)
                .build();

        when(timeRecordRepository.findById(1L)).thenReturn(java.util.Optional.of(timeRecord));
        when(breakRepository.findByTimeRecordIdAndEndTimeIsNull(1L)).thenReturn(java.util.Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> timeService.startBreak(1L, 1L));
    }

    @Test
    void testCannotStartBreakWithOpenBreak() {
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
                .clockIn(LocalDateTime.now())
                .clockOut(null)
                .build();

        var openBreak = new cz.osu.brigadnik.entity.Break();
        openBreak.setId(1L);
        openBreak.setTimeRecord(timeRecord);
        openBreak.setStartTime(LocalDateTime.now());
        openBreak.setEndTime(null);

        when(timeRecordRepository.findById(1L)).thenReturn(java.util.Optional.of(timeRecord));
        when(breakRepository.findByTimeRecordIdAndEndTimeIsNull(1L)).thenReturn(java.util.Optional.of(openBreak));

        assertThrows(IllegalArgumentException.class, () -> timeService.startBreak(1L, 1L));
    }
}

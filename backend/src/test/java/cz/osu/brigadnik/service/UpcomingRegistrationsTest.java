package cz.osu.brigadnik.service;

import cz.osu.brigadnik.dto.RegistrationDto;
import cz.osu.brigadnik.entity.Event;
import cz.osu.brigadnik.entity.Position;
import cz.osu.brigadnik.entity.Registration;
import cz.osu.brigadnik.entity.User;
import cz.osu.brigadnik.enums.RegistrationStatus;
import cz.osu.brigadnik.enums.Role;
import cz.osu.brigadnik.repository.RegistrationRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

class UpcomingRegistrationsTest {

    @Mock private RegistrationRepository registrationRepository;

    @InjectMocks private RegistrationService registrationService;

    private AutoCloseable mocks;

    @BeforeEach
    void setUp() { mocks = MockitoAnnotations.openMocks(this); }

    @AfterEach
    void tearDown() throws Exception { mocks.close(); }

    @Test
    void returnsOnlyApprovedFutureRegistrationsSortedByStart() {
        User worker = User.builder().id(2L).firstName("P").lastName("S").email("p@s").role(Role.WORKER).build();
        User admin = User.builder().id(1L).role(Role.ADMIN).build();
        Event event = Event.builder().id(1L).name("E").createdBy(admin).build();

        LocalDate today = LocalDate.now();
        Position past = Position.builder().id(10L).name("Past").capacity(5).hourlyRate(BigDecimal.TEN)
                .date(today.minusDays(5)).startTime(LocalTime.of(8,0)).endTime(LocalTime.of(16,0)).event(event).build();
        Position futureLater = Position.builder().id(11L).name("Later").capacity(5).hourlyRate(BigDecimal.TEN)
                .date(today.plusDays(10)).startTime(LocalTime.of(8,0)).endTime(LocalTime.of(16,0)).event(event).build();
        Position futureSoon = Position.builder().id(12L).name("Soon").capacity(5).hourlyRate(BigDecimal.TEN)
                .date(today.plusDays(2)).startTime(LocalTime.of(18,0)).endTime(LocalTime.of(23,0)).event(event).build();

        Registration approvedPast = Registration.builder().id(1L).worker(worker).position(past).status(RegistrationStatus.APPROVED).build();
        Registration approvedLater = Registration.builder().id(2L).worker(worker).position(futureLater).status(RegistrationStatus.APPROVED).build();
        Registration approvedSoon = Registration.builder().id(3L).worker(worker).position(futureSoon).status(RegistrationStatus.APPROVED).build();
        Registration pendingFuture = Registration.builder().id(4L).worker(worker).position(futureSoon).status(RegistrationStatus.PENDING).build();

        when(registrationRepository.findByWorkerId(2L))
                .thenReturn(Arrays.asList(approvedPast, approvedLater, approvedSoon, pendingFuture));

        List<RegistrationDto> result = registrationService.getUpcomingForWorker(2L);

        assertEquals(2, result.size());
        assertEquals(3L, result.get(0).getId());
        assertEquals(2L, result.get(1).getId());
    }
}

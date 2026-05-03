package cz.osu.brigadnik.service;

import cz.osu.brigadnik.dto.RegistrationDto;
import cz.osu.brigadnik.entity.Event;
import cz.osu.brigadnik.entity.Position;
import cz.osu.brigadnik.entity.Registration;
import cz.osu.brigadnik.entity.User;
import cz.osu.brigadnik.enums.RegistrationStatus;
import cz.osu.brigadnik.enums.Role;
import cz.osu.brigadnik.exception.BulkCapacityConflictException;
import cz.osu.brigadnik.repository.RegistrationRepository;
import org.springframework.security.access.AccessDeniedException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

class BulkActionsServiceTest {

    @Mock private RegistrationRepository registrationRepository;

    @InjectMocks private RegistrationService registrationService;

    private AutoCloseable mocks;

    private User adminA;
    private User adminB;
    private User worker1;
    private User worker2;
    private Position positionAFull;
    private Position positionAFree;

    @BeforeEach
    void setUp() {
        mocks = MockitoAnnotations.openMocks(this);
        adminA = User.builder().id(1L).role(Role.ADMIN).build();
        adminB = User.builder().id(2L).role(Role.ADMIN).build();
        worker1 = User.builder().id(10L).firstName("W").lastName("1").email("w1@x").role(Role.WORKER).build();
        worker2 = User.builder().id(11L).firstName("W").lastName("2").email("w2@x").role(Role.WORKER).build();

        Event eventA = Event.builder().id(100L).name("EA").createdBy(adminA).build();

        positionAFull = Position.builder().id(200L).name("Full").capacity(1).hourlyRate(BigDecimal.TEN)
                .date(LocalDate.now().plusDays(1)).startTime(LocalTime.of(8, 0)).endTime(LocalTime.of(16, 0))
                .event(eventA).build();
        positionAFree = Position.builder().id(201L).name("Free").capacity(5).hourlyRate(BigDecimal.TEN)
                .date(LocalDate.now().plusDays(1)).startTime(LocalTime.of(8, 0)).endTime(LocalTime.of(16, 0))
                .event(eventA).build();
    }

    @AfterEach
    void tearDown() throws Exception {
        mocks.close();
    }

    @Test
    void bulkApproveRejectsWhenAdminNotOwner() {
        Registration r = Registration.builder().id(500L).worker(worker1).position(positionAFree)
                .status(RegistrationStatus.PENDING).build();
        when(registrationRepository.findAllById(List.of(500L))).thenReturn(List.of(r));

        assertThrows(AccessDeniedException.class, () ->
            registrationService.bulkApprove(List.of(500L), adminB.getId()));
    }

    @Test
    void bulkApproveDetectsCapacityConflictDryRun() {
        Registration approved = Registration.builder().id(501L).worker(worker1).position(positionAFull)
                .status(RegistrationStatus.APPROVED).build();
        Registration pending = Registration.builder().id(502L).worker(worker2).position(positionAFull)
                .status(RegistrationStatus.PENDING).build();

        when(registrationRepository.findAllById(List.of(502L))).thenReturn(List.of(pending));
        when(registrationRepository.findByPositionId(200L)).thenReturn(List.of(approved));

        BulkCapacityConflictException ex = assertThrows(BulkCapacityConflictException.class, () ->
            registrationService.bulkApprove(List.of(502L), adminA.getId()));
        assertEquals(1, ex.getConflicts().size());
        assertEquals(502L, ex.getConflicts().getFirst().getRegistrationId());
    }

    @Test
    void bulkApproveCountsBatchedIncrementsAgainstCapacity() {
        Registration p1 = Registration.builder().id(601L).worker(worker1).position(positionAFull)
                .status(RegistrationStatus.PENDING).build();
        Registration p2 = Registration.builder().id(602L).worker(worker2).position(positionAFull)
                .status(RegistrationStatus.PENDING).build();

        when(registrationRepository.findAllById(List.of(601L, 602L))).thenReturn(List.of(p1, p2));
        when(registrationRepository.findByPositionId(200L)).thenReturn(Collections.emptyList());

        BulkCapacityConflictException ex = assertThrows(BulkCapacityConflictException.class, () ->
            registrationService.bulkApprove(List.of(601L, 602L), adminA.getId()));
        assertEquals(1, ex.getConflicts().size());
    }

    @Test
    void bulkApproveSkipsAlreadyApproved() {
        Registration p1 = Registration.builder().id(701L).worker(worker1).position(positionAFree)
                .status(RegistrationStatus.PENDING).build();
        Registration alreadyOk = Registration.builder().id(702L).worker(worker2).position(positionAFree)
                .status(RegistrationStatus.APPROVED).build();

        when(registrationRepository.findAllById(List.of(701L, 702L))).thenReturn(List.of(p1, alreadyOk));
        when(registrationRepository.findByPositionId(201L)).thenReturn(List.of(alreadyOk));
        when(registrationRepository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));

        List<RegistrationDto> result = registrationService.bulkApprove(List.of(701L, 702L), adminA.getId());
        assertEquals(2, result.size());
        assertEquals(RegistrationStatus.APPROVED, result.get(0).getStatus());
        assertEquals(RegistrationStatus.APPROVED, result.get(1).getStatus());
    }
}

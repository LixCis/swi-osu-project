package cz.osu.brigadnik.service;

import cz.osu.brigadnik.dto.RegistrationDto;
import cz.osu.brigadnik.entity.Event;
import cz.osu.brigadnik.entity.Position;
import cz.osu.brigadnik.entity.Registration;
import cz.osu.brigadnik.entity.User;
import cz.osu.brigadnik.enums.RegistrationStatus;
import cz.osu.brigadnik.enums.Role;
import cz.osu.brigadnik.repository.PositionRepository;
import cz.osu.brigadnik.repository.RegistrationRepository;
import cz.osu.brigadnik.repository.UserRepository;
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
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

class RegistrationServiceTest {

    @Mock
    private RegistrationRepository registrationRepository;

    @Mock
    private PositionRepository positionRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private RegistrationService registrationService;

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
    void testCannotExceedPositionCapacity() {
        User admin = User.builder()
                .id(1L)
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
                .capacity(2)
                .hourlyRate(new BigDecimal("200"))
                .date(LocalDate.of(2024, 1, 15))
                .startTime(LocalTime.of(8, 0))
                .endTime(LocalTime.of(17, 0))
                .event(event)
                .build();

        User worker1 = User.builder()
                .id(2L)
                .email("worker1@example.com")
                .firstName("Worker")
                .lastName("One")
                .role(Role.WORKER)
                .build();

        User worker2 = User.builder()
                .id(3L)
                .email("worker2@example.com")
                .firstName("Worker")
                .lastName("Two")
                .role(Role.WORKER)
                .build();

        Registration reg1 = Registration.builder()
                .id(1L)
                .worker(worker1)
                .position(position)
                .status(RegistrationStatus.APPROVED)
                .build();

        Registration reg2 = Registration.builder()
                .id(2L)
                .worker(worker2)
                .position(position)
                .status(RegistrationStatus.APPROVED)
                .build();

        User worker3 = User.builder()
                .id(4L)
                .email("worker3@example.com")
                .firstName("Worker")
                .lastName("Three")
                .role(Role.WORKER)
                .build();

        Registration reg3 = Registration.builder()
                .id(3L)
                .worker(worker3)
                .position(position)
                .status(RegistrationStatus.PENDING)
                .build();

        when(registrationRepository.findById(3L)).thenReturn(java.util.Optional.of(reg3));
        when(positionRepository.findById(1L)).thenReturn(java.util.Optional.of(position));
        when(registrationRepository.findByPositionId(1L)).thenReturn(Arrays.asList(reg1, reg2));

        assertThrows(IllegalArgumentException.class, () -> registrationService.approveRegistration(3L, admin.getId()));
    }

    @Test
    void testCannotRegisterForPastPosition() {
        User admin = User.builder()
                .id(1L)
                .email("admin@example.com")
                .firstName("Admin")
                .lastName("User")
                .role(Role.ADMIN)
                .build();

        Event event = Event.builder()
                .id(1L)
                .name("Past Event")
                .startDate(LocalDate.of(2000, 1, 1))
                .endDate(LocalDate.of(2000, 1, 1))
                .createdBy(admin)
                .build();

        Position pastPosition = Position.builder()
                .id(10L)
                .name("Past Position")
                .capacity(5)
                .hourlyRate(new BigDecimal("200"))
                .date(LocalDate.of(2000, 1, 1))
                .startTime(LocalTime.of(8, 0))
                .endTime(LocalTime.of(17, 0))
                .event(event)
                .build();

        User worker = User.builder()
                .id(2L)
                .email("worker@example.com")
                .firstName("Worker")
                .lastName("One")
                .role(Role.WORKER)
                .build();

        when(userRepository.findById(worker.getId())).thenReturn(Optional.of(worker));
        when(positionRepository.findById(pastPosition.getId())).thenReturn(Optional.of(pastPosition));

        RegistrationDto dto = RegistrationDto.builder().positionId(pastPosition.getId()).build();

        assertThrows(IllegalArgumentException.class,
                () -> registrationService.createRegistration(dto, worker.getId()));
    }
}

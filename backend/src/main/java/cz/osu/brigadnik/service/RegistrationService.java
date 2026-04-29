package cz.osu.brigadnik.service;

import cz.osu.brigadnik.dto.BulkConflictResponse;
import cz.osu.brigadnik.dto.RegistrationDto;
import cz.osu.brigadnik.entity.Event;
import cz.osu.brigadnik.entity.Position;
import cz.osu.brigadnik.entity.Registration;
import cz.osu.brigadnik.entity.User;
import cz.osu.brigadnik.enums.RegistrationStatus;
import cz.osu.brigadnik.exception.BulkCapacityConflictException;
import cz.osu.brigadnik.exception.ResourceNotFoundException;
import cz.osu.brigadnik.repository.EventRepository;
import cz.osu.brigadnik.repository.BreakRepository;
import cz.osu.brigadnik.repository.PositionRepository;
import cz.osu.brigadnik.repository.RegistrationRepository;
import cz.osu.brigadnik.repository.RegistrationSpecifications;
import cz.osu.brigadnik.repository.TimeRecordRepository;
import cz.osu.brigadnik.repository.UserRepository;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional
public class RegistrationService {

    private final RegistrationRepository registrationRepository;
    private final UserRepository userRepository;
    private final PositionRepository positionRepository;
    private final EventRepository eventRepository;
    private final TimeRecordRepository timeRecordRepository;
    private final BreakRepository breakRepository;

    public RegistrationService(RegistrationRepository registrationRepository,
                               UserRepository userRepository,
                               PositionRepository positionRepository,
                               EventRepository eventRepository,
                               TimeRecordRepository timeRecordRepository,
                               BreakRepository breakRepository) {
        this.registrationRepository = registrationRepository;
        this.userRepository = userRepository;
        this.positionRepository = positionRepository;
        this.eventRepository = eventRepository;
        this.timeRecordRepository = timeRecordRepository;
        this.breakRepository = breakRepository;
    }

    public RegistrationDto createRegistration(RegistrationDto dto, Long workerId) {
        User worker = userRepository.findById(workerId)
                .orElseThrow(() -> new ResourceNotFoundException("Worker not found"));

        Position position = positionRepository.findById(dto.getPositionId())
                .orElseThrow(() -> new ResourceNotFoundException("Position not found"));

        Registration registration = Registration.builder()
                .worker(worker)
                .position(position)
                .status(RegistrationStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .build();

        registration = registrationRepository.save(registration);
        return entityToDto(registration);
    }

    @Transactional(readOnly = true)
    public List<RegistrationDto> getMyRegistrations(Long workerId) {
        return registrationRepository.findByWorkerId(workerId).stream()
                .map(this::entityToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<RegistrationDto> getUpcomingForWorker(Long workerId) {
        LocalDate today = LocalDate.now();
        return registrationRepository.findByWorkerId(workerId).stream()
                .filter(r -> r.getStatus() == RegistrationStatus.APPROVED)
                .filter(r -> !r.getPosition().getDate().isBefore(today))
                .sorted((a, b) -> {
                    LocalDateTime aStart = LocalDateTime.of(a.getPosition().getDate(), a.getPosition().getStartTime());
                    LocalDateTime bStart = LocalDateTime.of(b.getPosition().getDate(), b.getPosition().getStartTime());
                    return aStart.compareTo(bStart);
                })
                .map(this::entityToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<RegistrationDto> getRegistrationsByEventId(Long eventId, Long userId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found"));

        if (!event.getCreatedBy().getId().equals(userId)) {
            throw new IllegalAccessError("Forbidden");
        }

        return registrationRepository.findByPositionEventId(eventId).stream()
                .map(this::entityToDto)
                .collect(Collectors.toList());
    }

    public RegistrationDto approveRegistration(Long registrationId, Long adminId) {
        Registration registration = registrationRepository.findById(registrationId)
                .orElseThrow(() -> new ResourceNotFoundException("Registration not found"));

        verifyAdminOwnership(registration, adminId);
        checkCapacity(registration.getPosition());

        registration.setStatus(RegistrationStatus.APPROVED);
        registration = registrationRepository.save(registration);
        return entityToDto(registration);
    }

    public RegistrationDto rejectRegistration(Long registrationId, Long adminId) {
        Registration registration = registrationRepository.findById(registrationId)
                .orElseThrow(() -> new ResourceNotFoundException("Registration not found"));

        verifyAdminOwnership(registration, adminId);

        registration.setStatus(RegistrationStatus.REJECTED);
        registration = registrationRepository.save(registration);
        return entityToDto(registration);
    }

    public void deleteRegistration(Long registrationId, Long adminId) {
        Registration registration = registrationRepository.findById(registrationId)
                .orElseThrow(() -> new ResourceNotFoundException("Registration not found"));

        verifyAdminOwnership(registration, adminId);

        List<cz.osu.brigadnik.entity.TimeRecord> timeRecords = timeRecordRepository.findByRegistrationId(registrationId);
        for (cz.osu.brigadnik.entity.TimeRecord tr : timeRecords) {
            breakRepository.deleteAll(breakRepository.findByTimeRecordId(tr.getId()));
        }
        timeRecordRepository.deleteAll(timeRecords);
        registrationRepository.deleteById(registrationId);
    }

    public List<RegistrationDto> bulkApprove(List<Long> ids, Long adminId) {
        List<Registration> registrations = registrationRepository.findAllById(ids);
        if (registrations.size() != ids.size()) {
            throw new ResourceNotFoundException("One or more registrations not found");
        }
        for (Registration r : registrations) {
            verifyAdminOwnership(r, adminId);
        }

        Map<Long, Long> capacityIncrement = new HashMap<>();
        List<BulkConflictResponse.Conflict> conflicts = new ArrayList<>();

        for (Registration r : registrations) {
            if (r.getStatus() == RegistrationStatus.APPROVED) continue;
            Long posId = r.getPosition().getId();
            long current = registrationRepository.findByPositionId(posId).stream()
                    .filter(x -> x.getStatus() == RegistrationStatus.APPROVED)
                    .count();
            long planned = current + capacityIncrement.getOrDefault(posId, 0L) + 1;
            if (planned > r.getPosition().getCapacity()) {
                conflicts.add(BulkConflictResponse.Conflict.builder()
                        .registrationId(r.getId())
                        .positionName(r.getPosition().getName())
                        .currentApprovedCount((int) current)
                        .capacity(r.getPosition().getCapacity())
                        .build());
            } else {
                capacityIncrement.merge(posId, 1L, Long::sum);
            }
        }

        if (!conflicts.isEmpty()) {
            throw new BulkCapacityConflictException(conflicts);
        }

        for (Registration r : registrations) {
            if (r.getStatus() != RegistrationStatus.APPROVED) {
                r.setStatus(RegistrationStatus.APPROVED);
            }
        }
        return registrationRepository.saveAll(registrations).stream().map(this::entityToDto).collect(Collectors.toList());
    }

    public List<RegistrationDto> bulkReject(List<Long> ids, Long adminId) {
        List<Registration> registrations = registrationRepository.findAllById(ids);
        if (registrations.size() != ids.size()) {
            throw new ResourceNotFoundException("One or more registrations not found");
        }
        for (Registration r : registrations) {
            verifyAdminOwnership(r, adminId);
            r.setStatus(RegistrationStatus.REJECTED);
        }
        return registrationRepository.saveAll(registrations).stream().map(this::entityToDto).collect(Collectors.toList());
    }

    public void bulkDelete(List<Long> ids, Long adminId) {
        List<Registration> registrations = registrationRepository.findAllById(ids);
        if (registrations.size() != ids.size()) {
            throw new ResourceNotFoundException("One or more registrations not found");
        }
        for (Registration r : registrations) {
            verifyAdminOwnership(r, adminId);
        }
        for (Long id : ids) {
            deleteRegistration(id, adminId);
        }
    }

    @Transactional(readOnly = true)
    public List<RegistrationDto> findMyRegistrations(Long workerId, RegistrationStatus status, Long eventId) {
        Specification<Registration> spec = Specification.where(RegistrationSpecifications.forWorker(workerId))
                .and(RegistrationSpecifications.hasStatus(status))
                .and(RegistrationSpecifications.forEvent(eventId));
        return registrationRepository.findAll(spec).stream().map(this::entityToDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<RegistrationDto> findEventRegistrations(Long eventId, Long userId,
                                                        String search, RegistrationStatus status,
                                                        LocalDate dateFrom, LocalDate dateTo) {
        Event event = eventRepository.findById(eventId).orElseThrow(() -> new ResourceNotFoundException("Event not found"));
        if (!event.getCreatedBy().getId().equals(userId)) throw new IllegalAccessError("Forbidden");
        Specification<Registration> spec = Specification.where(RegistrationSpecifications.forEvent(eventId))
                .and(RegistrationSpecifications.workerNameContains(search))
                .and(RegistrationSpecifications.hasStatus(status))
                .and(RegistrationSpecifications.positionDateFrom(dateFrom))
                .and(RegistrationSpecifications.positionDateTo(dateTo));
        return registrationRepository.findAll(spec).stream().map(this::entityToDto).collect(Collectors.toList());
    }

    private void verifyAdminOwnership(Registration r, Long adminId) {
        Long ownerId = r.getPosition().getEvent().getCreatedBy().getId();
        if (!ownerId.equals(adminId)) {
            throw new IllegalAccessError("Forbidden: not owner of event");
        }
    }

    private void checkCapacity(Position position) {
        List<Registration> approvedRegistrations = registrationRepository.findByPositionId(position.getId())
                .stream()
                .filter(r -> r.getStatus() == RegistrationStatus.APPROVED)
                .collect(Collectors.toList());

        if (approvedRegistrations.size() >= position.getCapacity()) {
            throw new IllegalArgumentException("Position capacity exceeded");
        }
    }

    private RegistrationDto entityToDto(Registration registration) {
        return RegistrationDto.builder()
                .id(registration.getId())
                .positionId(registration.getPosition().getId())
                .workerId(registration.getWorker().getId())
                .workerName(registration.getWorker().getFirstName() + " " + registration.getWorker().getLastName())
                .workerEmail(registration.getWorker().getEmail())
                .positionName(registration.getPosition().getName())
                .eventName(registration.getPosition().getEvent().getName())
                .status(registration.getStatus())
                .createdAt(registration.getCreatedAt())
                .positionDate(registration.getPosition().getDate())
                .positionStartTime(registration.getPosition().getStartTime())
                .positionEndTime(registration.getPosition().getEndTime())
                .build();
    }
}

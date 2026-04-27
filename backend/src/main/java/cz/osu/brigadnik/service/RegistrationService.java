package cz.osu.brigadnik.service;

import cz.osu.brigadnik.dto.RegistrationDto;
import cz.osu.brigadnik.entity.Event;
import cz.osu.brigadnik.entity.Position;
import cz.osu.brigadnik.entity.Registration;
import cz.osu.brigadnik.entity.User;
import cz.osu.brigadnik.enums.RegistrationStatus;
import cz.osu.brigadnik.exception.ResourceNotFoundException;
import cz.osu.brigadnik.repository.EventRepository;
import cz.osu.brigadnik.repository.BreakRepository;
import cz.osu.brigadnik.repository.PositionRepository;
import cz.osu.brigadnik.repository.RegistrationRepository;
import cz.osu.brigadnik.repository.TimeRecordRepository;
import cz.osu.brigadnik.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
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

    public List<RegistrationDto> getMyRegistrations(Long workerId) {
        return registrationRepository.findByWorkerId(workerId).stream()
                .map(this::entityToDto)
                .collect(Collectors.toList());
    }

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

    public RegistrationDto approveRegistration(Long registrationId) {
        Registration registration = registrationRepository.findById(registrationId)
                .orElseThrow(() -> new ResourceNotFoundException("Registration not found"));

        checkCapacity(registration.getPosition());

        registration.setStatus(RegistrationStatus.APPROVED);
        registration = registrationRepository.save(registration);
        return entityToDto(registration);
    }

    public RegistrationDto rejectRegistration(Long registrationId) {
        Registration registration = registrationRepository.findById(registrationId)
                .orElseThrow(() -> new ResourceNotFoundException("Registration not found"));

        registration.setStatus(RegistrationStatus.REJECTED);
        registration = registrationRepository.save(registration);
        return entityToDto(registration);
    }

    public void deleteRegistration(Long registrationId) {
        if (!registrationRepository.existsById(registrationId)) {
            throw new ResourceNotFoundException("Registration not found");
        }
        List<cz.osu.brigadnik.entity.TimeRecord> timeRecords = timeRecordRepository.findByRegistrationId(registrationId);
        for (cz.osu.brigadnik.entity.TimeRecord tr : timeRecords) {
            breakRepository.deleteAll(breakRepository.findByTimeRecordId(tr.getId()));
        }
        timeRecordRepository.deleteAll(timeRecords);
        registrationRepository.deleteById(registrationId);
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

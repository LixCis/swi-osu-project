package cz.osu.brigadnik.service;

import cz.osu.brigadnik.dto.PositionDto;
import cz.osu.brigadnik.entity.Event;
import cz.osu.brigadnik.entity.Position;
import cz.osu.brigadnik.exception.ResourceNotFoundException;
import cz.osu.brigadnik.repository.BreakRepository;
import cz.osu.brigadnik.repository.EventRepository;
import cz.osu.brigadnik.repository.PositionRepository;
import cz.osu.brigadnik.repository.RegistrationRepository;
import cz.osu.brigadnik.repository.TimeRecordRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class PositionService {

    private final PositionRepository positionRepository;
    private final EventRepository eventRepository;
    private final RegistrationRepository registrationRepository;
    private final TimeRecordRepository timeRecordRepository;
    private final BreakRepository breakRepository;

    public PositionService(PositionRepository positionRepository, EventRepository eventRepository,
                          RegistrationRepository registrationRepository,
                          TimeRecordRepository timeRecordRepository,
                          BreakRepository breakRepository) {
        this.positionRepository = positionRepository;
        this.eventRepository = eventRepository;
        this.registrationRepository = registrationRepository;
        this.timeRecordRepository = timeRecordRepository;
        this.breakRepository = breakRepository;
    }

    @Transactional(readOnly = true)
    public List<PositionDto> getPositionsByEventId(Long eventId) {
        return positionRepository.findByEventId(eventId).stream()
                .map(this::entityToDto)
                .collect(Collectors.toList());
    }

    public PositionDto createPosition(Long eventId, PositionDto dto, Long userId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found"));

        if (!event.getCreatedBy().getId().equals(userId)) {
            throw new AccessDeniedException("Forbidden");
        }

        if (dto.getStartTime().isAfter(dto.getEndTime()) || dto.getStartTime().equals(dto.getEndTime())) {
            throw new IllegalArgumentException("Start time must be before end time");
        }

        if (dto.getDate().isBefore(event.getStartDate()) || dto.getDate().isAfter(event.getEndDate())) {
            throw new IllegalArgumentException("Position date must be within event date range");
        }

        Position position = Position.builder()
                .name(dto.getName())
                .capacity(dto.getCapacity())
                .hourlyRate(dto.getHourlyRate())
                .date(dto.getDate())
                .startTime(dto.getStartTime())
                .endTime(dto.getEndTime())
                .event(event)
                .build();

        position = positionRepository.save(position);
        return entityToDto(position);
    }

    public PositionDto updatePosition(Long id, PositionDto dto, Long userId) {
        Position position = positionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Position not found"));

        if (!position.getEvent().getCreatedBy().getId().equals(userId)) {
            throw new AccessDeniedException("Forbidden");
        }

        if (dto.getStartTime().isAfter(dto.getEndTime()) || dto.getStartTime().equals(dto.getEndTime())) {
            throw new IllegalArgumentException("Start time must be before end time");
        }

        Event event = position.getEvent();
        if (dto.getDate().isBefore(event.getStartDate()) || dto.getDate().isAfter(event.getEndDate())) {
            throw new IllegalArgumentException("Position date must be within event date range");
        }

        position.setName(dto.getName());
        position.setCapacity(dto.getCapacity());
        position.setHourlyRate(dto.getHourlyRate());
        position.setDate(dto.getDate());
        position.setStartTime(dto.getStartTime());
        position.setEndTime(dto.getEndTime());

        position = positionRepository.save(position);
        return entityToDto(position);
    }

    public void deletePosition(Long id, Long userId) {
        Position position = positionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Position not found"));

        if (!position.getEvent().getCreatedBy().getId().equals(userId)) {
            throw new AccessDeniedException("Forbidden");
        }

        List<cz.osu.brigadnik.entity.Registration> registrations = registrationRepository.findByPositionId(id);
        for (cz.osu.brigadnik.entity.Registration registration : registrations) {
            deleteRegistrationCascade(registration.getId());
        }
        positionRepository.deleteById(id);
    }

    private void deleteRegistrationCascade(Long registrationId) {
        List<cz.osu.brigadnik.entity.TimeRecord> timeRecords = timeRecordRepository.findByRegistrationId(registrationId);
        for (cz.osu.brigadnik.entity.TimeRecord tr : timeRecords) {
            breakRepository.deleteAll(breakRepository.findByTimeRecordId(tr.getId()));
        }
        timeRecordRepository.deleteAll(timeRecords);
        registrationRepository.deleteById(registrationId);
    }

    private PositionDto entityToDto(Position position) {
        return PositionDto.builder()
                .id(position.getId())
                .name(position.getName())
                .capacity(position.getCapacity())
                .hourlyRate(position.getHourlyRate())
                .date(position.getDate())
                .startTime(position.getStartTime())
                .endTime(position.getEndTime())
                .eventId(position.getEvent().getId())
                .build();
    }
}

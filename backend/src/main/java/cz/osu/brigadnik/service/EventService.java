package cz.osu.brigadnik.service;

import cz.osu.brigadnik.dto.EventDto;
import cz.osu.brigadnik.entity.Event;
import cz.osu.brigadnik.entity.User;
import cz.osu.brigadnik.exception.ResourceNotFoundException;
import cz.osu.brigadnik.repository.EventRepository;
import cz.osu.brigadnik.repository.EventSpecifications;
import cz.osu.brigadnik.repository.PositionRepository;
import cz.osu.brigadnik.repository.RegistrationRepository;
import cz.osu.brigadnik.repository.UserRepository;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@Transactional
public class EventService {

    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final PositionRepository positionRepository;
    private final RegistrationRepository registrationRepository;
    private final RegistrationService registrationService;

    public EventService(EventRepository eventRepository, UserRepository userRepository,
                        PositionRepository positionRepository,
                        RegistrationRepository registrationRepository,
                        RegistrationService registrationService) {
        this.eventRepository = eventRepository;
        this.userRepository = userRepository;
        this.positionRepository = positionRepository;
        this.registrationRepository = registrationRepository;
        this.registrationService = registrationService;
    }

    @Transactional(readOnly = true)
    public EventDto getEventById(Long id) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found"));
        return entityToDto(event);
    }

    public EventDto createEvent(EventDto dto, Long userId) {
        User createdBy = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (dto.getStartDate().isAfter(dto.getEndDate())) {
            throw new IllegalArgumentException("Start date must be before or equal to end date");
        }

        Event event = Event.builder()
                .name(dto.getName())
                .description(dto.getDescription())
                .location(dto.getLocation())
                .startDate(dto.getStartDate())
                .endDate(dto.getEndDate())
                .createdBy(createdBy)
                .build();

        event = eventRepository.save(event);
        return entityToDto(event);
    }

    public EventDto updateEvent(Long id, EventDto dto, Long userId) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found"));

        if (!event.getCreatedBy().getId().equals(userId)) {
            throw new AccessDeniedException("Forbidden");
        }

        if (dto.getStartDate().isAfter(dto.getEndDate())) {
            throw new IllegalArgumentException("Start date must be before or equal to end date");
        }

        event.setName(dto.getName());
        event.setDescription(dto.getDescription());
        event.setLocation(dto.getLocation());
        event.setStartDate(dto.getStartDate());
        event.setEndDate(dto.getEndDate());

        event = eventRepository.save(event);
        return entityToDto(event);
    }

    public void deleteEvent(Long id, Long userId) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found"));

        if (!event.getCreatedBy().getId().equals(userId)) {
            throw new AccessDeniedException("Forbidden");
        }

        List<cz.osu.brigadnik.entity.Position> positions = positionRepository.findByEventId(id);
        for (cz.osu.brigadnik.entity.Position position : positions) {
            List<cz.osu.brigadnik.entity.Registration> registrations = registrationRepository.findByPositionId(position.getId());
            for (cz.osu.brigadnik.entity.Registration registration : registrations) {
                registrationService.cascadeDeleteRegistration(registration.getId());
            }
            positionRepository.deleteById(position.getId());
        }
        eventRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<EventDto> findEvents(String search, LocalDate from, LocalDate to) {
        Specification<Event> spec = Specification.where(EventSpecifications.nameOrLocationContains(search))
                .and(EventSpecifications.startDateFrom(from))
                .and(EventSpecifications.endDateTo(to));
        return eventRepository.findAll(spec).stream().map(this::entityToDto).toList();
    }

    @Transactional(readOnly = true)
    public List<EventDto> findMyEvents(Long userId, String search, LocalDate from, LocalDate to) {
        Specification<Event> spec = Specification.where(EventSpecifications.createdBy(userId))
                .and(EventSpecifications.nameOrLocationContains(search))
                .and(EventSpecifications.startDateFrom(from))
                .and(EventSpecifications.endDateTo(to));
        return eventRepository.findAll(spec).stream().map(this::entityToDto).toList();
    }

    private EventDto entityToDto(Event event) {
        return EventDto.builder()
                .id(event.getId())
                .name(event.getName())
                .description(event.getDescription())
                .location(event.getLocation())
                .startDate(event.getStartDate())
                .endDate(event.getEndDate())
                .createdById(event.getCreatedBy().getId())
                .createdByEmail(event.getCreatedBy().getEmail())
                .build();
    }
}

package cz.osu.brigadnik.service;

import cz.osu.brigadnik.dto.EventDto;
import cz.osu.brigadnik.entity.Event;
import cz.osu.brigadnik.entity.User;
import cz.osu.brigadnik.exception.ResourceNotFoundException;
import cz.osu.brigadnik.repository.EventRepository;
import cz.osu.brigadnik.repository.EventSpecifications;
import cz.osu.brigadnik.repository.UserRepository;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class EventService {

    private final EventRepository eventRepository;
    private final UserRepository userRepository;

    public EventService(EventRepository eventRepository, UserRepository userRepository) {
        this.eventRepository = eventRepository;
        this.userRepository = userRepository;
    }

    public List<EventDto> getAllEvents() {
        return eventRepository.findAll().stream()
                .map(this::entityToDto)
                .collect(Collectors.toList());
    }

    public List<EventDto> getMyEvents(Long userId) {
        return eventRepository.findByCreatedById(userId).stream()
                .map(this::entityToDto)
                .collect(Collectors.toList());
    }

    public EventDto getEventById(Long id) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found"));
        return entityToDto(event);
    }

    public EventDto createEvent(EventDto dto, Long userId) {
        User createdBy = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

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

        event.setName(dto.getName());
        event.setDescription(dto.getDescription());
        event.setLocation(dto.getLocation());
        event.setStartDate(dto.getStartDate());
        event.setEndDate(dto.getEndDate());

        event = eventRepository.save(event);
        return entityToDto(event);
    }

    public void deleteEvent(Long id) {
        if (!eventRepository.existsById(id)) {
            throw new ResourceNotFoundException("Event not found");
        }
        eventRepository.deleteById(id);
    }

    public List<EventDto> findEvents(String search, LocalDate from, LocalDate to) {
        Specification<Event> spec = Specification.where(EventSpecifications.nameOrLocationContains(search))
                .and(EventSpecifications.startDateFrom(from))
                .and(EventSpecifications.endDateTo(to));
        return eventRepository.findAll(spec).stream().map(this::entityToDto).collect(Collectors.toList());
    }

    public List<EventDto> findMyEvents(Long userId, String search, LocalDate from, LocalDate to) {
        Specification<Event> spec = Specification.where(EventSpecifications.createdBy(userId))
                .and(EventSpecifications.nameOrLocationContains(search))
                .and(EventSpecifications.startDateFrom(from))
                .and(EventSpecifications.endDateTo(to));
        return eventRepository.findAll(spec).stream().map(this::entityToDto).collect(Collectors.toList());
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

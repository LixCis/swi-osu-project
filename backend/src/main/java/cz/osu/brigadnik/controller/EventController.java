package cz.osu.brigadnik.controller;

import cz.osu.brigadnik.dto.EventDto;
import cz.osu.brigadnik.service.EventService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/events")
public class EventController {

    private final EventService eventService;

    public EventController(EventService eventService) {
        this.eventService = eventService;
    }

    @GetMapping
    public ResponseEntity<List<EventDto>> getAllEvents(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo) {
        return ResponseEntity.ok(eventService.findEvents(search, dateFrom, dateTo));
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<EventDto>> getMyEvents(
            Authentication auth,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo) {
        Long userId = extractUserIdFromAuth(auth);
        return ResponseEntity.ok(eventService.findMyEvents(userId, search, dateFrom, dateTo));
    }

    @GetMapping("/{id}")
    public ResponseEntity<EventDto> getEventById(@PathVariable Long id) {
        EventDto event = eventService.getEventById(id);
        return ResponseEntity.ok(event);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EventDto> createEvent(@Valid @RequestBody EventDto dto, Authentication auth) {
        Long userId = extractUserIdFromAuth(auth);
        EventDto createdEvent = eventService.createEvent(dto, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdEvent);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EventDto> updateEvent(@PathVariable Long id, @Valid @RequestBody EventDto dto, Authentication auth) {
        Long userId = extractUserIdFromAuth(auth);
        EventDto updatedEvent = eventService.updateEvent(id, dto, userId);
        return ResponseEntity.ok(updatedEvent);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteEvent(@PathVariable Long id, Authentication auth) {
        Long userId = extractUserIdFromAuth(auth);
        eventService.deleteEvent(id, userId);
        return ResponseEntity.noContent().build();
    }

    private Long extractUserIdFromAuth(Authentication auth) {
        Object credentials = auth.getCredentials();
        if (credentials instanceof Long) {
            return (Long) credentials;
        }
        return null;
    }
}

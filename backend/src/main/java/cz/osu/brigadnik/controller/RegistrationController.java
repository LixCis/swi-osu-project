package cz.osu.brigadnik.controller;

import cz.osu.brigadnik.dto.RegistrationDto;
import cz.osu.brigadnik.service.RegistrationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class RegistrationController {

    private final RegistrationService registrationService;

    public RegistrationController(RegistrationService registrationService) {
        this.registrationService = registrationService;
    }

    @PostMapping("/api/registrations")
    public ResponseEntity<RegistrationDto> createRegistration(@Valid @RequestBody RegistrationDto dto) {
        Long workerId = extractUserIdFromContext();
        RegistrationDto createdRegistration = registrationService.createRegistration(dto, workerId);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdRegistration);
    }

    @GetMapping("/api/registrations/my")
    public ResponseEntity<List<RegistrationDto>> getMyRegistrations() {
        Long workerId = extractUserIdFromContext();
        List<RegistrationDto> registrations = registrationService.getMyRegistrations(workerId);
        return ResponseEntity.ok(registrations);
    }

    @GetMapping("/api/registrations/my/upcoming")
    public ResponseEntity<List<RegistrationDto>> getMyUpcomingRegistrations() {
        Long workerId = extractUserIdFromContext();
        List<RegistrationDto> registrations = registrationService.getUpcomingForWorker(workerId);
        return ResponseEntity.ok(registrations);
    }

    @GetMapping("/api/events/{eventId}/registrations")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<RegistrationDto>> getEventRegistrations(@PathVariable Long eventId) {
        Long userId = extractUserIdFromContext();
        List<RegistrationDto> registrations = registrationService.getRegistrationsByEventId(eventId, userId);
        return ResponseEntity.ok(registrations);
    }

    @PutMapping("/api/registrations/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<RegistrationDto> approveRegistration(@PathVariable Long id) {
        RegistrationDto updatedRegistration = registrationService.approveRegistration(id);
        return ResponseEntity.ok(updatedRegistration);
    }

    @PutMapping("/api/registrations/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<RegistrationDto> rejectRegistration(@PathVariable Long id) {
        RegistrationDto updatedRegistration = registrationService.rejectRegistration(id);
        return ResponseEntity.ok(updatedRegistration);
    }

    @DeleteMapping("/api/registrations/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteRegistration(@PathVariable Long id) {
        registrationService.deleteRegistration(id);
        return ResponseEntity.noContent().build();
    }

    private Long extractUserIdFromContext() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Object credentials = auth.getCredentials();
        if (credentials instanceof Long) {
            return (Long) credentials;
        }
        return null;
    }
}

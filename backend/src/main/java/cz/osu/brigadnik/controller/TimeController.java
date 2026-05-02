package cz.osu.brigadnik.controller;

import cz.osu.brigadnik.dto.TimeRecordAdminDto;
import cz.osu.brigadnik.dto.TimeRecordDto;
import cz.osu.brigadnik.service.TimeService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/time")
public class TimeController {

    private final TimeService timeService;

    public TimeController(TimeService timeService) {
        this.timeService = timeService;
    }

    @PostMapping("/clock-in")
    public ResponseEntity<TimeRecordDto> clockIn(@RequestParam Long registrationId) {
        Long workerId = extractUserIdFromContext();
        TimeRecordDto timeRecord = timeService.clockIn(workerId, registrationId);
        return ResponseEntity.status(HttpStatus.CREATED).body(timeRecord);
    }

    @PostMapping("/clock-out")
    public ResponseEntity<TimeRecordDto> clockOut(@RequestParam Long recordId) {
        Long workerId = extractUserIdFromContext();
        TimeRecordDto timeRecord = timeService.clockOut(recordId, workerId);
        return ResponseEntity.ok(timeRecord);
    }

    @PostMapping("/break-start")
    public ResponseEntity<TimeRecordDto> startBreak(@RequestParam Long recordId) {
        Long workerId = extractUserIdFromContext();
        TimeRecordDto timeRecord = timeService.startBreak(recordId, workerId);
        return ResponseEntity.status(HttpStatus.CREATED).body(timeRecord);
    }

    @PostMapping("/break-end")
    public ResponseEntity<TimeRecordDto> endBreak(@RequestParam Long recordId) {
        Long workerId = extractUserIdFromContext();
        TimeRecordDto timeRecord = timeService.endBreak(recordId, workerId);
        return ResponseEntity.ok(timeRecord);
    }

    @GetMapping("/my")
    public ResponseEntity<List<TimeRecordDto>> getMyTimeRecords() {
        Long workerId = extractUserIdFromContext();
        List<TimeRecordDto> timeRecords = timeService.getMyTimeRecords(workerId);
        return ResponseEntity.ok(timeRecords);
    }

    @GetMapping("/event/{eventId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<TimeRecordAdminDto>> getEventTimeRecords(@PathVariable Long eventId) {
        List<TimeRecordAdminDto> timeRecords = timeService.getEventTimeRecords(eventId);
        return ResponseEntity.ok(timeRecords);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<TimeRecordAdminDto> updateTimeRecord(@PathVariable Long id, @Valid @RequestBody TimeRecordDto dto) {
        TimeRecordAdminDto updatedRecord = timeService.updateTimeRecord(id, dto);
        return ResponseEntity.ok(updatedRecord);
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

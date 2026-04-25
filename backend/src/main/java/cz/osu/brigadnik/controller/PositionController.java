package cz.osu.brigadnik.controller;

import cz.osu.brigadnik.dto.PositionDto;
import cz.osu.brigadnik.service.PositionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class PositionController {

    private final PositionService positionService;

    public PositionController(PositionService positionService) {
        this.positionService = positionService;
    }

    @GetMapping("/events/{eventId}/positions")
    public ResponseEntity<List<PositionDto>> getPositionsByEventId(@PathVariable Long eventId) {
        List<PositionDto> positions = positionService.getPositionsByEventId(eventId);
        return ResponseEntity.ok(positions);
    }

    @PostMapping("/events/{eventId}/positions")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PositionDto> createPosition(@PathVariable Long eventId, @Valid @RequestBody PositionDto dto) {
        PositionDto createdPosition = positionService.createPosition(eventId, dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdPosition);
    }

    @PutMapping("/positions/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PositionDto> updatePosition(@PathVariable Long id, @Valid @RequestBody PositionDto dto) {
        PositionDto updatedPosition = positionService.updatePosition(id, dto);
        return ResponseEntity.ok(updatedPosition);
    }

    @DeleteMapping("/positions/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deletePosition(@PathVariable Long id) {
        positionService.deletePosition(id);
        return ResponseEntity.noContent().build();
    }
}

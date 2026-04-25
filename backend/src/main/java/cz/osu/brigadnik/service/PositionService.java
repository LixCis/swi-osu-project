package cz.osu.brigadnik.service;

import cz.osu.brigadnik.dto.PositionDto;
import cz.osu.brigadnik.entity.Event;
import cz.osu.brigadnik.entity.Position;
import cz.osu.brigadnik.exception.ResourceNotFoundException;
import cz.osu.brigadnik.repository.EventRepository;
import cz.osu.brigadnik.repository.PositionRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class PositionService {

    private final PositionRepository positionRepository;
    private final EventRepository eventRepository;

    public PositionService(PositionRepository positionRepository, EventRepository eventRepository) {
        this.positionRepository = positionRepository;
        this.eventRepository = eventRepository;
    }

    public List<PositionDto> getPositionsByEventId(Long eventId) {
        return positionRepository.findByEventId(eventId).stream()
                .map(this::entityToDto)
                .collect(Collectors.toList());
    }

    public PositionDto createPosition(Long eventId, PositionDto dto) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found"));

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

    public PositionDto updatePosition(Long id, PositionDto dto) {
        Position position = positionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Position not found"));

        position.setName(dto.getName());
        position.setCapacity(dto.getCapacity());
        position.setHourlyRate(dto.getHourlyRate());
        position.setDate(dto.getDate());
        position.setStartTime(dto.getStartTime());
        position.setEndTime(dto.getEndTime());

        position = positionRepository.save(position);
        return entityToDto(position);
    }

    public void deletePosition(Long id) {
        if (!positionRepository.existsById(id)) {
            throw new ResourceNotFoundException("Position not found");
        }
        positionRepository.deleteById(id);
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

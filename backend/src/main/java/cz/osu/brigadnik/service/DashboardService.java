package cz.osu.brigadnik.service;

import cz.osu.brigadnik.dto.BreakDto;
import cz.osu.brigadnik.dto.DashboardDto;
import cz.osu.brigadnik.dto.TimeRecordAdminDto;
import cz.osu.brigadnik.entity.Event;
import cz.osu.brigadnik.entity.Registration;
import cz.osu.brigadnik.entity.TimeRecord;
import cz.osu.brigadnik.exception.ResourceNotFoundException;
import cz.osu.brigadnik.repository.BreakRepository;
import cz.osu.brigadnik.repository.EventRepository;
import cz.osu.brigadnik.repository.RegistrationRepository;
import cz.osu.brigadnik.repository.TimeRecordRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    private final EventRepository eventRepository;
    private final TimeRecordRepository timeRecordRepository;
    private final RegistrationRepository registrationRepository;
    private final BreakRepository breakRepository;

    public DashboardService(EventRepository eventRepository,
                            TimeRecordRepository timeRecordRepository,
                            RegistrationRepository registrationRepository,
                            BreakRepository breakRepository) {
        this.eventRepository = eventRepository;
        this.timeRecordRepository = timeRecordRepository;
        this.registrationRepository = registrationRepository;
        this.breakRepository = breakRepository;
    }

    public DashboardDto getEventDashboard(Long eventId, Long userId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found"));

        if (!event.getCreatedBy().getId().equals(userId)) {
            throw new IllegalAccessError("Forbidden");
        }

        List<Registration> registrations = registrationRepository.findByPositionEventId(eventId);
        List<TimeRecord> allTimeRecords = registrations.stream()
                .flatMap(reg -> timeRecordRepository.findByRegistrationId(reg.getId()).stream())
                .toList();

        Set<Long> uniqueWorkers = allTimeRecords.stream()
                .map(tr -> tr.getWorker().getId())
                .collect(Collectors.toSet());

        BigDecimal totalHours = allTimeRecords.stream()
                .map(TimeRecord::getComputedHours)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalCost = calculateTotalCost(allTimeRecords);

        Map<Long, List<TimeRecord>> byWorker = allTimeRecords.stream()
                .collect(Collectors.groupingBy(tr -> tr.getWorker().getId()));

        List<DashboardDto.WorkerSummaryDto> workers = byWorker.entrySet().stream()
                .map(entry -> {
                    List<TimeRecord> workerRecords = entry.getValue();
                    TimeRecord first = workerRecords.get(0);
                    String workerName = first.getWorker().getFirstName() + " " + first.getWorker().getLastName();

                    BigDecimal workerHours = workerRecords.stream()
                            .map(TimeRecord::getComputedHours)
                            .filter(Objects::nonNull)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

                    BigDecimal workerCost = calculateTotalCost(workerRecords);

                    String positions = workerRecords.stream()
                            .map(tr -> tr.getRegistration().getPosition().getName())
                            .distinct()
                            .collect(Collectors.joining(", "));

                    BigDecimal avgRate = BigDecimal.ZERO;
                    if (workerHours.compareTo(BigDecimal.ZERO) > 0) {
                        avgRate = workerCost.divide(workerHours, 2, java.math.RoundingMode.HALF_UP);
                    }

                    List<TimeRecordAdminDto> timeRecordDtos = workerRecords.stream()
                            .map(this::toAdminDto)
                            .collect(Collectors.toList());

                    return DashboardDto.WorkerSummaryDto.builder()
                            .workerId(first.getWorker().getId())
                            .workerName(workerName)
                            .workerEmail(first.getWorker().getEmail())
                            .positionName(positions)
                            .hours(workerHours)
                            .hourlyRate(avgRate)
                            .cost(workerCost)
                            .timeRecords(timeRecordDtos)
                            .build();
                })
                .collect(Collectors.toList());

        return DashboardDto.builder()
                .eventId(event.getId())
                .eventName(event.getName())
                .totalWorkers(uniqueWorkers.size())
                .totalHours(totalHours)
                .totalCost(totalCost)
                .workers(workers)
                .build();
    }

    private BigDecimal calculateTotalCost(List<TimeRecord> timeRecords) {
        BigDecimal totalCost = BigDecimal.ZERO;
        for (TimeRecord timeRecord : timeRecords) {
            if (timeRecord.getComputedHours() == null) {
                continue;
            }
            BigDecimal hourlyRate = timeRecord.getRegistration().getPosition().getHourlyRate();
            BigDecimal amount = timeRecord.getComputedHours().multiply(hourlyRate);
            totalCost = totalCost.add(amount);
        }
        return totalCost;
    }

    private TimeRecordAdminDto toAdminDto(TimeRecord timeRecord) {
        BigDecimal hourlyRate = timeRecord.getRegistration().getPosition().getHourlyRate();
        BigDecimal totalAmount = BigDecimal.ZERO;
        if (timeRecord.getComputedHours() != null) {
            totalAmount = timeRecord.getComputedHours().multiply(hourlyRate);
        }

        String workerName = timeRecord.getWorker().getFirstName() + " " + timeRecord.getWorker().getLastName();

        List<BreakDto> breakDtos = breakRepository.findByTimeRecordId(timeRecord.getId()).stream()
                .map(b -> BreakDto.builder()
                        .id(b.getId())
                        .startTime(b.getStartTime())
                        .endTime(b.getEndTime())
                        .build())
                .collect(Collectors.toList());

        return TimeRecordAdminDto.builder()
                .id(timeRecord.getId())
                .workerId(timeRecord.getWorker().getId())
                .workerName(workerName)
                .workerEmail(timeRecord.getWorker().getEmail())
                .registrationId(timeRecord.getRegistration().getId())
                .positionName(timeRecord.getRegistration().getPosition().getName())
                .eventName(timeRecord.getRegistration().getPosition().getEvent().getName())
                .clockIn(timeRecord.getClockIn())
                .clockOut(timeRecord.getClockOut())
                .computedHours(timeRecord.getComputedHours())
                .hourlyRate(hourlyRate)
                .totalAmount(totalAmount)
                .breaks(breakDtos)
                .build();
    }
}

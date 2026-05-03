package cz.osu.brigadnik.service;

import cz.osu.brigadnik.dto.BreakDto;
import cz.osu.brigadnik.dto.DashboardDto;
import cz.osu.brigadnik.dto.LiveWorkerDto;
import cz.osu.brigadnik.dto.TimeRecordAdminDto;
import cz.osu.brigadnik.entity.Break;
import cz.osu.brigadnik.entity.Event;
import cz.osu.brigadnik.entity.Registration;
import cz.osu.brigadnik.entity.TimeRecord;
import cz.osu.brigadnik.enums.LiveWorkerStatus;
import cz.osu.brigadnik.enums.RegistrationStatus;
import cz.osu.brigadnik.exception.ResourceNotFoundException;
import cz.osu.brigadnik.repository.BreakRepository;
import cz.osu.brigadnik.repository.EventRepository;
import cz.osu.brigadnik.repository.RegistrationRepository;
import cz.osu.brigadnik.repository.TimeRecordRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
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

        long totalWorkers = registrations.stream()
                .filter(r -> r.getStatus() == RegistrationStatus.APPROVED)
                .map(r -> r.getWorker().getId())
                .distinct()
                .count();

        BigDecimal totalHours = allTimeRecords.stream()
                .map(TimeRecord::getComputedHours)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalCost = calculateTotalCost(allTimeRecords);

        Map<Long, List<TimeRecord>> byWorker = allTimeRecords.stream()
                .collect(Collectors.groupingBy(tr -> tr.getWorker().getId()));

        List<DashboardDto.WorkerSummaryDto> workers = byWorker.entrySet().stream()
                .sorted((a, b) -> {
                    LocalDateTime lastA = a.getValue().stream()
                            .map(TimeRecord::getClockIn)
                            .max(LocalDateTime::compareTo).orElse(LocalDateTime.MIN);
                    LocalDateTime lastB = b.getValue().stream()
                            .map(TimeRecord::getClockIn)
                            .max(LocalDateTime::compareTo).orElse(LocalDateTime.MIN);
                    return lastB.compareTo(lastA);
                })
                .map(entry -> {
                    List<TimeRecord> workerRecords = entry.getValue();
                    TimeRecord first = workerRecords.getFirst();
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

                    List<TimeRecordAdminDto> workerTimeRecords = workerRecords.stream()
                            .sorted((a, b) -> b.getClockIn().compareTo(a.getClockIn()))
                            .map(this::toAdminDto)
                            .toList();

                    return DashboardDto.WorkerSummaryDto.builder()
                            .workerId(first.getWorker().getId())
                            .workerName(workerName)
                            .workerEmail(first.getWorker().getEmail())
                            .positionName(positions)
                            .hours(workerHours)
                            .hourlyRate(avgRate)
                            .cost(workerCost)
                            .timeRecords(workerTimeRecords)
                            .build();
                })
                .toList();

        List<LiveWorkerDto> liveWorkers = computeLiveWorkers(eventId);

        return DashboardDto.builder()
                .eventId(event.getId())
                .eventName(event.getName())
                .totalWorkers((int) totalWorkers)
                .totalHours(totalHours)
                .totalCost(totalCost)
                .workers(workers)
                .liveWorkers(liveWorkers)
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

    public List<BreakDto> getBreakDtoList(Long timeRecordId) {
        return breakRepository.findByTimeRecordId(timeRecordId).stream()
                .map(b -> BreakDto.builder()
                        .id(b.getId())
                        .startTime(b.getStartTime())
                        .endTime(b.getEndTime())
                        .build())
                .toList();
    }

    private TimeRecordAdminDto toAdminDto(TimeRecord timeRecord) {
        BigDecimal hourlyRate = timeRecord.getRegistration().getPosition().getHourlyRate();
        BigDecimal totalAmount = BigDecimal.ZERO;
        if (timeRecord.getComputedHours() != null) {
            totalAmount = timeRecord.getComputedHours().multiply(hourlyRate);
        }

        String workerName = timeRecord.getWorker().getFirstName() + " " + timeRecord.getWorker().getLastName();

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
                .breaks(getBreakDtoList(timeRecord.getId()))
                .build();
    }

    public LiveWorkerStatus computeStatus(Registration registration, List<TimeRecord> records, BreakRepository breakRepo) {
        List<TimeRecord> forThisReg = records.stream()
                .filter(t -> t.getRegistration() != null && t.getRegistration().getId().equals(registration.getId()))
                .toList();
        if (forThisReg.isEmpty()) return LiveWorkerStatus.NOT_ARRIVED;

        TimeRecord latest = forThisReg.stream().max(Comparator.comparing(TimeRecord::getClockIn)).orElse(forThisReg.getFirst());
        if (latest.getClockOut() != null) return LiveWorkerStatus.FINISHED;

        List<Break> breaks = breakRepo.findByTimeRecordId(latest.getId());
        boolean hasOpenBreak = breaks.stream().anyMatch(b -> b.getEndTime() == null);
        return hasOpenBreak ? LiveWorkerStatus.ON_BREAK : LiveWorkerStatus.WORKING;
    }

    public List<LiveWorkerDto> computeLiveWorkers(Long eventId) {
        return registrationRepository.findByPositionEventId(eventId).stream()
                .filter(r -> r.getStatus() == RegistrationStatus.APPROVED)
                .map(this::buildLiveWorkerDto)
                .toList();
    }

    public LiveWorkerDto buildLiveWorkerDto(Registration registration) {
        Long eventId = registration.getPosition().getEvent().getId();
        List<TimeRecord> records = timeRecordRepository.findByRegistrationId(registration.getId());
        LiveWorkerStatus status = computeStatus(registration, records, breakRepository);
        LocalDateTime since = computeSince(status, records);
        long completedBreakSeconds = 0;
        BigDecimal workedHours = null;

        long previousSessionSeconds = records.stream()
                .filter(rec -> rec.getClockOut() != null && rec.getComputedHours() != null)
                .mapToLong(rec -> rec.getComputedHours().multiply(BigDecimal.valueOf(3600)).longValue())
                .sum();

        if (!records.isEmpty()) {
            TimeRecord latest = records.stream().max(Comparator.comparing(TimeRecord::getClockIn)).orElse(records.getFirst());
            if (status == LiveWorkerStatus.WORKING || status == LiveWorkerStatus.ON_BREAK) {
                completedBreakSeconds = computeCompletedBreakSeconds(latest);
            } else if (status == LiveWorkerStatus.FINISHED) {
                workedHours = records.stream()
                        .filter(rec -> rec.getClockOut() != null && rec.getComputedHours() != null)
                        .map(TimeRecord::getComputedHours)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
            }
        }

        return LiveWorkerDto.builder()
                .workerId(registration.getWorker().getId())
                .workerName(registration.getWorker().getFirstName() + " " + registration.getWorker().getLastName())
                .positionName(registration.getPosition().getName())
                .status(status)
                .since(since)
                .eventId(eventId)
                .registrationId(registration.getId())
                .completedBreakSeconds(completedBreakSeconds)
                .previousSessionSeconds(previousSessionSeconds)
                .workedHours(workedHours)
                .build();
    }

    public long computeCompletedBreakSeconds(TimeRecord latest) {
        return breakRepository.findByTimeRecordId(latest.getId()).stream()
                .filter(b -> b.getEndTime() != null)
                .mapToLong(b -> Duration.between(b.getStartTime(), b.getEndTime()).toSeconds())
                .sum();
    }

    public LocalDateTime computeSince(LiveWorkerStatus status, List<TimeRecord> records) {
        if (records.isEmpty()) return null;
        TimeRecord latest = records.stream().max(Comparator.comparing(TimeRecord::getClockIn)).orElse(records.getFirst());
        if (status == LiveWorkerStatus.WORKING) return latest.getClockIn();
        if (status == LiveWorkerStatus.FINISHED) return latest.getClockOut();
        if (status == LiveWorkerStatus.ON_BREAK) {
            List<Break> breaks = breakRepository.findByTimeRecordId(latest.getId());
            return breaks.stream()
                    .filter(b -> b.getEndTime() == null)
                    .map(Break::getStartTime)
                    .findFirst().orElse(null);
        }
        return null;
    }
}

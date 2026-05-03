package cz.osu.brigadnik.service;

import cz.osu.brigadnik.dto.LiveWorkerDto;
import cz.osu.brigadnik.dto.TimeRecordAdminDto;
import cz.osu.brigadnik.dto.TimeRecordDto;
import cz.osu.brigadnik.entity.Break;
import cz.osu.brigadnik.entity.Registration;
import cz.osu.brigadnik.entity.TimeRecord;
import cz.osu.brigadnik.entity.User;
import cz.osu.brigadnik.enums.RegistrationStatus;
import cz.osu.brigadnik.exception.ResourceNotFoundException;
import cz.osu.brigadnik.repository.BreakRepository;
import cz.osu.brigadnik.repository.RegistrationRepository;
import cz.osu.brigadnik.repository.TimeRecordRepository;
import cz.osu.brigadnik.repository.UserRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class TimeService {

    private final TimeRecordRepository timeRecordRepository;
    private final BreakRepository breakRepository;
    private final UserRepository userRepository;
    private final RegistrationRepository registrationRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final DashboardService dashboardService;

    public TimeService(TimeRecordRepository timeRecordRepository,
                       BreakRepository breakRepository,
                       UserRepository userRepository,
                       RegistrationRepository registrationRepository,
                       SimpMessagingTemplate messagingTemplate,
                       DashboardService dashboardService) {
        this.timeRecordRepository = timeRecordRepository;
        this.breakRepository = breakRepository;
        this.userRepository = userRepository;
        this.registrationRepository = registrationRepository;
        this.messagingTemplate = messagingTemplate;
        this.dashboardService = dashboardService;
    }

    private void validateTimeWindow(Registration registration) {
        LocalDateTime windowOpen = LocalDateTime.of(
            registration.getPosition().getDate(),
            registration.getPosition().getStartTime()
        ).minusHours(3);

        LocalDateTime windowClose = LocalDateTime.of(
            registration.getPosition().getDate(),
            registration.getPosition().getEndTime()
        ).plusHours(3);

        LocalDateTime now = LocalDateTime.now();

        if (now.isBefore(windowOpen) || now.isAfter(windowClose)) {
            throw new IllegalArgumentException("Clock in/out is outside the allowed time window");
        }
    }

    private void broadcastLive(Registration registration) {
        Long eventId = registration.getPosition().getEvent().getId();
        LiveWorkerDto dto = dashboardService.buildLiveWorkerDto(registration);
        messagingTemplate.convertAndSend("/topic/event/" + eventId + "/live", dto);
    }

    public TimeRecordDto clockIn(Long workerId, Long registrationId) {
        User worker = userRepository.findById(workerId)
                .orElseThrow(() -> new ResourceNotFoundException("Worker not found"));

        Registration registration = registrationRepository.findById(registrationId)
                .orElseThrow(() -> new ResourceNotFoundException("Registration not found"));

        if (!registration.getWorker().getId().equals(workerId)) {
            throw new IllegalArgumentException("Worker does not own this registration");
        }

        if (registration.getStatus() != RegistrationStatus.APPROVED) {
            throw new IllegalArgumentException("Registration is not approved");
        }

        validateTimeWindow(registration);

        if (timeRecordRepository.findByWorkerIdAndRegistrationIdAndClockOutIsNull(workerId, registrationId).isPresent()) {
            throw new IllegalArgumentException("Already clocked in to this registration");
        }

        TimeRecord timeRecord = TimeRecord.builder()
                .worker(worker)
                .registration(registration)
                .clockIn(LocalDateTime.now())
                .build();

        timeRecord = timeRecordRepository.save(timeRecord);
        broadcastLive(registration);
        return entityToDto(timeRecord);
    }

    public TimeRecordDto clockOut(Long recordId, Long workerId) {
        TimeRecord timeRecord = timeRecordRepository.findById(recordId)
                .orElseThrow(() -> new ResourceNotFoundException("Time record not found"));

        if (!timeRecord.getWorker().getId().equals(workerId)) {
            throw new IllegalArgumentException("Not your record");
        }

        if (timeRecord.getClockOut() != null) {
            throw new IllegalArgumentException("Already clocked out");
        }

        if (timeRecord.getClockIn() == null) {
            throw new IllegalArgumentException("Cannot clock out without clock in");
        }

        validateTimeWindow(timeRecord.getRegistration());

        breakRepository.findByTimeRecordIdAndEndTimeIsNull(recordId).ifPresent(b -> {
            b.setEndTime(LocalDateTime.now());
            breakRepository.save(b);
        });

        timeRecord.setClockOut(LocalDateTime.now());
        timeRecord.setComputedHours(calculateHours(timeRecord));

        timeRecord = timeRecordRepository.save(timeRecord);
        broadcastLive(timeRecord.getRegistration());
        return entityToDto(timeRecord);
    }

    public TimeRecordDto startBreak(Long recordId, Long workerId) {
        TimeRecord timeRecord = timeRecordRepository.findById(recordId)
                .orElseThrow(() -> new ResourceNotFoundException("Time record not found"));

        if (!timeRecord.getWorker().getId().equals(workerId)) {
            throw new IllegalArgumentException("Not your record");
        }

        if (timeRecord.getClockIn() == null) {
            throw new IllegalArgumentException("Cannot start break without clock in");
        }

        if (timeRecord.getClockOut() != null) {
            throw new IllegalArgumentException("Cannot start break after clock out");
        }

        boolean hasOpenBreak = breakRepository.findByTimeRecordIdAndEndTimeIsNull(recordId).isPresent();
        if (hasOpenBreak) {
            throw new IllegalArgumentException("Cannot start break with open break");
        }

        Break breakRecord = Break.builder()
                .timeRecord(timeRecord)
                .startTime(LocalDateTime.now())
                .build();

        breakRepository.save(breakRecord);
        broadcastLive(timeRecord.getRegistration());
        return entityToDto(timeRecord);
    }

    public TimeRecordDto endBreak(Long recordId, Long workerId) {
        Break breakRecord = breakRepository.findByTimeRecordIdAndEndTimeIsNull(recordId)
                .orElseThrow(() -> new ResourceNotFoundException("Open break not found"));

        TimeRecord timeRecord = breakRecord.getTimeRecord();
        if (!timeRecord.getWorker().getId().equals(workerId)) {
            throw new IllegalArgumentException("Not your record");
        }

        breakRecord.setEndTime(LocalDateTime.now());
        breakRepository.save(breakRecord);

        broadcastLive(timeRecord.getRegistration());
        return entityToDto(timeRecord);
    }

    @Transactional(readOnly = true)
    public List<TimeRecordDto> getMyTimeRecords(Long workerId) {
        return timeRecordRepository.findByWorkerId(workerId).stream()
                .sorted((a, b) -> b.getClockIn().compareTo(a.getClockIn()))
                .map(this::entityToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TimeRecordAdminDto> getEventTimeRecords(Long eventId) {
        List<Registration> registrations = registrationRepository.findByPositionEventId(eventId);
        return registrations.stream()
                .flatMap(reg -> timeRecordRepository.findByRegistrationId(reg.getId()).stream())
                .map(this::entityToAdminDto)
                .collect(Collectors.toList());
    }

    public TimeRecordAdminDto updateTimeRecord(Long recordId, TimeRecordDto dto) {
        TimeRecord timeRecord = timeRecordRepository.findById(recordId)
                .orElseThrow(() -> new ResourceNotFoundException("Time record not found"));

        if (dto.getClockIn() != null) {
            timeRecord.setClockIn(dto.getClockIn());
        }

        if (dto.getClockOut() != null) {
            timeRecord.setClockOut(dto.getClockOut());
            timeRecord.setComputedHours(calculateHours(timeRecord));
        }

        if (timeRecord.getClockIn() != null && timeRecord.getClockOut() != null
                && timeRecord.getClockOut().isBefore(timeRecord.getClockIn())) {
            throw new IllegalArgumentException("Clock-out cannot be before clock-in");
        }

        timeRecord = timeRecordRepository.save(timeRecord);
        return entityToAdminDto(timeRecord);
    }

    private BigDecimal calculateHours(TimeRecord timeRecord) {
        if (timeRecord.getClockIn() == null || timeRecord.getClockOut() == null) {
            return BigDecimal.ZERO;
        }

        Duration totalDuration = Duration.between(timeRecord.getClockIn(), timeRecord.getClockOut());
        long totalSeconds = totalDuration.toSeconds();

        List<Break> breaks = breakRepository.findByTimeRecordId(timeRecord.getId());
        long breakSeconds = 0;
        for (Break b : breaks) {
            if (b.getEndTime() != null) {
                LocalDateTime bStart = b.getStartTime().isBefore(timeRecord.getClockIn()) ? timeRecord.getClockIn() : b.getStartTime();
                LocalDateTime bEnd = b.getEndTime().isAfter(timeRecord.getClockOut()) ? timeRecord.getClockOut() : b.getEndTime();
                if (bEnd.isAfter(bStart)) {
                    breakSeconds += Duration.between(bStart, bEnd).toSeconds();
                }
            }
        }

        long workSeconds = totalSeconds - breakSeconds;
        return BigDecimal.valueOf(workSeconds).divide(BigDecimal.valueOf(3600), 6, java.math.RoundingMode.HALF_UP);
    }

    private TimeRecordDto entityToDto(TimeRecord timeRecord) {
        boolean onBreak = breakRepository.findByTimeRecordIdAndEndTimeIsNull(timeRecord.getId()).isPresent();
        String workerName = timeRecord.getWorker().getFirstName() + " " + timeRecord.getWorker().getLastName();
        return TimeRecordDto.builder()
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
                .onBreak(onBreak)
                .breaks(dashboardService.getBreakDtoList(timeRecord.getId()))
                .build();
    }

    private TimeRecordAdminDto entityToAdminDto(TimeRecord timeRecord) {
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
                .breaks(dashboardService.getBreakDtoList(timeRecord.getId()))
                .build();
    }

    @Scheduled(fixedRate = 60000)
    public void autoCloseExpiredRecords() {
        List<TimeRecord> openRecords = timeRecordRepository.findByClockOutIsNull();

        for (TimeRecord record : openRecords) {
            Registration registration = record.getRegistration();
            LocalDateTime windowClose = LocalDateTime.of(
                registration.getPosition().getDate(),
                registration.getPosition().getEndTime()
            ).plusHours(3);

            if (LocalDateTime.now().isAfter(windowClose)) {
                breakRepository.findByTimeRecordIdAndEndTimeIsNull(record.getId()).ifPresent(b -> {
                    b.setEndTime(windowClose);
                    breakRepository.save(b);
                });

                record.setClockOut(windowClose);
                record.setComputedHours(calculateHours(record));
                timeRecordRepository.save(record);
                broadcastLive(registration);
            }
        }
    }
}

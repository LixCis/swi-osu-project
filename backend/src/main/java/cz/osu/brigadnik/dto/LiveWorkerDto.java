package cz.osu.brigadnik.dto;

import cz.osu.brigadnik.enums.LiveWorkerStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LiveWorkerDto {
    private Long workerId;
    private String workerName;
    private String positionName;
    private LiveWorkerStatus status;
    private LocalDateTime since;
    private Long eventId;
    private Long registrationId;
}

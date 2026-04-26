package cz.osu.brigadnik.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimeRecordDto {
    private Long id;

    private Long workerId;

    private String workerName;

    private String workerEmail;

    private Long registrationId;

    private String positionName;

    private String eventName;

    private LocalDateTime clockIn;

    private LocalDateTime clockOut;

    private BigDecimal computedHours;

    private boolean onBreak;

    private List<BreakDto> breaks;
}

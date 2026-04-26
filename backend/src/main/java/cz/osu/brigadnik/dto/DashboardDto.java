package cz.osu.brigadnik.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardDto {
    private Long eventId;

    private String eventName;

    private int totalWorkers;

    private BigDecimal totalHours;

    private BigDecimal totalCost;

    private List<WorkerSummaryDto> workers;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class WorkerSummaryDto {
        private Long workerId;

        private String workerName;

        private String workerEmail;

        private String positionName;

        private BigDecimal hours;

        private BigDecimal hourlyRate;

        private BigDecimal cost;

        private List<TimeRecordAdminDto> timeRecords;
    }
}

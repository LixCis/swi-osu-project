package cz.osu.brigadnik.dto;

import cz.osu.brigadnik.enums.RegistrationStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegistrationDto {
    private Long id;

    @NotNull
    private Long positionId;

    private Long workerId;

    private String workerName;

    private String workerEmail;

    private String workerPhone;

    private LocalDate workerDateOfBirth;

    private String positionName;

    private String eventName;

    private RegistrationStatus status;

    private LocalDateTime createdAt;

    private LocalDate positionDate;

    private LocalTime positionStartTime;

    private LocalTime positionEndTime;
}

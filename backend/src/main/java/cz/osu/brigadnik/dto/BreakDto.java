package cz.osu.brigadnik.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BreakDto {
    private Long id;

    private LocalDateTime startTime;

    private LocalDateTime endTime;
}

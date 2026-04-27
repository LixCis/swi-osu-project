package cz.osu.brigadnik.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BulkConflictResponse {

    private List<Conflict> conflicts;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Conflict {
        private Long registrationId;
        private String positionName;
        private int currentApprovedCount;
        private int capacity;
    }
}

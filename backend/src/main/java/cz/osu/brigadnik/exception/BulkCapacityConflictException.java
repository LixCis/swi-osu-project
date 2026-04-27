package cz.osu.brigadnik.exception;

import cz.osu.brigadnik.dto.BulkConflictResponse;
import lombok.Getter;

import java.util.List;

@Getter
public class BulkCapacityConflictException extends RuntimeException {
    private final List<BulkConflictResponse.Conflict> conflicts;

    public BulkCapacityConflictException(List<BulkConflictResponse.Conflict> conflicts) {
        super("Capacity conflict for one or more registrations");
        this.conflicts = conflicts;
    }
}

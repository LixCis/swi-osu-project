package cz.osu.brigadnik.repository;

import cz.osu.brigadnik.entity.Registration;
import cz.osu.brigadnik.enums.RegistrationStatus;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;

public class RegistrationSpecifications {

    public static Specification<Registration> workerNameContains(String search) {
        if (search == null || search.isBlank()) return null;
        String like = "%" + search.toLowerCase() + "%";
        return (root, q, cb) -> {
            var worker = root.get("worker");
            return cb.or(
                    cb.like(cb.lower(worker.get("firstName")), like),
                    cb.like(cb.lower(worker.get("lastName")), like)
            );
        };
    }

    public static Specification<Registration> hasStatus(RegistrationStatus status) {
        if (status == null) return null;
        return (root, q, cb) -> cb.equal(root.get("status"), status);
    }

    public static Specification<Registration> forEvent(Long eventId) {
        if (eventId == null) return null;
        return (root, q, cb) -> cb.equal(root.get("position").get("event").get("id"), eventId);
    }

    public static Specification<Registration> forWorker(Long workerId) {
        if (workerId == null) return null;
        return (root, q, cb) -> cb.equal(root.get("worker").get("id"), workerId);
    }

    public static Specification<Registration> positionDateFrom(LocalDate from) {
        if (from == null) return null;
        return (root, q, cb) -> cb.greaterThanOrEqualTo(root.get("position").get("date"), from);
    }

    public static Specification<Registration> positionDateTo(LocalDate to) {
        if (to == null) return null;
        return (root, q, cb) -> cb.lessThanOrEqualTo(root.get("position").get("date"), to);
    }
}

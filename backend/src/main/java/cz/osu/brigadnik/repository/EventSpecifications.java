package cz.osu.brigadnik.repository;

import cz.osu.brigadnik.entity.Event;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;

public class EventSpecifications {

    public static Specification<Event> nameOrLocationContains(String search) {
        if (search == null || search.isBlank()) return null;
        String like = "%" + search.toLowerCase() + "%";
        return (root, q, cb) -> cb.or(
                cb.like(cb.lower(root.get("name")), like),
                cb.like(cb.lower(root.get("location")), like)
        );
    }

    public static Specification<Event> startDateFrom(LocalDate from) {
        if (from == null) return null;
        return (root, q, cb) -> cb.greaterThanOrEqualTo(root.get("endDate"), from);
    }

    public static Specification<Event> endDateTo(LocalDate to) {
        if (to == null) return null;
        return (root, q, cb) -> cb.lessThanOrEqualTo(root.get("endDate"), to);
    }

    public static Specification<Event> createdBy(Long userId) {
        if (userId == null) return null;
        return (root, q, cb) -> cb.equal(root.get("createdBy").get("id"), userId);
    }
}

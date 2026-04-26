package cz.osu.brigadnik.controller;

import cz.osu.brigadnik.dto.DashboardDto;
import cz.osu.brigadnik.service.DashboardService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/event/{eventId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<DashboardDto> getEventDashboard(@PathVariable Long eventId, Authentication auth) {
        Long userId = extractUserIdFromAuth(auth);
        DashboardDto dashboard = dashboardService.getEventDashboard(eventId, userId);
        return ResponseEntity.ok(dashboard);
    }

    private Long extractUserIdFromAuth(Authentication auth) {
        Object credentials = auth.getCredentials();
        if (credentials instanceof Long) {
            return (Long) credentials;
        }
        return null;
    }
}
